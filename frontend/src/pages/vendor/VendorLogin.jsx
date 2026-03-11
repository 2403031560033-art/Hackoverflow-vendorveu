import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { registerVendor, loginVendor } from '../../utils/api';
import VideoBackground from '../../components/VideoBackground';
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

export default function VendorLogin() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    name: '',
    serviceType: 'food',
    category: 'snacks',
    lat: PARUL_UNIVERSITY[0],
    lng: PARUL_UNIVERSITY[1],
    address: 'Parul University'
  });

  const SERVICE_TYPES = [
    { value: 'food', label: '🍕 Food', icon: '🍕' },
    { value: 'salon', label: '💇 Salon', icon: '💇' },
    { value: 'doctor', label: '🏥 Doctor', icon: '🏥' },
    { value: 'milk', label: '🥛 Milk', icon: '🥛' },
    { value: 'grocery', label: '🛒 Grocery', icon: '🛒' },
    { value: 'service', label: '🔧 Service', icon: '🔧' }
  ];

  const CATEGORY_OPTIONS = {
    food: ['snacks', 'meals', 'beverages', 'desserts', 'bakery', 'other'],
    salon: ['haircut', 'facial', 'massage', 'nails', 'makeup', 'other'],
    doctor: ['general', 'dental', 'eye', 'skin', 'physiotherapy', 'other'],
    milk: ['milk', 'curd', 'paneer', 'butter', 'ghee', 'other'],
    grocery: ['vegetables', 'fruits', 'grains', 'spices', 'packaged', 'other'],
    service: ['plumbing', 'electrical', 'cleaning', 'repair', 'wedding', 'other']
  };
  const [showMap, setShowMap] = useState(false);
  const [mapPosition, setMapPosition] = useState(PARUL_UNIVERSITY);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [locationMethod, setLocationMethod] = useState('');

  useEffect(() => {
    if (mapPosition && mapPosition !== PARUL_UNIVERSITY) {
      setFormData(prev => ({
        ...prev,
        lat: mapPosition[0],
        lng: mapPosition[1]
      }));
    }
  }, [mapPosition]);

  const validateLocation = (lat, lng) => {
    if (lat < 6 || lat > 37 || lng < 68 || lng > 97) {
      return false;
    }
    if (Math.abs(lat - 23.2599) < 0.1 && Math.abs(lng - 77.4126) < 0.1) {
      return false;
    }
    return true;
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser. Please use map picker or default location.');
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

        setFormData(prev => ({
          ...prev,
          lat,
          lng,
          address: 'Current Location'
        }));
        setMapPosition([lat, lng]);
        setLocationMethod('current');
        setShowMap(false);
      },
      (error) => {
        let errorMessage = 'Unable to get your location. ';
        switch (error.code) {
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
            errorMessage += 'Please use map picker or default location.';
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
    setLocationMethod('map');
  };

  const handleUseDefault = () => {
    setFormData(prev => ({
      ...prev,
      lat: PARUL_UNIVERSITY[0],
      lng: PARUL_UNIVERSITY[1],
      address: 'Parul University'
    }));
    setMapPosition(PARUL_UNIVERSITY);
    setLocationMethod('default');
    setShowMap(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.phone.match(/^[0-9]{10}$/)) {
      alert('Please enter a valid 10-digit phone number');
      return;
    }

    if (!formData.password || formData.password.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    if (isRegister && !formData.name.trim()) {
      alert('Please enter your business name');
      return;
    }

    if (isRegister && !locationMethod) {
      alert('Please select your shop location');
      return;
    }

    if (isRegister && !validateLocation(formData.lat, formData.lng)) {
      alert('Invalid location detected. Please select a valid location.');
      return;
    }

    setLoading(true);

    try {
      let response;
      if (isRegister) {
        response = await registerVendor({
          phone: formData.phone,
          password: formData.password,
          name: formData.name,
          serviceType: formData.serviceType,
          category: formData.category,
          location: {
            lat: parseFloat(formData.lat),
            lng: parseFloat(formData.lng),
            address: formData.address
          }
        });
      } else {
        response = await loginVendor(formData.phone, formData.password);
      }

      // Store vendor info in localStorage
      localStorage.setItem('vendorId', response.data.vendor._id);
      localStorage.setItem('vendorPhone', response.data.vendor.phone);
      localStorage.setItem('vendorServiceType', response.data.vendor.serviceType || 'food');
      localStorage.setItem('isVendor', 'true');

      navigate('/vendor/dashboard');
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <VideoBackground />
      <div className="relative z-10 max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-orange-600 mb-2">vendorvue</h1>
          <p className="text-gray-600">Vendor Portal</p>
        </div>

        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setIsRegister(false)}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${!isRegister
              ? 'bg-white text-orange-600 shadow'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Login
          </button>
          <button
            onClick={() => setIsRegister(true)}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${isRegister
              ? 'bg-white text-orange-600 shadow'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-transparent"
              placeholder="10-digit phone number"
              maxLength="10"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password * (min 8 characters)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-transparent pr-10"
                placeholder="Enter password"
                minLength="8"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {isRegister && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                  placeholder="Enter business name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Type *
                </label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {SERVICE_TYPES.map(st => (
                    <button
                      key={st.value}
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        serviceType: st.value,
                        category: CATEGORY_OPTIONS[st.value][0]
                      }))}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${formData.serviceType === st.value
                          ? 'border-orange-600 bg-orange-50 text-orange-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                >
                  {(CATEGORY_OPTIONS[formData.serviceType] || CATEGORY_OPTIONS.food).map(cat => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shop Location *
                </label>
                <div className="space-y-2">
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
                  <button
                    type="button"
                    onClick={handleUseDefault}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    📌 Use Default (Parul University)
                  </button>
                </div>

                {locationMethod && (
                  <div className="mt-2 p-2 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✅ Location selected: {formData.address}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      ({formData.lat.toFixed(4)}, {formData.lng.toFixed(4)})
                    </p>
                  </div>
                )}

                {showMap && (
                  <div className="mt-4" style={{ height: '300px', width: '100%' }}>
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
                    <p className="text-xs text-gray-500 mt-1">Click on the map to select your shop location</p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMap(false);
                        setFormData(prev => ({
                          ...prev,
                          address: 'Selected Location'
                        }));
                      }}
                      className="mt-2 w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      ✓ Confirm Location
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : isRegister ? 'Register' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/" className="text-orange-600 hover:underline text-sm">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

