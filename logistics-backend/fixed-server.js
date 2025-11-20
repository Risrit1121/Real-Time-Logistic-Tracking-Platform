const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }
});

app.use(cors());
app.use(express.json());

// FIXED WORLD CITIES - GUARANTEED TO WORK
const worldCities = {
  "New York": { lat: 40.7128, lng: -74.0060, country: "USA", continent: "North America" },
  "Los Angeles": { lat: 34.0522, lng: -118.2437, country: "USA", continent: "North America" },
  "Chicago": { lat: 41.8781, lng: -87.6298, country: "USA", continent: "North America" },
  "Miami": { lat: 25.7617, lng: -80.1918, country: "USA", continent: "North America" },
  "San Francisco": { lat: 37.7749, lng: -122.4194, country: "USA", continent: "North America" },
  "Seattle": { lat: 47.6062, lng: -122.3321, country: "USA", continent: "North America" },
  "Boston": { lat: 42.3601, lng: -71.0589, country: "USA", continent: "North America" },
  "Las Vegas": { lat: 36.1699, lng: -115.1398, country: "USA", continent: "North America" },
  "Denver": { lat: 39.7392, lng: -104.9903, country: "USA", continent: "North America" },
  "Atlanta": { lat: 33.7490, lng: -84.3880, country: "USA", continent: "North America" },
  "Toronto": { lat: 43.6532, lng: -79.3832, country: "Canada", continent: "North America" },
  "Vancouver": { lat: 49.2827, lng: -123.1207, country: "Canada", continent: "North America" },
  "Montreal": { lat: 45.5017, lng: -73.5673, country: "Canada", continent: "North America" },
  "Mexico City": { lat: 19.4326, lng: -99.1332, country: "Mexico", continent: "North America" },
  
  "London": { lat: 51.5074, lng: -0.1278, country: "UK", continent: "Europe" },
  "Paris": { lat: 48.8566, lng: 2.3522, country: "France", continent: "Europe" },
  "Berlin": { lat: 52.5200, lng: 13.4050, country: "Germany", continent: "Europe" },
  "Rome": { lat: 41.9028, lng: 12.4964, country: "Italy", continent: "Europe" },
  "Madrid": { lat: 40.4168, lng: -3.7038, country: "Spain", continent: "Europe" },
  "Amsterdam": { lat: 52.3676, lng: 4.9041, country: "Netherlands", continent: "Europe" },
  "Vienna": { lat: 48.2082, lng: 16.3738, country: "Austria", continent: "Europe" },
  "Zurich": { lat: 47.3769, lng: 8.5417, country: "Switzerland", continent: "Europe" },
  "Geneva": { lat: 46.2044, lng: 6.1432, country: "Switzerland", continent: "Europe" },
  "Stockholm": { lat: 59.3293, lng: 18.0686, country: "Sweden", continent: "Europe" },
  "Copenhagen": { lat: 55.6761, lng: 12.5683, country: "Denmark", continent: "Europe" },
  "Oslo": { lat: 59.9139, lng: 10.7522, country: "Norway", continent: "Europe" },
  "Helsinki": { lat: 60.1699, lng: 24.9384, country: "Finland", continent: "Europe" },
  "Warsaw": { lat: 52.2297, lng: 21.0122, country: "Poland", continent: "Europe" },
  "Prague": { lat: 50.0755, lng: 14.4378, country: "Czech Republic", continent: "Europe" },
  "Budapest": { lat: 47.4979, lng: 19.0402, country: "Hungary", continent: "Europe" },
  "Brussels": { lat: 50.8503, lng: 4.3517, country: "Belgium", continent: "Europe" },
  "Dublin": { lat: 53.3498, lng: -6.2603, country: "Ireland", continent: "Europe" },
  "Lisbon": { lat: 38.7223, lng: -9.1393, country: "Portugal", continent: "Europe" },
  "Barcelona": { lat: 41.3851, lng: 2.1734, country: "Spain", continent: "Europe" },
  "Milan": { lat: 45.4642, lng: 9.1900, country: "Italy", continent: "Europe" },
  "Munich": { lat: 48.1351, lng: 11.5820, country: "Germany", continent: "Europe" },
  "Frankfurt": { lat: 50.1109, lng: 8.6821, country: "Germany", continent: "Europe" },
  "Istanbul": { lat: 41.0082, lng: 28.9784, country: "Turkey", continent: "Europe" },
  "Moscow": { lat: 55.7558, lng: 37.6176, country: "Russia", continent: "Europe" },
  
  "Tokyo": { lat: 35.6762, lng: 139.6503, country: "Japan", continent: "Asia" },
  "Seoul": { lat: 37.5665, lng: 126.9780, country: "South Korea", continent: "Asia" },
  "Beijing": { lat: 39.9042, lng: 116.4074, country: "China", continent: "Asia" },
  "Shanghai": { lat: 31.2304, lng: 121.4737, country: "China", continent: "Asia" },
  "Hong Kong": { lat: 22.3193, lng: 114.1694, country: "Hong Kong", continent: "Asia" },
  "Singapore": { lat: 1.3521, lng: 103.8198, country: "Singapore", continent: "Asia" },
  "Mumbai": { lat: 19.0760, lng: 72.8777, country: "India", continent: "Asia" },
  "Delhi": { lat: 28.7041, lng: 77.1025, country: "India", continent: "Asia" },
  "Bangalore": { lat: 12.9716, lng: 77.5946, country: "India", continent: "Asia" },
  "Bangkok": { lat: 13.7563, lng: 100.5018, country: "Thailand", continent: "Asia" },
  "Kuala Lumpur": { lat: 3.1390, lng: 101.6869, country: "Malaysia", continent: "Asia" },
  "Jakarta": { lat: -6.2088, lng: 106.8456, country: "Indonesia", continent: "Asia" },
  "Manila": { lat: 14.5995, lng: 120.9842, country: "Philippines", continent: "Asia" },
  "Taipei": { lat: 25.0330, lng: 121.5654, country: "Taiwan", continent: "Asia" },
  
  "Dubai": { lat: 25.2048, lng: 55.2708, country: "UAE", continent: "Middle East" },
  "Abu Dhabi": { lat: 24.2539, lng: 54.3773, country: "UAE", continent: "Middle East" },
  "Doha": { lat: 25.2854, lng: 51.5310, country: "Qatar", continent: "Middle East" },
  "Riyadh": { lat: 24.7136, lng: 46.6753, country: "Saudi Arabia", continent: "Middle East" },
  "Tel Aviv": { lat: 32.0853, lng: 34.7818, country: "Israel", continent: "Middle East" },
  "Cairo": { lat: 30.0444, lng: 31.2357, country: "Egypt", continent: "Africa" },
  
  "Sydney": { lat: -33.8688, lng: 151.2093, country: "Australia", continent: "Oceania" },
  "Melbourne": { lat: -37.8136, lng: 144.9631, country: "Australia", continent: "Oceania" },
  "Brisbane": { lat: -27.4698, lng: 153.0251, country: "Australia", continent: "Oceania" },
  "Perth": { lat: -31.9505, lng: 115.8605, country: "Australia", continent: "Oceania" },
  "Auckland": { lat: -36.8485, lng: 174.7633, country: "New Zealand", continent: "Oceania" },
  
  "São Paulo": { lat: -23.5505, lng: -46.6333, country: "Brazil", continent: "South America" },
  "Rio de Janeiro": { lat: -22.9068, lng: -43.1729, country: "Brazil", continent: "South America" },
  "Buenos Aires": { lat: -34.6118, lng: -58.3960, country: "Argentina", continent: "South America" },
  "Lima": { lat: -12.0464, lng: -77.0428, country: "Peru", continent: "South America" },
  "Bogotá": { lat: 4.7110, lng: -74.0721, country: "Colombia", continent: "South America" },
  "Santiago": { lat: -33.4489, lng: -70.6693, country: "Chile", continent: "South America" }
};

