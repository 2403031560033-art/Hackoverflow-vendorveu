import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getVendorStats, getVendorById, updateVendorWaitingTime, updateVendorIsOpen } from '../../utils/api';

export default function VendorDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState(null);
  const [waitingTime, setWaitingTime] = useState(0);
  const [updatingWaitingTime, setUpdatingWaitingTime] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [updatingIsOpen, setUpdatingIsOpen] = useState(false);
  const vendorId = localStorage.getItem('vendorId');
  const vendorName = localStorage.getItem('vendorName') || 'Vendor';

  useEffect(() => {
    if (!vendorId) {
      navigate('/vendor/login');
      return;
    }

    fetchStats();
    fetchVendor();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [vendorId, navigate]);

  const fetchStats = async () => {
    try {
      const response = await getVendorStats(vendorId);
      setStats(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  };

  const fetchVendor = async () => {
    try {
      const response = await getVendorById(vendorId);
      setVendor(response.data);
      setWaitingTime(response.data.currentWaitingTime || 0);
      setIsOpen(typeof response.data.isOpen === 'boolean' ? response.data.isOpen : true);
      // Store serviceType for use in other pages
      if (response.data.serviceType) {
        localStorage.setItem('vendorServiceType', response.data.serviceType);
      }
    } catch (error) {
      console.error('Error fetching vendor:', error);
    }
  };

  const handleUpdateWaitingTime = async () => {
    if (waitingTime < 0) {
      alert('Waiting time cannot be negative');
      return;
    }

    setUpdatingWaitingTime(true);
    try {
      await updateVendorWaitingTime(vendorId, waitingTime);
      await fetchVendor();
      alert('Waiting time updated successfully!');
    } catch (error) {
      console.error('Error updating waiting time:', error);
      alert(error.response?.data?.error || 'Failed to update waiting time. Please try again.');
    } finally {
      setUpdatingWaitingTime(false);
    }
  };

  const handleToggleIsOpen = async () => {
    setUpdatingIsOpen(true);
    try {
      await updateVendorIsOpen(vendorId, !isOpen);
      await fetchVendor();
    } catch (error) {
      console.error('Error updating shop status:', error);
      alert(error.response?.data?.error || 'Failed to update shop status. Please try again.');
    } finally {
      setUpdatingIsOpen(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('vendorId');
    localStorage.removeItem('vendorPhone');
    localStorage.removeItem('isVendor');
    localStorage.removeItem('vendorName');
    localStorage.removeItem('vendorServiceType');
    navigate('/vendor/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-orange-600">vendorvue</h1>
          <button
            onClick={handleLogout}
            className="text-gray-700 hover:text-red-600 font-medium"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          Welcome back, {vendorName}!
        </h2>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 text-sm font-medium">Total Orders</h3>
              <span className="text-2xl">📦</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalOrders}</p>
          </div>

          <div className="bg-yellow-50 rounded-lg shadow p-6 border-2 border-yellow-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-yellow-800 text-sm font-medium">Pending Orders</h3>
              <span className="text-2xl">⏳</span>
            </div>
            <p className="text-3xl font-bold text-yellow-900">{stats.pendingOrders}</p>
          </div>

          <div className="bg-green-50 rounded-lg shadow p-6 border-2 border-green-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-green-800 text-sm font-medium">Completed Today</h3>
              <span className="text-2xl">✅</span>
            </div>
            <p className="text-3xl font-bold text-green-900">{stats.completedOrders}</p>
          </div>

          <div className="bg-blue-50 rounded-lg shadow p-6 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-blue-800 text-sm font-medium">Total Revenue</h3>
              <span className="text-2xl">💰</span>
            </div>
            <p className="text-3xl font-bold text-blue-900">₹{stats.totalRevenue.toFixed(2)}</p>
          </div>
        </div>

        {/* Open / Closed Widget */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Shop Status</h3>
              <p className="text-sm text-gray-600 mt-1">
                Customers will see if your shop is open or closed.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm px-3 py-1 rounded-full font-medium ${isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {isOpen ? 'Open' : 'Closed'}
              </span>
              <button
                onClick={handleToggleIsOpen}
                disabled={updatingIsOpen}
                className="px-5 py-2 rounded-lg font-semibold text-white bg-gray-900 hover:bg-black disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {updatingIsOpen ? 'Updating…' : (isOpen ? 'Set Closed' : 'Set Open')}
              </button>
            </div>
          </div>
        </div>

        {/* Waiting Time Widget */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">⏱️ Current Waiting Time</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Wait Time (minutes)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={waitingTime}
                  onChange={(e) => setWaitingTime(parseInt(e.target.value) || 0)}
                  className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                  placeholder="0"
                />
                <button
                  onClick={handleUpdateWaitingTime}
                  disabled={updatingWaitingTime}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {updatingWaitingTime ? 'Updating...' : 'Update'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                This will be shown to customers on the home page
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600">
                {waitingTime === 0 ? 'No wait' : `${waitingTime} min`}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/vendor/orders"
            className="bg-white rounded-lg shadow p-8 hover:shadow-lg transition-shadow text-center"
          >
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Manage Orders</h3>
            <p className="text-gray-600">View and update order status</p>
          </Link>

          <Link
            to="/vendor/menu"
            className="bg-white rounded-lg shadow p-8 hover:shadow-lg transition-shadow text-center"
          >
            <div className="text-5xl mb-4">🍽️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Menu Setup</h3>
            <p className="text-gray-600">Add, edit, and manage menu items</p>
          </Link>

          <Link
            to="/vendor/settings"
            className="bg-white rounded-lg shadow p-8 hover:shadow-lg transition-shadow text-center"
          >
            <div className="text-5xl mb-4">⚙️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Settings</h3>
            <p className="text-gray-600">Update location and preferences</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

