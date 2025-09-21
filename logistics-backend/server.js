const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// -------------------------------
// Package Data - Reset on Restart
// -------------------------------
let packages = {
  "PKG009": {
    id: "PKG009",
    status: "In Transit",
    origin: { lat: 17.5983, lng: 78.1233 },
    location: { lat: 17.5983, lng: 78.1233 },
    destination: { lat: 24.9794, lng: 55.0361 }, // Dubai
    progress: 0
  },
  "PKG1121": {
    id: "PKG1121",
    status: "In Transit",
    origin: { lat: 17.5983, lng: 78.1233 },
    location: { lat: 17.5983, lng: 78.1233 },
    destination: { lat: 51.6064, lng: 4.9972 }, // Netherlands
    progress: 0
  }
};

// -------------------------------
// API Endpoints
// -------------------------------

// Get all packages
app.get("/", (req, res) => {
  res.json(Object.values(packages));
});

// Get package by ID
app.get("/track/:id", (req, res) => {
  const pkg = packages[req.params.id];
  if (!pkg) return res.status(404).json({ error: "Package not found" });
  res.json(pkg);
});

// -------------------------------
// Helper: Haversine Distance
// -------------------------------
function haversine(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// -------------------------------
// Move Package Closer to Destination
// -------------------------------
function movePackage(pkg) {
  if (pkg.status === "Delivered") return;

  const { lat, lng } = pkg.location;
  const { lat: destLat, lng: destLng } = pkg.destination;
  const step = 0.05; // Movement increment

  if (Math.abs(destLat - lat) > 0.01) pkg.location.lat += step * Math.sign(destLat - lat);
  if (Math.abs(destLng - lng) > 0.01) pkg.location.lng += step * Math.sign(destLng - lng);

  const totalDist = haversine(pkg.origin.lat, pkg.origin.lng, destLat, destLng);
  const remainingDist = haversine(pkg.location.lat, pkg.location.lng, destLat, destLng);

  pkg.progress = Math.min(100, Math.round(((totalDist - remainingDist) / totalDist) * 100));

  if (remainingDist < 5) {
    pkg.status = "Delivered";
    pkg.location = { ...pkg.destination };
    pkg.progress = 100;
  }
}

// -------------------------------
// Auto-Update Packages Every 3 Seconds
// -------------------------------
setInterval(() => {
  Object.values(packages).forEach(movePackage);
  console.log("📦 Packages updated...");
}, 6000);

// -------------------------------
// Start Server
// -------------------------------
app.listen(5001, () => {
  console.log("✅ Backend running on http://localhost:5001");
});
