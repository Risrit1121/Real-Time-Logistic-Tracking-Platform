# Logistics Backend API

## Overview
Real-time logistics tracking backend built with Node.js, Express, and Socket.IO. Provides REST API endpoints and WebSocket connections for real-time package tracking and management.

## Architecture

### Core Technologies
- **Express.js**: Web framework for REST API endpoints
- **Socket.IO**: Real-time bidirectional communication
- **CORS**: Cross-origin resource sharing
- **Node.js**: Runtime environment

### Key Components

#### 1. Server Setup (`fixed-server.js`)
```javascript
const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
```

**Why this setup:**
- Express handles HTTP requests/responses
- HTTP server wraps Express for Socket.IO integration
- CORS enables frontend communication from different origins
- Socket.IO enables real-time updates

#### 2. Data Models

##### Package Model
```javascript
{
  id: "unique-identifier",
  name: "Package Name",
  originCity: "Source City",
  destinationCity: "Target City", 
  customer: "Customer Name",
  weight: "Package Weight",
  priority: "Low|Medium|High|Critical",
  status: "Pending|In Transit|Delivered|Cancelled",
  currentLocation: "Current City",
  route: ["City1", "City2", "City3"],
  createdAt: "timestamp",
  estimatedDelivery: "timestamp",
  actualDelivery: "timestamp"
}
```

##### City Model
```javascript
{
  "CityName": {
    lat: latitude,
    lng: longitude,
    country: "Country Name",
    continent: "Continent Name"
  }
}
```

**Why this structure:**
- Normalized city data prevents coordinate inconsistencies
- Route array enables path visualization
- Status tracking enables workflow management
- Priority system enables resource allocation

#### 3. Core Logic Components

##### A. Package Management System
**Purpose**: CRUD operations for package lifecycle management

**Key Functions:**
- `createPackage()`: Validates input, generates unique ID, calculates route
- `updatePackage()`: Modifies package properties with validation
- `deletePackage()`: Removes package and notifies clients
- `getPackages()`: Retrieves filtered package lists

**Route Calculation Logic:**
```javascript
function calculateRoute(origin, destination, cities) {
  // 1. Validate cities exist in database
  // 2. Calculate intermediate stops based on:
  //    - Geographic proximity
  //    - Continental boundaries
  //    - Logical shipping hubs
  // 3. Return optimized path array
}
```

**Why route calculation:**
- Realistic shipping simulation
- Visual path representation on map
- Delivery time estimation
- Cost calculation basis

##### B. Real-time Update System
**Purpose**: Broadcast changes to all connected clients

**Socket Events:**
- `packageCreated`: New package notification
- `packageUpdated`: Status/location changes
- `packageDeleted`: Package removal
- `locationUpdate`: Real-time position tracking
- `clientCount`: Active user monitoring

**Update Logic:**
```javascript
// Broadcast to all clients except sender
socket.broadcast.emit('packageUpdated', packageData);

// Broadcast to all clients including sender
io.emit('packageCreated', packageData);
```

**Why real-time updates:**
- Immediate visibility of changes
- Collaborative environment
- Live tracking simulation
- Enhanced user experience

##### C. City Management System
**Purpose**: Provide geographic reference data

**Features:**
- 100+ pre-loaded world cities
- Coordinate validation
- Continental grouping
- Country classification

**City Selection Logic:**
```javascript
function getAvailableCities() {
  return Object.keys(worldCities).sort();
}

function validateCity(cityName) {
  return worldCities.hasOwnProperty(cityName);
}
```

**Why comprehensive city data:**
- Global logistics simulation
- Accurate map visualization
- Realistic routing scenarios
- Scalable geographic coverage

#### 4. API Endpoints

##### Package Endpoints
```
GET    /api/packages          - Retrieve all packages
POST   /api/packages          - Create new package
PUT    /api/packages/:id      - Update package
DELETE /api/packages/:id      - Delete package
GET    /api/packages/:id      - Get specific package
```

##### Utility Endpoints
```
GET    /api/cities           - Get available cities
GET    /api/stats            - Get system statistics
POST   /api/packages/:id/move - Move package to next location
```

**Endpoint Logic Requirements:**

