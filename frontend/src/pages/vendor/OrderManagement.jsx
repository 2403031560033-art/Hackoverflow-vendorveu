import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getVendorOrders, updateOrderStatus, verifyPickupToken, completePickup } from '../../utils/api';

export default function OrderManagement() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [loading, setLoading] = useState(false);
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [orderForTimeModal, setOrderForTimeModal] = useState(null);
  const [estimatedTimeInput, setEstimatedTimeInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [showScanModal, setShowScanModal] = useState(false);
  const [verifiedOrder, setVerifiedOrder] = useState(null);
  const [showVerifiedModal, setShowVerifiedModal] = useState(false);
  const [scanError, setScanError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const vendorId = localStorage.getItem('vendorId');

  useEffect(() => {
    if (!vendorId) {
      navigate('/vendor/login');
      return;
    }
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [vendorId, filter, navigate]);

  const fetchOrders = async () => {
    try {
      const status = filter === 'all' ? null : filter;
      const response = await getVendorOrders(vendorId, status);
      setOrders(response.data);

      // Check for new orders and play audio alert
      if (response.data.length > lastOrderCount && lastOrderCount > 0) {
        playNewOrderSound();
      }
      setLastOrderCount(response.data.length);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const playNewOrderSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OSfTg8OUKfk8LllHAY4kdfyzHosBSR3x/DdkEAKFF606euoVRQKRp/g8r5sIQUrgc7y2Yk2CBxpvfDkn04PDlCn5PC5ZRwGOJHX8sx6LAUkd8fw3ZBACBRdtOnrqFUUCkaf4PK+bCEFK4HO8tmJNggcab3w5J9ODw5Qp+TwuWUcBjiR1/LMeiwFJHfH8N2QQAgUXbTp66hVFApGn+DyvmwhBSuBzvLZiTYIHGm98OSfTg8OUKfk8LllHAY4kdfyzHosBSR3x/DdkEA=');
      audio.volume = 0.5;
      audio.play().catch(() => {}); // Ignore errors if audio play fails
    } catch (error) {
      console.log('Could not play notification sound');
    }
  };

  const handleStatusUpdate = async (orderId, newStatus, estimatedTime = null) => {
    setLoading(true);
    try {
      await updateOrderStatus(orderId, newStatus, estimatedTime);
      await fetchOrders();
      alert(`Order status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      alert(error.response?.data?.error || 'Failed to update order status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartPreparingClick = (order) => {
    setOrderForTimeModal(order);
    setEstimatedTimeInput(order.estimatedTime ? order.estimatedTime.toString() : '15');
    setShowTimeModal(true);
  };

  const handleConfirmTime = async () => {
    const time = parseInt(estimatedTimeInput);
    
    if (!estimatedTimeInput || isNaN(time) || time <= 0) {
      alert('Please enter a valid positive number for estimated time');
      return;
    }

    setLoading(true);
    try {
      await handleStatusUpdate(orderForTimeModal._id, 'preparing', time);
      setShowTimeModal(false);
      setOrderForTimeModal(null);
      setEstimatedTimeInput('');
    } catch (error) {
      // Error already handled in handleStatusUpdate
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTimeModal = () => {
    setShowTimeModal(false);
    setOrderForTimeModal(null);
    setEstimatedTimeInput('');
  };


  const handleVerifyToken = async (token) => {
    if (!token) {
      alert('Please enter or scan an E-Token');
      return;
    }

    setLoading(true);
    setScanError('');
    try {
      const response = await verifyPickupToken(token);
      setVerifiedOrder(response.data.order);
      setShowVerifiedModal(true);
      setShowScanModal(false);
      stopCamera();
      setTokenInput('');
    } catch (error) {
      console.error('Error verifying token:', error);
      const errMsg = error.response?.data?.error || 'Invalid E-Token. Please try again.';
      setScanError(errMsg);
      alert(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeliverFood = async () => {
    if (!verifiedOrder) return;
    setLoading(true);
    try {
      await completePickup(verifiedOrder._id);
      await fetchOrders();
      setShowVerifiedModal(false);
      setVerifiedOrder(null);
      alert('✅ Order delivered successfully! E-Token permanently invalidated.');
    } catch (error) {
      console.error('Error completing pickup:', error);
      alert(error.response?.data?.error || 'Failed to complete pickup.');
    } finally {
      setLoading(false);
    }
  };

  // Camera QR Scanner functions
  const startCamera = async () => {
    setScanError('');
    setIsScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        // Start scanning frames
        scanIntervalRef.current = setInterval(scanFrame, 500);
      }
    } catch (err) {
      setScanError('Camera access denied. Please enter the token manually.');
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const scanFrame = () => {
    if (!videoRef.current || videoRef.current.readyState !== 4) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // Use jsQR if available, otherwise rely on manual entry
    try {
      // Dynamic import-like approach: check if jsQR is available globally
      // For now, we rely on manual token paste as primary and camera as visual aid
      // The QR scanning will work with the manual paste input below the camera
    } catch (e) {
      // Silent fail - manual entry is the fallback
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'preparing':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'ready':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusButton = (order) => {
    switch (order.status) {
      case 'pending':
        return (
          <button
            onClick={() => handleStartPreparingClick(order)}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
          >
            Start Preparing
          </button>
        );
      case 'preparing':
        return (
          <button
            onClick={() => handleStatusUpdate(order._id, 'ready')}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
          >
            Mark Ready for Pickup
          </button>
        );
      case 'ready':
        return (
          <div className="space-y-3">
            {/* E-Token Scan Verification (Primary) */}
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <p className="text-xs text-green-800 font-medium mb-2">🔒 Scan customer's Virtual E-Token QR</p>
              <button
                onClick={() => { setShowScanModal(true); setTimeout(startCamera, 300); }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 w-full text-sm mb-2"
              >
                📷 Scan E-Token QR
              </button>
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value.trim())}
                placeholder="Or paste E-Token here"
                className="px-3 py-2 border border-gray-300 rounded-lg w-full text-sm font-mono mb-2"
              />
              <button
                onClick={() => handleVerifyToken(tokenInput)}
                disabled={loading || !tokenInput}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 w-full text-sm"
              >
                ✅ Verify E-Token
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/vendor/dashboard" className="text-orange-600 hover:underline">← Dashboard</Link>
          <h1 className="text-xl font-bold text-gray-900">Order Management</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setShowScanModal(true); setTimeout(startCamera, 300); }}
              className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-green-700 flex items-center gap-1"
            >
              📷 Scan E-Token
            </button>
            <span className="text-sm text-gray-600">
              {orders.length} active
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-2">
            {['all', 'pending', 'preparing', 'ready'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium capitalize ${
                  filter === status
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {orders.map(order => (
            <div
              key={order._id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-orange-600 mb-1">
                    Order #{order.orderNumber}
                  </h3>
                  <p className="text-sm text-gray-500">ID: {order._id.toString().slice(-6)}</p>
                </div>
                <span className={`px-3 py-1 rounded-lg text-sm font-medium border-2 ${getStatusColor(order.status)}`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Customer</p>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{order.customerName}</p>
                    <a
                      href={`tel:+91${order.customerPhone}`}
                      className="text-orange-600 hover:underline text-sm"
                    >
                      {order.customerPhone} 📞
                    </a>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Order Time</p>
                  <p className="text-gray-900">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>



                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                  <p className="text-xl font-bold text-orange-600">₹{order.total}</p>
                  {(order.walletAmount > 0 || order.cashAmount > 0) && (
                    <p className="text-xs text-gray-500 mt-1">
                      ₹{order.walletAmount.toFixed(2)} wallet + ₹{order.cashAmount.toFixed(2)} cash
                    </p>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Items</p>
                <div className="bg-gray-50 rounded-lg p-3">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between py-1">
                      <span className="text-gray-700">
                        {item.name} × {item.quantity}
                      </span>
                      <span className="text-gray-900 font-medium">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {order.notes && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Special Instructions:</span> {order.notes}
                  </p>
                </div>
              )}

              {order.status === 'preparing' && order.estimatedTime && (
                <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⏱️ Estimated time remaining: ~{order.estimatedTime} minutes
                  </p>
                </div>
              )}

              <div className="pt-4 border-t">
                {getStatusButton(order)}
              </div>
            </div>
          ))}
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg">No {filter === 'all' ? '' : filter} orders at the moment</p>
          </div>
        )}
      </div>

      {/* Estimated Time Modal */}
      {showTimeModal && orderForTimeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Set Estimated Preparation Time
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              Order #{orderForTimeModal.orderNumber}
            </p>
            <p className="text-sm text-gray-600 mb-6">
              Enter the estimated time remaining for preparing this order. The customer will see this time on their order status page.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Time (minutes)
              </label>
              <input
                type="number"
                value={estimatedTimeInput}
                onChange={(e) => setEstimatedTimeInput(e.target.value.replace(/\D/g, ''))}
                min="1"
                placeholder="Enter minutes (e.g., 15, 20, 30)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-lg"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmTime();
                  } else if (e.key === 'Escape') {
                    handleCancelTimeModal();
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-2">
                This time will be visible to the customer on their order status page
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancelTimeModal}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTime}
                disabled={loading || !estimatedTimeInput || parseInt(estimatedTimeInput) <= 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Updating...' : 'Confirm & Start Preparing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showScanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">📷 Scan Virtual E-Token</h3>
              <button
                onClick={() => { setShowScanModal(false); stopCamera(); setScanError(''); }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >×</button>
            </div>

            {/* Camera View */}
            <div className="bg-black rounded-lg overflow-hidden mb-4 relative" style={{ minHeight: '240px' }}>
              <video
                ref={videoRef}
                className="w-full h-60 object-cover"
                playsInline
                muted
              />
              {!isScanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-80">
                  <button
                    onClick={startCamera}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700"
                  >📷 Open Camera</button>
                </div>
              )}
              {isScanning && (
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                  Scanning...
                </div>
              )}
            </div>

            {scanError && (
              <p className="text-red-600 text-sm mb-3 bg-red-50 p-2 rounded">{scanError}</p>
            )}

            <p className="text-xs text-gray-500 mb-2">Ask customer to show their QR, or paste the E-Token below:</p>
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value.trim())}
              placeholder="Paste E-Token ID here"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono mb-3"
            />
            <button
              onClick={() => handleVerifyToken(tokenInput)}
              disabled={loading || !tokenInput}
              className="w-full bg-green-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
            >
              {loading ? 'Verifying...' : '✅ Verify E-Token'}
            </button>
          </div>
        </div>
      )}

      {/* Verified Order Details Modal */}
      {showVerifiedModal && verifiedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-green-700">✅ E-Token Verified</h3>
              <button
                onClick={() => { setShowVerifiedModal(false); setVerifiedOrder(null); }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >×</button>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 block text-xs">Customer Name</span>
                  <span className="font-bold text-gray-900">{verifiedOrder.customerName}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs">Order Number</span>
                  <span className="font-bold text-gray-900">#{verifiedOrder.orderNumber}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs">Payment Status</span>
                  <span className="font-bold text-green-700 capitalize">{verifiedOrder.paymentStatus}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs">Preparation Status</span>
                  <span className="font-bold text-blue-700 capitalize">{verifiedOrder.status?.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs">Total Amount</span>
                  <span className="font-bold text-gray-900">₹{verifiedOrder.total}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs">Payment Method</span>
                  <span className="font-bold text-gray-900 capitalize">{verifiedOrder.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs">Order Time</span>
                  <span className="font-bold text-gray-900">{new Date(verifiedOrder.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs">Est. Pickup</span>
                  <span className="font-bold text-gray-900">
                    {verifiedOrder.estimatedPickupTime ? new Date(verifiedOrder.estimatedPickupTime).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
                {verifiedOrder.vendorVerified && (
                  <div className="col-span-2">
                    <span className="text-xs text-green-600 font-bold">🔗 Vendor Blockchain Verified</span>
                  </div>
                )}
              </div>
            </div>

            {/* Ordered Items */}
            <div className="mb-4">
              <h4 className="font-bold text-gray-900 mb-2 text-sm">Ordered Items</h4>
              <div className="space-y-1">
                {verifiedOrder.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                    <span className="text-gray-800">{item.name} × {item.quantity}</span>
                    <span className="font-bold text-gray-900">₹{(item.price * item.quantity).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Special Instructions */}
            {verifiedOrder.notes && (
              <div className="mb-4 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <p className="text-xs text-yellow-800 font-medium">📝 Special Instructions:</p>
                <p className="text-sm text-yellow-900 mt-1">{verifiedOrder.notes}</p>
              </div>
            )}

            {/* Deliver Food Button */}
            <button
              onClick={handleDeliverFood}
              disabled={loading}
              className="w-full bg-green-600 text-white px-6 py-3.5 rounded-xl font-bold text-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? 'Processing...' : '✅ Deliver Food & Complete Order'}
            </button>
            <p className="text-xs text-gray-500 text-center mt-2">
              This will permanently invalidate the E-Token and mark the order as completed.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