// RANDOM CUSTOMER NAMES
const customerNames = [
  "John Smith", "Sarah Johnson", "Michael Brown", "Emily Davis", "David Wilson",
  "Jessica Miller", "Christopher Taylor", "Amanda Anderson", "Matthew Thomas", "Ashley Jackson",
  "Daniel White", "Jennifer Harris", "James Martin", "Lisa Thompson", "Robert Garcia",
  "Maria Rodriguez", "William Martinez", "Elizabeth Robinson", "Joseph Clark", "Susan Lewis",
  "Dr. Sarah Johnson", "Prof. Michael Chen", "Ms. Emily Parker", "Mr. David Kumar",
  "Dr. Jennifer Lee", "Prof. Robert Singh", "Ms. Amanda Wilson", "Mr. James Brown"
];

// PACKAGE TYPES
const packageTypes = [
  "Electronics Shipment", "Medical Equipment", "Fashion Items", "Automotive Parts",
  "Books & Documents", "Food Products", "Pharmaceuticals", "Industrial Equipment",
  "Jewelry & Valuables", "Sports Equipment", "Home Appliances", "Art Collection",
  "Chemical Products", "Textiles", "Machinery", "Consumer Goods"
];

// PACKAGE STORAGE
const PACKAGES_FILE = path.join(__dirname, "fixed-packages.json");
let packages = {};
let connectedClients = 0;
let packageCounter = 1;