**POST /api/packages**
```javascript
// Validation Requirements:
- name: required, string, 1-100 chars
- originCity: required, must exist in cities
- destinationCity: required, must exist in cities, != origin
- customer: required, string, 1-50 chars
- weight: required, positive number
- priority: required, enum [Low, Medium, High, Critical]

// Processing Logic:
1. Validate all inputs
2. Generate unique package ID
3. Calculate optimal route
4. Set initial status to "Pending"
5. Calculate estimated delivery
6. Store package data
7. Broadcast creation event
8. Return package object
```

**PUT /api/packages/:id**
```javascript
// Update Logic:
1. Verify package exists
2. Validate changed fields
3. Recalculate route if cities changed
4. Update timestamps
5. Broadcast update event
6. Return updated package
```

#### 5. Socket.IO Event Handlers

##### Connection Management
```javascript
io.on('connection', (socket) => {
  // Client connected
  clientCount++;
  io.emit('clientCount', clientCount);
  
  socket.on('disconnect', () => {
    // Client disconnected
    clientCount--;
    io.emit('clientCount', clientCount);
  });
});
```

##### Package Events
```javascript
socket.on('createPackage', (data) => {
  // 1. Validate package data
  // 2. Create package object
  // 3. Store in memory/database
  // 4. Broadcast to all clients
});

socket.on('updatePackage', (data) => {
  // 1. Find existing package
  // 2. Apply updates
  // 3. Validate changes
  // 4. Broadcast updates
});
```

**Why Socket.IO events:**
- Instant synchronization
- Reduced server polling
- Efficient bandwidth usage
- Real-time collaboration

#### 6. Data Persistence Strategy

**Current Implementation**: In-memory storage
```javascript
let packages = [];
let packageIdCounter = 1;
```

**Why in-memory for demo:**
- Fast read/write operations
- No database setup required
- Suitable for demonstration
- Easy to reset/clear data

**Production Considerations:**
- Replace with database (MongoDB/PostgreSQL)
- Add data validation middleware
- Implement caching layer
- Add backup/recovery mechanisms

#### 7. Error Handling Strategy

**Validation Errors:**
```javascript
if (!data.name || data.name.trim().length === 0) {
  return socket.emit('error', { 
    message: 'Package name is required',
    field: 'name'
  });
}
```

**System Errors:**
```javascript
try {
  // Package operations
} catch (error) {
  console.error('Package operation failed:', error);
  socket.emit('error', { 
    message: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
}
```

**Why comprehensive error handling:**
- User-friendly error messages
- System stability
- Debugging assistance
- Graceful failure recovery

## Installation & Setup

### Prerequisites
- Node.js 16+ 
- npm 8+

### Installation
```bash
cd logistics-backend
npm install
```

### Environment Setup
```bash
# Create .env file
PORT=5001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### Running the Server
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

### Testing API Endpoints
```bash
# Test package creation
curl -X POST http://localhost:5001/api/packages \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Package",
    "originCity": "New York",
    "destinationCity": "Los Angeles", 
    "customer": "John Doe",
    "weight": "5.5",
    "priority": "High"
  }'

# Test package retrieval
curl http://localhost:5001/api/packages

# Test cities endpoint
curl http://localhost:5001/api/cities
```

## Performance Considerations

### Memory Management
- Package cleanup for old deliveries
- Connection pool management
- Event listener cleanup

### Scalability
- Horizontal scaling with Redis adapter
- Load balancing considerations
- Database connection pooling

### Security
- Input validation and sanitization
- Rate limiting implementation
- CORS configuration
- Authentication middleware (future)

## Monitoring & Logging

### Key Metrics
- Active connections count
- Package creation rate
- API response times
- Error rates

### Logging Strategy
```javascript
console.log(`[${new Date().toISOString()}] Package created: ${packageId}`);
console.error(`[${new Date().toISOString()}] Error: ${error.message}`);
```

## Future Enhancements

1. **Database Integration**: Replace in-memory storage
2. **Authentication**: User management and authorization
3. **Rate Limiting**: Prevent API abuse
4. **Caching**: Redis for improved performance
5. **Monitoring**: Health checks and metrics
6. **Testing**: Unit and integration tests
7. **Documentation**: API documentation with Swagger
