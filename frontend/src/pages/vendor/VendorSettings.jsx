import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { getVendorById, updateVendorLocation, updateVendorProfile, uploadVendorImage, uploadVendorQRCode, getImageUrl } from '../../utils/api';
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

export default function VendorSettings() {
  const navigate = useNavigate();
  const vendorId = localStorage.getItem('vendorId');
  const [vendor, setVendor] = useState(null);
  const [location, setLocation] = useState({ lat: PARUL_UNIVERSITY[0], lng: PARUL_UNIVERSITY[1], address: '' });
  const [mapPosition, setMapPosition] = useState(PARUL_UNIVERSITY);
  const [showMap, setShowMap] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState('');
  const [profileData, setProfileData] = useState({ name: '', description: '', upiId: '' });
  const [imagePreview, setImagePreview] = useState(null);
  const [qrCodePreview, setQrCodePreview] = useState(null);
  const [uploadingQR, setUploadingQR] = useState(false);

  useEffect(() => {
    if (!vendorId) {
      navigate('/vendor/login');
      return;
    }
    fetchVendor();
  }, [vendorId, navigate]);

  const fetchVendor = async () => {
    try {
      const response = await getVendorById(vendorId);
      const vendorData = response.data;
      setVendor(vendorData);
      setProfileData({
        name: vendorData.name || '',
        description: vendorData.description || '',
        upiId: vendorData.upiId || ''
      });
      if (vendorData.image && vendorData.image !== '/images/vendor-placeholder.jpg') {
        setImagePreview(vendorData.image);
      }
      if (vendorData.qrCode) {
        setQrCodePreview(vendorData.qrCode);
      }
      
      if (vendorData.location) {
        const loc = {
          lat: vendorData.location.lat || PARUL_UNIVERSITY[0],
          lng: vendorData.location.lng || PARUL_UNIVERSITY[1],
          address: vendorData.location.address || 'Parul University'
        };
        setLocation(loc);
        setMapPosition([loc.lat, loc.lng]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching vendor:', error);
      setLoading(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocation({ lat, lng, address: 'Current Location' });
          setMapPosition([lat, lng]);
          setShowMap(false);
        },
        () => {
          alert('Unable to get your location. Please use map picker.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const handleMapPicker = () => {
    setShowMap(true);
  };

  useEffect(() => {
    if (mapPosition && mapPosition !== PARUL_UNIVERSITY && showMap) {
      setLocation(prev => ({
        ...prev,
        lat: mapPosition[0],
        lng: mapPosition[1]
      }));
    }
  }, [mapPosition]);

  const handleSaveLocation = async () => {
    if (!location.lat || !location.lng) {
      alert('Please select a location first');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      await updateVendorLocation(vendorId, location);
      setMessage('Location updated successfully!');
      setShowMap(false);
      
      // Refresh vendor data
      await fetchVendor();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating location:', error);
      alert(error.response?.data?.error || 'Failed to update location. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profileData.name.trim()) {
      alert('Name is required');
      return;
    }

    setSavingProfile(true);
    setMessage('');

    try {
      await updateVendorProfile(vendorId, profileData);
      setMessage('Profile updated successfully!');
      
      // Refresh vendor data
      await fetchVendor();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(error.response?.data?.error || 'Failed to update profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.match('image.*')) {
        alert('Please select an image file');
        return;
      }
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    if (!file.type.match('image.*')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await uploadVendorImage(vendorId, formData);
      setMessage('Image uploaded successfully!');
      setImagePreview(response.data.image);
      
      // Refresh vendor data
      await fetchVendor();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(error.response?.data?.error || 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
      e.target.value = ''; // Reset file input
    }
  };

  const handleQRCodeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    if (!file.type.match('image.*')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploadingQR(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await uploadVendorQRCode(vendorId, formData);
      setMessage('QR Code uploaded successfully!');
      setQrCodePreview(response.data.image || response.data.qrCode);
      
      // Refresh vendor data
      await fetchVendor();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error uploading QR code:', error);
      alert(error.response?.data?.error || 'Failed to upload QR code. Please try again.');
    } finally {
      setUploadingQR(false);
      e.target.value = ''; // Reset file input
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/vendor/dashboard" className="text-orange-600 hover:underline">← Back to Dashboard</Link>
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
          <div></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Profile Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>
          
          <div className="space-y-4">
            {/* Shop Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shop Photo
              </label>
              <div className="flex items-center gap-4">
                <div className="w-32 h-32 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                  {imagePreview ? (
                    <img 
                      src={getImageUrl(imagePreview) || imagePreview} 
                      alt="Shop" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <span className="text-gray-400 text-4xl">🏪</span>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                    id="shop-image-upload"
                  />
                  <label
                    htmlFor="shop-image-upload"
                    className={`inline-block px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors ${uploadingImage ? 'opacity-50' : ''}`}
                  >
                    {uploadingImage ? 'Uploading...' : 'Upload Photo'}
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Max 5MB, JPG/PNG/WEBP</p>
                </div>
              </div>
            </div>

            {/* UPI QR Code Upload */}
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📲 UPI Payment QR Code (for customers to scan and pay)
              </label>
              <div className="flex items-center gap-4">
                <div className="w-32 h-32 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center border-2 border-orange-300">
                  {qrCodePreview ? (
                    <img 
                      src={getImageUrl(qrCodePreview) || qrCodePreview} 
                      alt="UPI QR Code" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <span className="text-gray-400 text-4xl">📲</span>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQRCodeUpload}
                    disabled={uploadingQR}
                    className="hidden"
                    id="qr-code-upload"
                  />
                  <label
                    htmlFor="qr-code-upload"
                    className={`inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors ${uploadingQR ? 'opacity-50' : ''}`}
                  >
                    {uploadingQR ? 'Uploading...' : 'Upload QR Code'}
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Max 5MB, JPG/PNG/WEBP</p>
                  <p className="text-sm text-gray-600 mt-2">
                    💡 Customers can scan this QR code to pay you directly via UPI when placing orders
                  </p>
                </div>
              </div>
            </div>

            {/* UPI ID Input */}
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                💳 UPI ID (Alternative to QR Code)
              </label>
              <input
                type="text"
                value={profileData.upiId}
                onChange={(e) => setProfileData({ ...profileData, upiId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                placeholder="e.g., yourname@upi, yourname@paytm, yourname@ybl"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter your UPI ID so customers can pay directly. Leave empty if you only use QR code.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Format: name@upi, name@paytm, name@okhdfcbank, name@ybl, etc.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name *
              </label>
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                placeholder="Enter business name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={profileData.description}
                onChange={(e) => setProfileData({ ...profileData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                placeholder="Describe your business..."
                rows="4"
              />
            </div>

            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={savingProfile || !profileData.name.trim()}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>

        {/* Location Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">📍 Location</h2>
          
          {location && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Current Location:</p>
              <p className="font-medium text-gray-900">{location.address || 'Location set'}</p>
              <p className="text-xs text-gray-500 mt-1">
                ({location.lat?.toFixed(4)}, {location.lng?.toFixed(4)})
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
                    setLocation(prev => ({
                      ...prev,
                      lat: mapPosition[0],
                      lng: mapPosition[1],
                      address: prev.address || 'Selected Location'
                    }));
                  }
                }}
                className="mt-2 w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Confirm Location
              </button>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address (Optional)
            </label>
            <input
              type="text"
              value={location.address}
              onChange={(e) => setLocation({ ...location, address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-transparent"
              placeholder="Enter address"
            />
          </div>

          <button
            type="button"
            onClick={handleSaveLocation}
            disabled={saving || !location.lat || !location.lng}
            className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {saving ? 'Saving...' : 'Save Location'}
          </button>

          {message && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">{message}</p>
            </div>
          )}
        </div>

        {/* Support Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Vendor Support</h2>
          <p className="text-sm text-gray-600 mb-4">
            Have a question or need help? Message our support team and we'll get back to you.
          </p>
          <Link
            to="/vendor/support"
            className="block w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-center"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
