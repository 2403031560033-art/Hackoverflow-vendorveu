import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { updateCustomerLocation } from '../../utils/api';
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

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position === null ? null : (
    <Marker position={position} />
  );
}

export default function CustomerSettings() {
  const navigate = useNavigate();
  const customerPhone = localStorage.getItem('customerPhone');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [mapPosition, setMapPosition] = useState(PARUL_UNIVERSITY);
  const [showMap, setShowMap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!customerPhone) {
      navigate('/customer/login');
      return;
    }

    // Load current location from localStorage
    const savedLocation = localStorage.getItem('customerLocation');
    if (savedLocation) {
      try {
        const loc = JSON.parse(savedLocation);
        
        // Validate location
        const validateLocation = (lat, lng) => {
          if (!lat || !lng) return false;
          if (lat < 6 || lat > 37 || lng < 68 || lng > 97) return false;
          // Reject Bhopal coordinates
          if (Math.abs(lat - 23.2599) < 0.1 && Math.abs(lng - 77.4126) < 0.1) return false;
          return true;
        };
        
        if (loc.lat && loc.lng && validateLocation(loc.lat, loc.lng)) {
          setCurrentLocation(loc);
          setMapPosition([loc.lat, loc.lng]);
        } else {
          // Invalid location, clear it
          localStorage.removeItem('customerLocation');
          console.warn('Invalid location data cleared');
        }
      } catch (e) {
        console.error('Error parsing saved location:', e);
        localStorage.removeItem('customerLocation');
      }
    }
  }, [customerPhone, navigate]);

  const validateLocation = (lat, lng) => {
    if (lat < 6 || lat > 37 || lng < 68 || lng > 97) return false;
    if (Math.abs(lat - 23.2599) < 0.1 && Math.abs(lng - 77.4126) < 0.1) return false;
    return true;
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser. Please use map picker.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        if (!validateLocation(lat, lng)) {
          alert('Invalid location detected. Please use map picker to select your location.');
          return;
        }
        
        setCurrentLocation({ lat, lng, address: 'Current Location' });
        setMapPosition([lat, lng]);
        setShowMap(false);
      },
      (error) => {
        let errorMessage = 'Unable to get your location. ';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Location permission denied. Please enable location access and try again.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information unavailable. Please use map picker.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage += 'Please use map picker.';
            break;
        }
        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleMapPicker = () => {
    setShowMap(true);
  };

  useEffect(() => {
    if (mapPosition && mapPosition !== PARUL_UNIVERSITY && showMap) {
      setCurrentLocation({
        lat: mapPosition[0],
        lng: mapPosition[1],
        address: 'Selected Location'
      });
    }
  }, [mapPosition]);

  const handleSaveLocation = async () => {
    if (!currentLocation || !currentLocation.lat || !currentLocation.lng) {
      alert('Please select a location first');
      return;
    }

    // Validate location before saving
    if (!validateLocation(currentLocation.lat, currentLocation.lng)) {
      alert('Invalid location detected. Please select a valid location.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      await updateCustomerLocation(customerPhone, currentLocation);
      
      // Update localStorage
      localStorage.setItem('customerLocation', JSON.stringify(currentLocation));
      
      setMessage('Location updated successfully!');
      setShowMap(false);
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating location:', error);
      alert(error.response?.data?.error || 'Failed to update location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customerPhone');
    localStorage.removeItem('customerName');
    localStorage.removeItem('customerLocation');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/customer" className="text-orange-600 hover:underline">← Back</Link>
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
          <div></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Location Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">📍 Location</h2>
          
          {currentLocation && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Current Location:</p>
              <p className="font-medium text-gray-900">{currentLocation.address || 'Location set'}</p>
              <p className="text-xs text-gray-500 mt-1">
                ({currentLocation.lat?.toFixed(4)}, {currentLocation.lng?.toFixed(4)})
              </p>
            </div>
          )}

          <div className="space-y-3 mb-4">
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              📍 Use Current Location
            </button>
            <button
              type="button"
              onClick={handleMapPicker}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              🗺️ Pick on Map
            </button>
          </div>

          {showMap && (
            <div className="mb-4">
              <div style={{ height: '400px', width: '100%' }}>
                <MapContainer
                  center={mapPosition}
                  zoom={15}
                  style={{ height: '100%', width: '100%', borderRadius: '8px' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <LocationMarker position={mapPosition} setPosition={setMapPosition} />
                </MapContainer>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowMap(false);
                  if (mapPosition) {
                    setCurrentLocation({
                      lat: mapPosition[0],
                      lng: mapPosition[1],
                      address: 'Selected Location'
                    });
                  }
                }}
                className="mt-2 w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Confirm Location
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleSaveLocation}
            disabled={loading || !currentLocation}
            className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Saving...' : 'Save Location'}
          </button>

          {message && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">{message}</p>
            </div>
          )}
        </div>

        {/* Account Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Phone Number</p>
              <p className="font-medium text-gray-900">{customerPhone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="font-medium text-gray-900">
                {localStorage.getItem('customerName') || 'Not set'}
              </p>
            </div>
          </div>
        </div>

        {/* Support Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Customer Support</h2>
          <p className="text-sm text-gray-600 mb-4">
            Have a question or need help? Message our support team and we'll get back to you.
          </p>
          <Link
            to="/customer/support"
            className="block w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-center"
          >
            Contact Support
          </Link>
        </div>

        {/* Logout Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
