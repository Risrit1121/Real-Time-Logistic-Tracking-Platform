import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import io from 'socket.io-client';
import './UltimateApp.css';

// Fix leaflet markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const socket = io('http://localhost:5001');

function UltimateApp() {
  const [packages, setPackages] = useState([]);
  const [cities, setCities] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [clientCount, setClientCount] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState({});
  const [suggestions, setSuggestions] = useState({});
  const [notifications, setNotifications] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    originCity: '',
    destinationCity: '',
    customer: '',
    weight: '',
    priority: 'Medium'
  });

  // Add notification
  const addNotification = useCallback((message, type = 'info') => {
    const id = Date.now();
    const notification = { id, message, type, timestamp: new Date() };
    setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep only 5 notifications
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    // Load cities first - this is critical
    const loadCities = async () => {
      try {
        console.log('🌍 Loading cities from backend...');
        const response = await fetch('http://localhost:5001/api/cities');
        const data = await response.json();
        
        if (data.success && data.data) {
          setCities(data.data);
          console.log(`✅ Loaded ${Object.keys(data.data).length} cities:`, Object.keys(data.data).slice(0, 5));
        } else {
          console.error('❌ Failed to load cities:', data);
          addNotification('Failed to load cities from server', 'error');
        }
      } catch (error) {
        console.error('❌ Cities loading error:', error);
        addNotification('Cannot connect to server for cities', 'error');
      }
    };

    // Load other data
    const loadOtherData = async () => {
      try {
        const [statsData, suggestionsData] = await Promise.all([
          fetch('http://localhost:5001/api/stats').then(res => res.json()),
          fetch('http://localhost:5001/api/suggestions').then(res => res.json()).catch(() => ({ success: false }))
        ]);
        
        if (statsData.success) {
          setStats(statsData.data);
        }
        if (suggestionsData.success) {
          setSuggestions(suggestionsData.data);
        }
      } catch (error) {
        console.error('❌ Other data loading error:', error);
      }
    };

    // Load cities first, then other data
    loadCities();
    loadOtherData();

    // WebSocket events
    socket.on('connect', () => {
      setIsConnected(true);
      addNotification('🔌 Connected to server', 'success');
      console.log('🔌 Connected to ultimate server');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      addNotification('🔌 Disconnected from server', 'warning');
      console.log('🔌 Disconnected');
    });

    socket.on('packages-update', (updatedPackages) => {
      setPackages(updatedPackages);
      console.log(`📦 ${updatedPackages.length} packages updated`);
    });

    socket.on('package-created', (newPackage) => {
      addNotification(`📦 New package created: ${newPackage.id}`, 'success');
    });

    socket.on('client-count', (count) => {
      setClientCount(count);
    });

    socket.on('cities-update', (citiesData) => {
      setCities(citiesData);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('packages-update');
      socket.off('package-created');
      socket.off('client-count');
      socket.off('cities-update');
    };
  }, [addNotification]);

  // Refresh stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('http://localhost:5001/api/stats')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setStats(data.data);
          }
        })
        .catch(err => console.error('Stats refresh failed:', err));
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const createPackage = async () => {
    console.log('🚀 CREATING PACKAGE WITH DATA:', formData);
    console.log('🔍 FORM DATA DETAILS:');
    console.log('  - name:', `"${formData.name}" (length: ${formData.name.length})`);
    console.log('  - originCity:', `"${formData.originCity}"`);
    console.log('  - destinationCity:', `"${formData.destinationCity}"`);
    console.log('  - customer:', `"${formData.customer}"`);
    console.log('  - weight:', `"${formData.weight}"`);
    console.log('  - priority:', `"${formData.priority}"`);
    
    // Enhanced validation with detailed logging
    if (!formData.name || !formData.name.trim()) {
      console.log('❌ VALIDATION FAILED: Package name is empty');
      addNotification('❌ Please enter a package name', 'error');
      return;
    }
    if (!formData.originCity || formData.originCity.trim() === '') {
      console.log('❌ VALIDATION FAILED: Origin city is empty');
      addNotification('❌ Please select an origin city', 'error');
      return;
    }
    if (!formData.destinationCity || formData.destinationCity.trim() === '') {
      console.log('❌ VALIDATION FAILED: Destination city is empty');
      addNotification('❌ Please select a destination city', 'error');
      return;
    }
    if (formData.originCity === formData.destinationCity) {
      console.log('❌ VALIDATION FAILED: Same origin and destination');
      addNotification('❌ Origin and destination must be different', 'error');
      return;
    }

    console.log('✅ FRONTEND VALIDATION PASSED');
    setIsCreating(true);

    try {
      console.log('📡 SENDING TO BACKEND:', JSON.stringify(formData, null, 2));
      
      const response = await fetch('http://localhost:5001/api/packages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      console.log('📡 RESPONSE STATUS:', response.status);
      const result = await response.json();
      console.log('📡 RESPONSE DATA:', result);

      if (response.ok && result.success) {
        // Reset form
        setFormData({
          name: '', originCity: '', destinationCity: '', 
          customer: '', weight: '', priority: 'Medium'
        });
        setShowCreateForm(false);
        addNotification(`🎉 Package ${result.data.id} created successfully!`, 'success');
      } else {
        console.error('❌ SERVER ERROR:', result);
        addNotification(`❌ Error: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('💥 NETWORK ERROR:', error);
      addNotification('❌ Network error. Please check connection.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      'In Transit': { 
        color: '#3b82f6', 
        icon: '🚛', 
        gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        bgColor: '#eff6ff'
      },
      'Delivered': { 
        color: '#10b981', 
        icon: '✅', 
        gradient: 'linear-gradient(135deg, #10b981, #059669)',
        bgColor: '#ecfdf5'
      },
      'Cancelled': { 
        color: '#ef4444', 
        icon: '❌', 
        gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
        bgColor: '#fef2f2'
      }
    };
    return configs[status] || configs['In Transit'];
  };

  const getPriorityConfig = (priority) => {
    const configs = {
      'High': { color: '#ef4444', icon: '🔴', label: 'High Priority' },
      'Medium': { color: '#f59e0b', icon: '🟡', label: 'Medium Priority' },
      'Low': { color: '#10b981', icon: '🟢', label: 'Low Priority' }
    };
    return configs[priority] || configs['Medium'];
  };

  const filteredPackages = packages.filter(pkg => {
    const matchesSearch = pkg.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pkg.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (pkg.name && pkg.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         pkg.origin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pkg.destination.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || pkg.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || pkg.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Filter packages based on selection mode
  let displayPackages = filteredPackages;
  if (showOnlySelected && selectedPackage) {
    displayPackages = filteredPackages.filter(pkg => pkg.id === selectedPackage.id);
  }

  const handlePackageClick = (pkg) => {
    if (selectedPackage?.id === pkg.id) {
      // If clicking the same package, toggle isolation mode
      setShowOnlySelected(!showOnlySelected);
    } else {
      // Select new package and show all
      setSelectedPackage(pkg);
      setShowOnlySelected(false);
    }
  };

  const cancelPackage = async (packageId, event) => {
    event.stopPropagation(); // Prevent package selection
    
    if (!window.confirm('Are you sure you want to cancel this package?')) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:5001/api/packages/${packageId}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        addNotification(`📦 Package ${packageId} cancelled successfully`, 'success');
      } else {
        addNotification(`❌ Error: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Cancel error:', error);
      addNotification('❌ Failed to cancel package', 'error');
    }
  };

  // Fallback cities if backend fails
  const fallbackCities = {
    "New York": { country: "USA", continent: "North America" },
    "Los Angeles": { country: "USA", continent: "North America" },
    "Chicago": { country: "USA", continent: "North America" },
    "London": { country: "UK", continent: "Europe" },
    "Paris": { country: "France", continent: "Europe" },
    "Berlin": { country: "Germany", continent: "Europe" },
    "Tokyo": { country: "Japan", continent: "Asia" },
    "Seoul": { country: "South Korea", continent: "Asia" },
    "Beijing": { country: "China", continent: "Asia" },
    "Dubai": { country: "UAE", continent: "Middle East" },
    "Sydney": { country: "Australia", continent: "Oceania" },
    "São Paulo": { country: "Brazil", continent: "South America" }
  };

  // Use cities from backend or fallback
  const availableCities = Object.keys(cities).length > 0 ? cities : fallbackCities;
  
  const citiesByContinent = Object.entries(availableCities).reduce((acc, [name, data]) => {
    const continent = data.continent || 'Other';
    if (!acc[continent]) acc[continent] = [];
    acc[continent].push(name);
    return acc;
  }, {});

  return (
    <div className="app">
      {/* Notifications */}
      <div className="notifications">
        {notifications.map(notification => (
          <div 
            key={notification.id} 
            className={`notification notification-${notification.type}`}
          >
            <span>{notification.message}</span>
            <button 
              onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
              className="notification-close"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <header className="header">
        <div className="header-content">
          <div className="brand">
            <div className="logo">🚚</div>
            <div>
              <h1>LogiTrack Ultimate</h1>
              <p>World's Most Advanced Real-Time Logistics Platform</p>
            </div>
          </div>
          
          <div className="header-stats">
            <div className="stat-card" onClick={() => setShowStats(!showStats)}>
              <span className="stat-number">{stats.total || 0}</span>
              <span className="stat-label">Total Packages</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{stats.byStatus?.inTransit || 0}</span>
              <span className="stat-label">In Transit</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{stats.byStatus?.delivered || 0}</span>
              <span className="stat-label">Delivered</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{Object.keys(availableCities).length}</span>
              <span className="stat-label">Cities</span>
            </div>
          </div>

          <div className="connection-status">
            <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              <div className="pulse"></div>
            </div>
            <span>{isConnected ? `🔥 LIVE (${clientCount})` : '💀 Offline'}</span>
          </div>
        </div>
      </header>

      {/* Detailed Stats Modal */}
      {showStats && (
        <div className="modal-overlay" onClick={() => setShowStats(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📊 Detailed Statistics</h2>
              <button onClick={() => setShowStats(false)}>×</button>
            </div>
            <div className="stats-grid">
              <div className="stats-section">
                <h3>📦 Package Status</h3>
                <div className="stats-items">
                  <div className="stats-item">
                    <span>🚛 In Transit:</span>
                    <span>{stats.byStatus?.inTransit || 0}</span>
                  </div>
                  <div className="stats-item">
                    <span>✅ Delivered:</span>
                    <span>{stats.byStatus?.delivered || 0}</span>
                  </div>
                  <div className="stats-item">
                    <span>❌ Cancelled:</span>
                    <span>{stats.byStatus?.cancelled || 0}</span>
                  </div>
                </div>
              </div>
              
              <div className="stats-section">
                <h3>🚨 Priority Levels</h3>
                <div className="stats-items">
                  <div className="stats-item">
                    <span>🔴 High:</span>
                    <span>{stats.byPriority?.high || 0}</span>
                  </div>
                  <div className="stats-item">
                    <span>🟡 Medium:</span>
                    <span>{stats.byPriority?.medium || 0}</span>
                  </div>
                  <div className="stats-item">
                    <span>🟢 Low:</span>
                    <span>{stats.byPriority?.low || 0}</span>
                  </div>
                </div>
              </div>
              
              <div className="stats-section">
                <h3>🌍 Global Coverage</h3>
                <div className="stats-items">
                  <div className="stats-item">
                    <span>🏙️ Total Cities:</span>
                    <span>{stats.totalCities || 0}</span>
                  </div>
                  <div className="stats-item">
                    <span>📡 Connected Clients:</span>
                    <span>{stats.connectedClients || 0}</span>
                  </div>
                  <div className="stats-item">
                    <span>📈 Average Progress:</span>
                    <span>{stats.averageProgress || 0}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="main-content">
        <div className="sidebar">
          <div className="sidebar-header">
            <h2>📦 Ultimate Control Center</h2>
            <button 
              className="create-btn"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              ✨ Create Package
            </button>
          </div>

          <div className="sidebar-content">

          {showCreateForm && (
            <div className="create-form">
              <div className="form-header">
                <h3>🚀 Create New Package</h3>
                <p>✅ {Object.keys(availableCities).length} cities available worldwide</p>
              </div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label>📦 Package Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Premium Electronics Shipment"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="form-input"
                    list="package-types"
                  />
                  <datalist id="package-types">
                    {suggestions.packageTypes?.map(type => (
                      <option key={type} value={type} />
                    ))}
                  </datalist>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>📍 Origin City *</label>
                    <select
                      value={formData.originCity}
                      onChange={(e) => setFormData({...formData, originCity: e.target.value})}
                      className="form-select"
                    >
                      <option value="">🌍 Select Origin City</option>
                      {Object.keys(availableCities).sort().map(city => (
                        <option key={city} value={city}>
                          {city} ({availableCities[city]?.country || 'Unknown'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>🎯 Destination City *</label>
                    <select
                      value={formData.destinationCity}
                      onChange={(e) => setFormData({...formData, destinationCity: e.target.value})}
                      className="form-select"
                    >
                      <option value="">🎯 Select Destination City</option>
                      {Object.keys(availableCities).sort().map(city => (
                        <option key={city} value={city}>
                          {city} ({availableCities[city]?.country || 'Unknown'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>👤 Customer Name</label>
                    <input
                      type="text"
                      placeholder="e.g., TechCorp International"
                      value={formData.customer}
                      onChange={(e) => setFormData({...formData, customer: e.target.value})}
                      className="form-input"
                      list="companies"
                    />
                    <datalist id="companies">
                      {suggestions.companies?.map(company => (
                        <option key={company} value={company} />
                      ))}
                    </datalist>
                  </div>

                  <div className="form-group">
                    <label>⚖️ Weight</label>
                    <input
                      type="text"
                      placeholder="e.g., 15.5 kg"
                      value={formData.weight}
                      onChange={(e) => setFormData({...formData, weight: e.target.value})}
                      className="form-input"
                      list="weights"
                    />
                    <datalist id="weights">
                      {suggestions.weights?.map(weight => (
                        <option key={weight} value={weight} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="form-group">
                  <label>🚨 Priority Level</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="form-select"
                  >
                    <option value="Low">🟢 Low Priority</option>
                    <option value="Medium">🟡 Medium Priority</option>
                    <option value="High">🔴 High Priority</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button 
                  onClick={createPackage} 
                  className="btn-primary"
                  disabled={isCreating}
                >
                  {isCreating ? '⏳ Creating...' : '🚀 Create Package'}
                </button>
                <button 
                  onClick={() => setShowCreateForm(false)} 
                  className="btn-secondary"
                  disabled={isCreating}
                >
                  ❌ Cancel
                </button>
              </div>
            </div>
          )}

          <div className="controls">
            {showOnlySelected && selectedPackage && (
              <div className="isolation-mode">
                <span>🔍 Showing only: {selectedPackage.id}</span>
                <button onClick={() => setShowOnlySelected(false)} className="show-all-btn">
                  Show All Packages
                </button>
              </div>
            )}
            
            <div className="search-box">
              <input
                type="text"
                placeholder="🔍 Search packages, customers, cities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="filter-row">
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">📋 All Status</option>
                <option value="In Transit">🚛 In Transit</option>
                <option value="Delivered">✅ Delivered</option>
                <option value="Cancelled">❌ Cancelled</option>
              </select>
              
              <select 
                value={filterPriority} 
                onChange={(e) => setFilterPriority(e.target.value)}
                className="filter-select"
              >
                <option value="all">🚨 All Priority</option>
                <option value="High">🔴 High</option>
                <option value="Medium">🟡 Medium</option>
                <option value="Low">🟢 Low</option>
              </select>
            </div>
          </div>
          
          <div className="packages-list">
            {displayPackages.length === 0 ? (
              <div className="no-packages">
                <div className="no-packages-icon">📭</div>
                <p>No packages found</p>
                <p>Create your first package above!</p>
              </div>
            ) : (
              displayPackages.map((pkg) => {
                const statusConfig = getStatusConfig(pkg.status);
                const priorityConfig = getPriorityConfig(pkg.priority);
                
                return (
                  <div 
                    key={pkg.id} 
                    className={`package-card ${selectedPackage?.id === pkg.id ? 'selected' : ''} ${showOnlySelected && selectedPackage?.id === pkg.id ? 'isolated' : ''}`}
                    onClick={() => handlePackageClick(pkg)}
                    style={{ backgroundColor: statusConfig.bgColor }}
                  >
                    <div className="package-header">
                      <div className="package-id">
                        <span className="id-text">{pkg.id}</span>
                        <span className="priority-badge" style={{ color: priorityConfig.color }}>
                          {priorityConfig.icon}
                        </span>
                      </div>
                      <div className="package-actions">
                        <div className="status-badge" style={{ background: statusConfig.gradient }}>
                          <span className="status-icon">{statusConfig.icon}</span>
                          <span className="status-text">{pkg.status}</span>
                        </div>
                        {(pkg.status === "In Transit") && (
                          <button 
                            className="cancel-btn"
                            onClick={(e) => cancelPackage(pkg.id, e)}
                            title="Cancel Package"
                          >
                            ❌
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="package-details">
                      <div className="detail-row">
                        <span className="detail-icon">📦</span>
                        <span className="detail-text" title={pkg.name}>{pkg.name}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-icon">👤</span>
                        <span className="detail-text" title={pkg.customer}>{pkg.customer}</span>
                      </div>
                      {pkg.customerPhone && (
                        <div className="detail-row">
                          <span className="detail-icon">📞</span>
                          <span className="detail-text">{pkg.customerPhone}</span>
                        </div>
                      )}
                      <div className="detail-row">
                        <span className="detail-icon">⚖️</span>
                        <span className="detail-text">{pkg.weight}</span>
                      </div>
                      {pkg.distance && (
                        <div className="detail-row">
                          <span className="detail-icon">📏</span>
                          <span className="detail-text">{pkg.distance} km</span>
                        </div>
                      )}
                      {pkg.estimatedHours && pkg.status === "In Transit" && (
                        <div className="detail-row">
                          <span className="detail-icon">⏱️</span>
                          <span className="detail-text">~{pkg.estimatedHours}h delivery</span>
                        </div>
                      )}
                      
                      <div className="progress-section">
                        <div className="progress-header">
                          <span>Progress</span>
                          <span className="progress-percent">{pkg.progress}%</span>
                        </div>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ 
                              width: `${pkg.progress}%`,
                              background: statusConfig.gradient
                            }}
                          >
                            <div className="progress-shine"></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="route-section">
                        <div className="route-item">
                          <span className="route-icon">📍</span>
                          <span className="route-text" title={pkg.origin.name}>
                            {pkg.origin.name}
                          </span>
                        </div>
                        <div className="route-arrow">→</div>
                        <div className="route-item">
                          <span className="route-icon">🎯</span>
                          <span className="route-text" title={pkg.destination.name}>
                            {pkg.destination.name}
                          </span>
                        </div>
                      </div>
                      
                      {pkg.estimatedDelivery && (
                        <div className="delivery-info">
                          <span className="delivery-icon">🕒</span>
                          <span className="delivery-text">
                            ETA: {new Date(pkg.estimatedDelivery).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          </div>
        </div>

        <div className="map-container">
          <div className="map-header">
            <h3>🌍 Live Global Tracking Map</h3>
            <div className="map-controls">
              <div className="websocket-info">
                <span className="ws-indicator">
                  🔌 {isConnected ? 'LIVE TRACKING' : 'OFFLINE'}
                </span>
                <span className="update-info">Updates every 3 seconds</span>
              </div>
              {selectedPackage && (
                <div className="selected-package-info">
                  <span>📦 Tracking: {selectedPackage.id}</span>
                  <button onClick={() => setSelectedPackage(null)}>×</button>
                </div>
              )}
            </div>
          </div>
          
          <MapContainer
            center={[20, 0]}
            zoom={2}
            style={{ height: 'calc(100% - 80px)', width: '100%' }}
            className="leaflet-container"
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap &copy; CARTO'
            />
            
            {displayPackages.map((pkg) => {
              const statusConfig = getStatusConfig(pkg.status);
              const isSelected = selectedPackage?.id === pkg.id;
              
              // Only show this package on map if it's in displayPackages
              return (
                <React.Fragment key={pkg.id}>
                  {/* Origin Marker */}
                  <Marker position={[pkg.origin.lat, pkg.origin.lng]}>
                    <Popup>
                      <div className="map-popup">
                        <h4>📍 Origin: {pkg.origin.name}</h4>
                        <p><strong>Package:</strong> {pkg.id}</p>
                        <p><strong>Name:</strong> {pkg.name}</p>
                        <p><strong>Customer:</strong> {pkg.customer}</p>
                        <p><strong>Country:</strong> {pkg.origin.country}</p>
                      </div>
                    </Popup>
                  </Marker>
                  
                  {/* Current Location Marker - MOVES WITH PROGRESS */}
                  <Marker 
                    position={[pkg.location.lat, pkg.location.lng]}
                    icon={L.divIcon({
                      html: `<div class="custom-marker ${pkg.status.toLowerCase().replace(' ', '-')} ${isSelected ? 'selected' : ''}">
                               <div class="marker-pulse"></div>
                               <div class="marker-icon">${statusConfig.icon}</div>
                               <div class="progress-indicator">${pkg.progress}%</div>
                             </div>`,
                      className: 'custom-div-icon',
                      iconSize: [60, 60],
                      iconAnchor: [30, 30]
                    })}
                  >
                    <Popup>
                      <div className="map-popup">
                        <h4>🚛 {pkg.id} - {pkg.name}</h4>
                        <p><strong>Customer:</strong> {pkg.customer}</p>
                        {pkg.customerPhone && <p><strong>Phone:</strong> {pkg.customerPhone}</p>}
                        <p><strong>Status:</strong> {pkg.status}</p>
                        <p><strong>Progress:</strong> {pkg.progress}%</p>
                        <p><strong>Priority:</strong> {pkg.priority}</p>
                        <p><strong>Weight:</strong> {pkg.weight}</p>
                        <p><strong>Route:</strong> {pkg.origin.name} → {pkg.destination.name}</p>
                        {pkg.distance && <p><strong>Distance:</strong> {pkg.distance} km</p>}
                        {pkg.estimatedHours && pkg.status === "In Transit" && (
                          <p><strong>Est. Time:</strong> ~{pkg.estimatedHours} hours</p>
                        )}
                        {pkg.estimatedDelivery && (
                          <p><strong>ETA:</strong> {new Date(pkg.estimatedDelivery).toLocaleString()}</p>
                        )}
                        {pkg.deliveredAt && pkg.status === "Delivered" && (
                          <p><strong>Delivered:</strong> {new Date(pkg.deliveredAt).toLocaleString()}</p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                  
                  {/* Destination Marker */}
                  <Marker position={[pkg.destination.lat, pkg.destination.lng]}>
                    <Popup>
                      <div className="map-popup">
                        <h4>🎯 Destination: {pkg.destination.name}</h4>
                        <p><strong>Package:</strong> {pkg.id}</p>
                        <p><strong>Customer:</strong> {pkg.customer}</p>
                        <p><strong>Country:</strong> {pkg.destination.country}</p>
                      </div>
                    </Popup>
                  </Marker>
                  
                  {/* Route Line */}
                  <Polyline
                    positions={[
                      [pkg.origin.lat, pkg.origin.lng],
                      [pkg.location.lat, pkg.location.lng],
                      [pkg.destination.lat, pkg.destination.lng]
                    ]}
                    color={isSelected ? '#ff6b6b' : statusConfig.color}
                    weight={isSelected ? 6 : 4}
                    opacity={isSelected ? 1 : 0.8}
                    dashArray={pkg.status === 'Delivered' ? '0' : '15, 10'}
                  />
                </React.Fragment>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

export default UltimateApp;
