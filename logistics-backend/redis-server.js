const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const redis = require("redis");
const { createAdapter } = require("@socket.io/redis-adapter");

const app = express();
const server = http.createServer(app);

// Redis setup
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

const pubClient = redisClient.duplicate();
const subClient = redisClient.duplicate();

// Socket.IO with Redis adapter
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] },
  adapter: createAdapter(pubClient, subClient)
});

app.use(cors());
app.use(express.json());

// In-memory storage (replace with database in production)
let packages = [];
let packageIdCounter = 1;
let clientCount = 0;

// World cities data
const worldCities = {
  "New York": { lat: 40.7128, lng: -74.0060, country: "USA" },
  "Los Angeles": { lat: 34.0522, lng: -118.2437, country: "USA" },
  "London": { lat: 51.5074, lng: -0.1278, country: "UK" },
  "Paris": { lat: 48.8566, lng: 2.3522, country: "France" },
  "Tokyo": { lat: 35.6762, lng: 139.6503, country: "Japan" },
  "Sydney": { lat: -33.8688, lng: 151.2093, country: "Australia" },
  "Mumbai": { lat: 19.0760, lng: 72.8777, country: "India" },
  "Dubai": { lat: 25.2048, lng: 55.2708, country: "UAE" }
};

// Redis cache functions
async function cachePackages() {
  await redisClient.setEx('packages', 300, JSON.stringify(packages));
}

async function getCachedPackages() {
  const cached = await redisClient.get('packages');
  return cached ? JSON.parse(cached) : null;
}

// API Routes
app.get('/api/packages', async (req, res) => {
  try {
    const cached = await getCachedPackages();
    res.json(cached || packages);
  } catch (error) {
    res.json(packages);
  }
});

app.post('/api/packages', async (req, res) => {
  const { name, originCity, destinationCity, customer, weight, priority } = req.body;
  
  if (!name || !originCity || !destinationCity || !customer || !weight) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const newPackage = {
    id: `PKG${packageIdCounter++}`,
    name,
    originCity,
    destinationCity,
    customer,
    weight: parseFloat(weight),
    priority: priority || 'Medium',
    status: 'Pending',
    createdAt: new Date().toISOString(),
    route: calculateRoute(originCity, destinationCity)
  };

  packages.push(newPackage);
  await cachePackages();
  
  io.emit('packageCreated', newPackage);
  res.status(201).json(newPackage);
});

app.put('/api/packages/:id', async (req, res) => {
  const packageIndex = packages.findIndex(p => p.id === req.params.id);
  if (packageIndex === -1) {
    return res.status(404).json({ error: 'Package not found' });
  }

  packages[packageIndex] = { ...packages[packageIndex], ...req.body };
  await cachePackages();
  
  io.emit('packageUpdated', packages[packageIndex]);
  res.json(packages[packageIndex]);
});

app.delete('/api/packages/:id', async (req, res) => {
  const packageIndex = packages.findIndex(p => p.id === req.params.id);
  if (packageIndex === -1) {
    return res.status(404).json({ error: 'Package not found' });
  }

  const deletedPackage = packages.splice(packageIndex, 1)[0];
  await cachePackages();
  
  io.emit('packageDeleted', deletedPackage);
  res.json(deletedPackage);
});

app.get('/api/cities', (req, res) => {
  res.json(worldCities);
});

// Socket.IO events
io.on('connection', (socket) => {
  clientCount++;
  io.emit('clientCount', clientCount);
  socket.emit('citiesData', worldCities);

  socket.on('disconnect', () => {
    clientCount--;
    io.emit('clientCount', clientCount);
  });

  socket.on('createPackage', async (data) => {
    const newPackage = {
      id: `PKG${packageIdCounter++}`,
      ...data,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      route: calculateRoute(data.originCity, data.destinationCity)
    };

    packages.push(newPackage);
    await cachePackages();
    io.emit('packageCreated', newPackage);
  });

  socket.on('updatePackage', async (data) => {
    const packageIndex = packages.findIndex(p => p.id === data.id);
    if (packageIndex !== -1) {
      packages[packageIndex] = { ...packages[packageIndex], ...data };
      await cachePackages();
      io.emit('packageUpdated', packages[packageIndex]);
    }
  });
});

function calculateRoute(origin, destination) {
  const cities = Object.keys(worldCities);
  const route = [origin];
  
  if (origin !== destination) {
    const midCities = cities.filter(city => city !== origin && city !== destination);
    if (midCities.length > 0) {
      route.push(midCities[Math.floor(Math.random() * midCities.length)]);
    }
    route.push(destination);
  }
  
  return route;
}

// Initialize Redis connection
async function startServer() {
  try {
    await redisClient.connect();
    await pubClient.connect();
    await subClient.connect();
    
    console.log('✅ Redis connected');
    
    const PORT = process.env.PORT || 5001;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Redis caching enabled`);
    });
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    // Fallback to regular server without Redis
    const PORT = process.env.PORT || 5001;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} (without Redis)`);
    });
  }
}

startServer();