// UTILITY FUNCTIONS
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generatePhoneNumber() {
  return `+1-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

// PACKAGE CREATION
function createPackage(data) {
  const packageId = `PKG${String(packageCounter).padStart(3, '0')}`;
  packageCounter++;
  
  const origin = { ...worldCities[data.originCity], name: data.originCity };
  const destination = { ...worldCities[data.destinationCity], name: data.destinationCity };
  const distance = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);
  
  // Assign random customer name if not provided
  const customerName = data.customer?.trim() || getRandomElement(customerNames);
  
  const newPackage = {
    id: packageId,
    name: data.name?.trim() || getRandomElement(packageTypes),
    status: "In Transit",
    origin,
    location: { lat: origin.lat, lng: origin.lng },
    destination,
    progress: 0,
    customer: customerName,
    customerPhone: generatePhoneNumber(),
    weight: data.weight?.trim() || `${(Math.random() * 25 + 1).toFixed(1)} kg`,
    priority: data.priority || "Medium",
    distance: Math.round(distance),
    createdAt: new Date().toISOString(),
    lastUpdate: new Date().toISOString(),
    estimatedDelivery: new Date(Date.now() + (distance / 60) * 60 * 60 * 1000).toISOString(),
    trackingHistory: [
      {
        timestamp: new Date().toISOString(),
        event: `Package created and dispatched from ${origin.name} to ${destination.name}`,
        location: origin,
        status: "In Transit",
        details: `Customer: ${customerName}, Weight: ${data.weight || 'Auto-assigned'}, Distance: ${Math.round(distance)} km`
      }
    ]
  };
  
  packages[packageId] = newPackage;
  return newPackage;
}

// CREATE SAMPLE IN TRANSIT PACKAGES
function createSamplePackages() {
  const samples = [
    // In Transit packages
    {
      name: "Premium Electronics Shipment",
      originCity: "Tokyo",
      destinationCity: "New York",
      customer: "John Smith",
      weight: "15.5 kg",
      priority: "High"
    },
    {
      name: "Medical Equipment Delivery",
      originCity: "Berlin",
      destinationCity: "Sydney",
      customer: "Dr. Sarah Johnson",
      weight: "8.2 kg",
      priority: "High"
    },
    {
      name: "Fashion Collection",
      originCity: "Paris",
      destinationCity: "Los Angeles",
      customer: "Emily Davis",
      weight: "12.0 kg",
      priority: "Medium"
    },
    {
      name: "Automotive Parts",
      originCity: "Munich",
      destinationCity: "Shanghai",
      customer: "Michael Brown",
      weight: "25.8 kg",
      priority: "Medium"
    },
    {
      name: "Pharmaceutical Supplies",
      originCity: "Zurich",
      destinationCity: "Mumbai",
      customer: "Dr. Jennifer Lee",
      weight: "5.5 kg",
      priority: "High"
    }
  ];

  // Create In Transit packages
  samples.forEach(pkg => {
    createPackage(pkg);
  });

  // Create Delivered examples
  const deliveredExamples = [
    {
      name: "Luxury Watch Collection",
      originCity: "Geneva",
      destinationCity: "Hong Kong",
      customer: "Amanda Anderson",
      weight: "2.1 kg",
      priority: "High",
      status: "Delivered"
    },
    {
      name: "Art Masterpiece",
      originCity: "London",
      destinationCity: "Dubai",
      customer: "Robert Wilson",
      weight: "18.3 kg",
      priority: "High",
      status: "Delivered"
    }
  ];

  // Create Cancelled examples
  const cancelledExamples = [
    {
      name: "Industrial Machinery",
      originCity: "Chicago",
      destinationCity: "São Paulo",
      customer: "TechCorp Ltd",
      weight: "145.2 kg",
      priority: "Low",
      status: "Cancelled"
    }
  ];

  // Add delivered packages
  deliveredExamples.forEach(pkg => {
    const newPackage = createPackage(pkg);
    newPackage.status = "Delivered";
    newPackage.progress = 100;
    newPackage.location = { ...newPackage.destination };
    newPackage.deliveredAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
    newPackage.trackingHistory.push({
      timestamp: newPackage.deliveredAt,
      event: `Package successfully delivered to ${newPackage.customer} at ${newPackage.destination.name}`,
      location: { ...newPackage.destination },
      status: "Delivered",
      details: `Weight: ${newPackage.weight}, Total distance: ${newPackage.distance} km`
    });
  });

  // Add cancelled packages
  cancelledExamples.forEach(pkg => {
    const newPackage = createPackage(pkg);
    newPackage.status = "Cancelled";
    newPackage.progress = Math.floor(Math.random() * 50); // Partial progress before cancellation
    newPackage.cancelledAt = new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString();
    newPackage.trackingHistory.push({
      timestamp: newPackage.cancelledAt,
      event: `Package cancelled due to customer request`,
      location: { ...newPackage.location },
      status: "Cancelled",
      details: `Cancelled at ${newPackage.progress}% progress. Refund processed.`
    });
  });
  
  savePackages();
  console.log(`✨ Created ${samples.length} In Transit, ${deliveredExamples.length} Delivered, ${cancelledExamples.length} Cancelled packages`);
}

// LOAD/SAVE PACKAGES
function loadPackages() {
  try {
    if (fs.existsSync(PACKAGES_FILE)) {
      const data = fs.readFileSync(PACKAGES_FILE, "utf8");
      packages = JSON.parse(data);
      
      const ids = Object.keys(packages).map(id => parseInt(id.replace('PKG', '')));
      packageCounter = ids.length > 0 ? Math.max(...ids) + 1 : 1;
      
      console.log(`📦 Loaded ${Object.keys(packages).length} packages`);
    } else {
      createSamplePackages();
    }
  } catch (error) {
    console.error("Error loading packages:", error);
    createSamplePackages();
  }
}

function savePackages() {
  try {
    fs.writeFileSync(PACKAGES_FILE, JSON.stringify(packages, null, 2));
  } catch (error) {
    console.error("Error saving packages:", error);
  }
}

// MOVEMENT SYSTEM
function movePackage(pkg) {
  if (pkg.status !== "In Transit") return false;

  const { lat, lng } = pkg.location;
  const { lat: destLat, lng: destLng } = pkg.destination;
  
  const speedKmh = { "High": 80, "Medium": 60, "Low": 40 };
  const currentSpeed = speedKmh[pkg.priority] || 60;
  const speedDegrees = (currentSpeed / 111) / 1200;
  
  let moved = false;
  const tolerance = 0.01;
  
  const latDiff = destLat - lat;
  const lngDiff = destLng - lng;
  const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  
  if (distance > tolerance) {
    const latStep = (latDiff / distance) * speedDegrees;
    const lngStep = (lngDiff / distance) * speedDegrees;
    
    pkg.location.lat += latStep;
    pkg.location.lng += lngStep;
    moved = true;
    pkg.lastUpdate = new Date().toISOString();
  }
  
  const totalDistance = calculateDistance(
    pkg.origin.lat, pkg.origin.lng,
    pkg.destination.lat, pkg.destination.lng
  );
  const remainingDistance = calculateDistance(
    pkg.location.lat, pkg.location.lng,
    pkg.destination.lat, pkg.destination.lng
  );
  
  const newProgress = Math.min(100, Math.max(0, 
    Math.round(((totalDistance - remainingDistance) / totalDistance) * 100)
  ));
  
  if (newProgress !== pkg.progress) {
    pkg.progress = newProgress;
    moved = true;
    
    if (newProgress > 0 && newProgress % 25 === 0 && 
        !pkg.trackingHistory.some(h => h.event.includes(`${newProgress}% complete`))) {
      pkg.trackingHistory.push({
        timestamp: new Date().toISOString(),
        event: `Journey ${newProgress}% complete`,
        location: { ...pkg.location },
        status: pkg.status,
        details: `Customer: ${pkg.customer}, Remaining: ${Math.round(remainingDistance)} km`
      });
    }
  }
  
  if (remainingDistance < 50) {
    pkg.status = "Delivered";
    pkg.location = { ...pkg.destination };
    pkg.progress = 100;
    pkg.deliveredAt = new Date().toISOString();
    
    pkg.trackingHistory.push({
      timestamp: pkg.deliveredAt,
      event: `Package delivered to ${pkg.customer} at ${pkg.destination.name}`,
      location: { ...pkg.destination },
      status: "Delivered",
      details: `Weight: ${pkg.weight}, Total distance: ${pkg.distance} km`
    });
    
    moved = true;
    console.log(`🎉 ${pkg.id} delivered to ${pkg.customer} at ${pkg.destination.name}!`);
  }
  
  return moved;
}

// WEBSOCKET
io.on('connection', (socket) => {
  connectedClients++;
  console.log(`🌟 Client connected! Total: ${connectedClients}`);
  
  socket.emit('packages-update', Object.values(packages));
  socket.emit('client-count', connectedClients);
  
  socket.on('disconnect', () => {
    connectedClients--;
    console.log(`👋 Client disconnected. Total: ${connectedClients}`);
    io.emit('client-count', connectedClients);
  });
});

// API ROUTES
app.get("/api/cities", (req, res) => {
  console.log(`🌍 Cities API called - returning ${Object.keys(worldCities).length} cities`);
  res.json({
    success: true,
    data: worldCities,
    count: Object.keys(worldCities).length,
    continents: [...new Set(Object.values(worldCities).map(city => city.continent))]
  });
});

app.get("/api/packages", (req, res) => {
  const allPackages = Object.values(packages);
  res.json({
    success: true,
    data: allPackages,
    total: allPackages.length,
    timestamp: new Date().toISOString()
  });
});

app.post("/api/packages", (req, res) => {
  try {
    const { name, originCity, destinationCity, customer, weight, priority } = req.body;
    
    console.log('📦 RECEIVED DATA:', JSON.stringify(req.body, null, 2));
    console.log('📦 EXTRACTED FIELDS:', { name, originCity, destinationCity, customer, weight, priority });
    
    // Check what's actually missing
    const missing = [];
    if (!name || !name.trim()) missing.push('name');
    if (!originCity || originCity.trim() === '') missing.push('originCity');
    if (!destinationCity || destinationCity.trim() === '') missing.push('destinationCity');
    
    if (missing.length > 0) {
      console.log('❌ MISSING FIELDS:', missing);
      return res.status(400).json({ 
        success: false, 
        error: `Missing required fields: ${missing.join(', ')}`,
        received: req.body,
        missing: missing
      });
    }
    
    // Check if cities exist
    if (!worldCities[originCity]) {
      console.log('❌ INVALID ORIGIN:', originCity, 'Available:', Object.keys(worldCities).slice(0, 5));
      return res.status(400).json({ success: false, error: `Invalid origin city: ${originCity}` });
    }
    if (!worldCities[destinationCity]) {
      console.log('❌ INVALID DESTINATION:', destinationCity, 'Available:', Object.keys(worldCities).slice(0, 5));
      return res.status(400).json({ success: false, error: `Invalid destination city: ${destinationCity}` });
    }
    if (originCity === destinationCity) {
      return res.status(400).json({ success: false, error: "Origin and destination must be different" });
    }
    
    const newPackage = createPackage({
      name: name.trim(),
      originCity,
      destinationCity,
      customer: customer?.trim(),
      weight: weight?.trim(),
      priority: priority || "Medium"
    });
    
    savePackages();
    io.emit('packages-update', Object.values(packages));
    io.emit('package-created', newPackage);
    
    console.log(`✅ Package created: ${newPackage.id} - ${newPackage.name} (${newPackage.customer})`);
    
    res.status(201).json({
      success: true,
      data: newPackage,
      message: `Package ${newPackage.id} created successfully!`
    });
    
  } catch (error) {
    console.error("Package creation error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

// Cancel package endpoint
app.put("/api/packages/:id/cancel", (req, res) => {
  try {
    const pkg = packages[req.params.id];
    
    if (!pkg) {
      return res.status(404).json({ success: false, error: "Package not found" });
    }
    
    if (pkg.status === "Delivered") {
      return res.status(400).json({ success: false, error: "Cannot cancel delivered package" });
    }
    
    if (pkg.status === "Cancelled") {
      return res.status(400).json({ success: false, error: "Package already cancelled" });
    }
    
    const oldStatus = pkg.status;
    pkg.status = "Cancelled";
    pkg.cancelledAt = new Date().toISOString();
    
    pkg.trackingHistory.push({
      timestamp: pkg.cancelledAt,
      event: `Package cancelled by user at ${pkg.progress}% progress`,
      location: { ...pkg.location },
      status: "Cancelled",
      details: `Previous status: ${oldStatus}. Refund will be processed.`
    });
    
    savePackages();
    io.emit('packages-update', Object.values(packages));
    
    console.log(`❌ ${pkg.id} cancelled by user (was ${oldStatus})`);
    
    res.json({
      success: true,
      data: pkg,
      message: `Package ${pkg.id} cancelled successfully`
    });
    
  } catch (error) {
    console.error("Package cancellation error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

app.get("/api/stats", (req, res) => {
  const allPackages = Object.values(packages);
  
  const stats = {
    total: allPackages.length,
    byStatus: {
      inTransit: allPackages.filter(p => p.status === "In Transit").length,
      delivered: allPackages.filter(p => p.status === "Delivered").length,
      cancelled: allPackages.filter(p => p.status === "Cancelled").length
    },
    byPriority: {
      high: allPackages.filter(p => p.priority === "High").length,
      medium: allPackages.filter(p => p.priority === "Medium").length,
      low: allPackages.filter(p => p.priority === "Low").length
    },
    averageProgress: allPackages.length > 0 ? 
      Math.round(allPackages.reduce((sum, pkg) => sum + pkg.progress, 0) / allPackages.length) : 0,
    totalCities: Object.keys(worldCities).length,
    connectedClients
  };
  
  res.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString()
  });
});

// MOVEMENT UPDATES
setInterval(() => {
  let updated = false;
  const activePackages = [];
  
  Object.values(packages).forEach(pkg => {
    if (movePackage(pkg)) {
      updated = true;
      if (pkg.status === "In Transit") {
        activePackages.push(`${pkg.id}:${pkg.progress}% (${pkg.customer})`);
      }
    }
  });
  
  if (updated) {
    savePackages();
    io.emit('packages-update', Object.values(packages));
    
    if (activePackages.length > 0) {
      console.log(`📡 Live update: ${activePackages.join(', ')}`);
    }
  }
}, 3000);

// INITIALIZE
loadPackages();

// START SERVER
server.listen(5001, () => {
  console.log(`🚀 FIXED LOGISTICS SERVER RUNNING ON http://localhost:5001`);
  console.log(`📦 Managing ${Object.keys(packages).length} packages`);
  console.log(`🌍 ${Object.keys(worldCities).length} cities available`);
  console.log(`⚡ Live updates every 3 seconds`);
  console.log(`👥 ${connectedClients} clients connected`);
});
