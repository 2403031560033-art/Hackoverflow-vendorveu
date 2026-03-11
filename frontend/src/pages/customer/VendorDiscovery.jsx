import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { getVendors, calculateDistance, getGoogleMapsDirectionsUrl, getImageUrl } from '../../utils/api';
import { getCartItemCount } from '../../utils/cart';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const PARUL_UNIVERSITY = [22.2587, 73.3570];

export default function VendorDiscovery() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [filteredVendors, setFilteredVendors] = useState([]);
  const [distance, setDistance] = useState(() => {
    const saved = parseFloat(localStorage.getItem('preferredDistance') || '2');
    return saved > 50 ? 50 : saved < 0.5 ? 0.5 : saved;
  });
  const [viewMode, setViewMode] = useState('grid');
  const [selectedServiceType, setSelectedServiceType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [userLocation, setUserLocation] = useState(PARUL_UNIVERSITY);
  const [cartCount, setCartCount] = useState(0);
  const [locationLoading, setLocationLoading] = useState(false);

  const SERVICE_TYPES = [
    { value: 'all', label: 'All', icon: '🌍' },
    { value: 'food', label: 'Food', icon: '🍕' },
    { value: 'salon', label: 'Salon', icon: '💇' },
    { value: 'doctor', label: 'Doctor', icon: '🏥' },
    { value: 'milk', label: 'Milk', icon: '🥛' },
    { value: 'grocery', label: 'Grocery', icon: '🛒' },
    { value: 'service', label: 'Services', icon: '🔧' }
  ];

  const CATEGORY_OPTIONS = {
    all: ['all'],
    food: ['all', 'snacks', 'meals', 'beverages', 'desserts', 'bakery', 'other'],
    salon: ['all', 'haircut', 'facial', 'massage', 'nails', 'makeup', 'other'],
    doctor: ['all', 'general', 'dental', 'eye', 'skin', 'physiotherapy', 'other'],
    milk: ['all', 'milk', 'curd', 'paneer', 'butter', 'ghee', 'other'],
    grocery: ['all', 'vegetables', 'fruits', 'grains', 'spices', 'packaged', 'other'],
    service: ['all', 'plumbing', 'electrical', 'cleaning', 'repair', 'wedding', 'other']
  };

  useEffect(() => {
    // Check authentication
    const customerPhone = localStorage.getItem('customerPhone');
    if (!customerPhone) {
      navigate('/customer/login');
      return;
    }

    fetchVendors();
    setCartCount(getCartItemCount());

    // Load location from localStorage first (stored during registration/login)
    const savedLocation = localStorage.getItem('customerLocation');
    if (savedLocation) {
      try {
        const loc = JSON.parse(savedLocation);
        if (loc.lat && loc.lng) {
          // Validate location - reject Bhopal or invalid coordinates
          const validateLocation = (lat, lng) => {
            if (lat < 6 || lat > 37 || lng < 68 || lng > 97) return false;
            // Reject Bhopal coordinates
            if (Math.abs(lat - 23.2599) < 0.1 && Math.abs(lng - 77.4126) < 0.1) return false;
            return true;
          };

          if (validateLocation(loc.lat, loc.lng)) {
            setUserLocation([loc.lat, loc.lng]);
          } else {
            // Invalid location, clear it and use default
            localStorage.removeItem('customerLocation');
            console.warn('Invalid location data cleared');
          }
        }
      } catch (e) {
        console.error('Error parsing saved location:', e);
        localStorage.removeItem('customerLocation');
      }
    }

    // Always try to get current location (will update saved location if successful)
    getCurrentLocation();
  }, [navigate]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          address: 'Current Location'
        };
        setUserLocation([loc.lat, loc.lng]);
        localStorage.setItem('customerLocation', JSON.stringify(loc));
        setLocationLoading(false);
      },
      (error) => {
        setLocationLoading(false);
        // Error handling - but don't override saved location if geolocation fails
        // Only set default if no saved location exists
        const savedLocation = localStorage.getItem('customerLocation');
        if (!savedLocation) {
          setUserLocation(PARUL_UNIVERSITY);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    filterVendors();
  }, [vendors, distance, selectedCategory, selectedServiceType, userLocation]);

  const fetchVendors = async (serviceType) => {
    try {
      const response = await getVendors(serviceType);
      setVendors(response.data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const handleServiceTypeChange = (type) => {
    setSelectedServiceType(type);
    setSelectedCategory('all');
    fetchVendors(type);
  };

  const filterVendors = () => {
    if (!vendors || vendors.length === 0) {
      setFilteredVendors([]);
      return;
    }

    let filtered = [...vendors]; // Create a copy to avoid mutating original

    // Filter by distance - only if user location is valid and vendor has valid location
    if (userLocation && userLocation[0] && userLocation[1]) {
      filtered = filtered.filter(vendor => {
        // Validate vendor has location data
        if (!vendor.location || !vendor.location.lat || !vendor.location.lng) {
          return false; // Exclude vendors without valid location
        }

        try {
          const dist = calculateDistance(
            userLocation[0],
            userLocation[1],
            vendor.location.lat,
            vendor.location.lng
          );
          vendor.distance = dist;
          return dist <= distance;
        } catch (error) {
          console.error('Error calculating distance for vendor:', vendor._id, error);
          return false; // Exclude vendors with calculation errors
        }
      });
    } else {
      // If no user location, show all vendors but mark distance as null
      filtered = filtered.map(vendor => {
        vendor.distance = null;
        return vendor;
      });
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(vendor => vendor.category === selectedCategory);
    }

    // Sort by distance (null distances go to end)
    filtered.sort((a, b) => {
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });

    setFilteredVendors(filtered);
    localStorage.setItem('preferredDistance', distance.toString());
  };

  const currentCategories = CATEGORY_OPTIONS[selectedServiceType] || CATEGORY_OPTIONS.all;

  const handleLogout = () => {
    localStorage.removeItem('customerPhone');
    localStorage.removeItem('customerName');
    localStorage.removeItem('customerLocation');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/customer" className="text-2xl font-bold text-orange-600">VendorVue</Link>
          <div className="flex gap-4 items-center">
            <Link to="/customer" className="text-gray-700 hover:text-orange-600">Home</Link>
            <Link to="/customer/orders" className="text-gray-700 hover:text-orange-600">Orders</Link>
            <Link to="/customer/settings" className="text-gray-700 hover:text-orange-600">Settings</Link>
            <Link to="/wallet" className="text-gray-700 hover:text-orange-600">Wallet</Link>
            <Link to="/cart" className="relative text-gray-700 hover:text-orange-600">
              Cart
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
            <button
              onClick={handleLogout}
              className="text-red-600 hover:text-red-700 font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Distance: {distance >= 1 ? distance.toFixed(1) + ' km' : (distance * 1000).toFixed(0) + ' m'}
              </label>
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={locationLoading}
                className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {locationLoading ? 'Getting Location...' : '📍 Refresh Location'}
              </button>
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min="0.5"
                max="50"
                step="0.5"
                value={distance}
                onChange={(e) => setDistance(parseFloat(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min="0.5"
                max="50"
                step="0.5"
                value={distance}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (val >= 0.5 && val <= 50) {
                    setDistance(val);
                  }
                }}
                className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-sm"
                placeholder="km"
              />
              <span className="text-sm text-gray-600">km</span>
            </div>
          </div>

          {/* Service Type Tabs */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
            <div className="flex gap-2 flex-wrap">
              {SERVICE_TYPES.map(st => (
                <button
                  key={st.value}
                  onClick={() => handleServiceTypeChange(st.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedServiceType === st.value
                      ? 'bg-orange-600 text-white shadow'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {st.icon} {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          {currentCategories.length > 1 && (
            <div className="flex gap-2 mb-4 flex-wrap">
              {currentCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${selectedCategory === cat
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${viewMode === 'grid' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${viewMode === 'map' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
            >
              Map
            </button>
          </div>
        </div>

        {/* Vendor Count */}
        <p className="text-gray-600 mb-4">
          {filteredVendors.length} vendor{filteredVendors.length !== 1 ? 's' : ''} found
        </p>

        {/* Map View */}
        {viewMode === 'map' && (
          <div className="bg-white rounded-lg shadow mb-6" style={{ height: '500px' }}>
            <div className="p-2 bg-gray-50 border-b flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Showing {filteredVendors.length} vendor{filteredVendors.length !== 1 ? 's' : ''} on map
              </p>
            </div>
            <MapContainer
              center={userLocation}
              zoom={filteredVendors.length > 0 ? 14 : 16}
              style={{ height: 'calc(100% - 40px)', width: '100%', borderRadius: '0 0 8px 8px' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              {/* User location marker */}
              <Marker position={userLocation}>
                <Popup>
                  <div>
                    <h3 className="font-semibold text-blue-600">Your Location</h3>
                  </div>
                </Popup>
              </Marker>
              {/* Vendor markers */}
              {filteredVendors.map(vendor => {
                if (!vendor.location || !vendor.location.lat || !vendor.location.lng) {
                  return null;
                }
                return (
                  <Marker
                    key={vendor._id}
                    position={[vendor.location.lat, vendor.location.lng]}
                  >
                    <Popup>
                      <div className="min-w-[200px]">
                        <h3 className="font-semibold text-gray-900">{vendor.name}</h3>
                        <p className="text-sm text-gray-600 capitalize">{vendor.serviceType || 'food'} • {vendor.category}</p>
                        {vendor.distance !== null && vendor.distance !== undefined && (
                          <p className="text-sm text-gray-500 mt-1">
                            {vendor.distance.toFixed(2)} km away
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center">
                            <span className="text-yellow-500">⭐</span>
                            <span className="text-sm text-gray-600 ml-1">{vendor.rating?.toFixed(1) || 'N/A'}</span>
                          </div>
                          {vendor.currentWaitingTime !== undefined && vendor.currentWaitingTime !== null && (
                            <span className={`text-xs px-2 py-1 rounded ${vendor.currentWaitingTime === 0
                                ? 'bg-green-100 text-green-800'
                                : vendor.currentWaitingTime <= 10
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                              {vendor.currentWaitingTime === 0 ? 'No wait' : `${vendor.currentWaitingTime} min`}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-col gap-2">
                          <Link
                            to={`/vendor/${vendor._id}`}
                            className="text-orange-600 text-sm hover:underline font-medium"
                          >
                            View Menu →
                          </Link>
                          <a
                            href={getGoogleMapsDirectionsUrl(vendor.location.lat, vendor.location.lng, vendor.location.address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 text-sm hover:underline font-medium"
                          >
                            📍 Get Directions
                          </a>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        )}

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVendors.map(vendor => (
              <Link
                key={vendor._id}
                to={`/vendor/${vendor._id}`}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="h-48 bg-gray-200 flex items-center justify-center">
                  {vendor.image && vendor.image !== '/images/vendor-placeholder.jpg' ? (
                    <img
                      src={getImageUrl(vendor.image) || vendor.image}
                      alt={vendor.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400 text-4xl">🏪</span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{vendor.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${vendor.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {vendor.isOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-2 capitalize">
                    <span className="inline-block px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs font-medium mr-1">
                      {vendor.serviceType || 'food'}
                    </span>
                    {vendor.category}
                  </p>
                  {vendor.distance && (
                    <p className="text-orange-600 font-medium">
                      {vendor.distance.toFixed(2)} km away
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center">
                      <span className="text-yellow-500">⭐</span>
                      <span className="text-gray-600 ml-1">{vendor.rating.toFixed(1)}</span>
                    </div>
                    {vendor.currentWaitingTime !== undefined && vendor.currentWaitingTime !== null && (
                      <span className={`text-xs px-2 py-1 rounded ${vendor.currentWaitingTime === 0
                          ? 'bg-green-100 text-green-800'
                          : vendor.currentWaitingTime <= 10
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                        {vendor.currentWaitingTime === 0 ? 'No wait' : `⏱️ ${vendor.currentWaitingTime} min`}
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <a
                      href={getGoogleMapsDirectionsUrl(vendor.location.lat, vendor.location.lng, vendor.location.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-600 text-xs hover:underline"
                    >
                      📍 Get Directions
                    </a>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {filteredVendors.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No vendors found within {distance} km</p>
            <p className="text-gray-400 text-sm mt-2">Try adjusting the distance slider</p>
          </div>
        )}
      </div>
    </div>
  );
}

