import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOrderById, submitRating } from '../../utils/api';

export default function OrderStatus() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [showRatingForm, setShowRatingForm] = useState(false);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [id]);

  const fetchOrder = async () => {
    try {
      const response = await getOrderById(id);
      setOrder(response.data);
      if (response.data.status === 'completed' && !response.data.rating) {
        setShowRatingForm(true);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching order:', error);
      setLoading(false);
    }
  };

  const handleSubmitRating = async () => {
    if (rating < 1 || rating > 5) {
      alert('Please select a rating between 1 and 5 stars');
      return;
    }

    setSubmittingRating(true);
    try {
      await submitRating(id, rating, ratingComment);
      setShowRatingForm(false);
      await fetchOrder(); // Refresh order data
      alert('Thank you for your rating!');
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert(error.response?.data?.error || 'Failed to submit rating. Please try again.');
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading order status...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">Order not found</p>
          <Link to="/customer" className="text-orange-600 hover:underline">
            Back to Vendors
          </Link>
        </div>
      </div>
    );
  }

  const statusSteps = [
    { key: 'pending', label: 'Order Received', icon: '📋' },
    { key: 'preparing', label: 'Preparing', icon: '👨‍🍳' },
    { key: 'ready', label: 'Ready for Pickup', icon: '✅' },
    { key: 'completed', label: 'Completed', icon: '🎉' }
  ];

  const currentStepIndex = statusSteps.findIndex(step => step.key === order.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/customer" className="text-orange-600 hover:underline">← Back</Link>
          <h1 className="text-xl font-bold text-gray-900">Order Status</h1>
          <div></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* E-Token Digital Pass Card */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-red-600 rounded-2xl shadow-xl p-6 text-white mb-6 border-2 border-amber-300">
          <div className="flex justify-between items-center border-b border-orange-400/50 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎟️</span>
              <span className="font-bold text-sm tracking-wider uppercase">VendorVue Official E-Token</span>
            </div>
            <span className="bg-white text-orange-700 text-xs font-black px-3 py-1 rounded-full uppercase shadow">
              {order.paymentStatus === 'paid' ? '✅ Paid & Verified' : 'Online Paid'}
            </span>
          </div>

          <div className="text-center my-2">
            <h2 className="text-4xl font-extrabold mb-1">Order #{order.orderNumber}</h2>
            <p className="text-orange-100 text-xs tracking-wider uppercase mb-4">Digital Pickup Pass & Proof of Payment</p>

            <div className="bg-white rounded-xl p-5 max-w-md mx-auto shadow-inner text-gray-900 border border-gray-200">
              <div className="text-xs text-gray-500 uppercase font-bold mb-2">E-Token ID</div>
              <div className="font-mono text-sm font-bold text-orange-700 bg-orange-50 border border-orange-200 p-3 rounded-lg break-all select-all shadow-inner">
                {order.pickupToken || `ETOKEN-ORD#${order.orderNumber}-PAID₹${order.total}`}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-left bg-gray-50 p-3 rounded-lg border text-xs">
                <div>
                  <span className="text-gray-500 block">Total Amount:</span>
                  <span className="font-bold text-gray-900 text-sm">₹{order.total}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Payment Method:</span>
                  <span className="font-bold text-green-700 capitalize text-sm">{order.paymentMethod || 'Razorpay / UPI'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Pickup OTP:</span>
                  <span className="font-bold text-orange-600 font-mono text-sm">{order.otp}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Items Count:</span>
                  <span className="font-bold text-gray-900 text-sm">{order.items?.length || 0} Items</span>
                </div>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(order.pickupToken || `ETOKEN-ORD#${order.orderNumber}`);
                  alert('E-Token copied to clipboard!');
                }}
                className="mt-4 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 px-4 rounded-lg w-full transition-colors flex items-center justify-center gap-2 text-sm shadow"
              >
                📋 Copy E-Token Details
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-orange-100 mt-3">
            Present this E-Token or OTP at counter for instant verification & order collection.
          </p>
        </div>

        {/* Status Timeline */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Order Status</h3>
          <div className="space-y-4">
            {statusSteps.map((step, index) => {
              const isActive = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              
              return (
                <div key={step.key} className="flex items-center gap-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                    isActive ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-400'
                  }`}>
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                    {isCurrent && (
                      <p className="text-sm text-orange-600 mt-1">
                        {order.status === 'pending' && 'Vendor received your order'}
                        {order.status === 'preparing' && 'Your order is being prepared'}
                        {order.status === 'ready' && 'Order ready for pickup!'}
                        {order.status === 'completed' && 'Order collected'}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Vendor Contact */}
        {order.vendorId && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor Contact</h3>
            <div className="space-y-2">
              <p className="text-gray-700">
                <span className="font-medium">Vendor:</span> {order.vendorId.name}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Phone:</span>{' '}
                <a
                  href={`tel:+91${order.vendorId.phone}`}
                  className="text-orange-600 hover:underline"
                >
                  {order.vendorId.phone}
                </a>
              </p>
              <p className="text-gray-600 text-sm">
                {order.vendorId.location?.address || 'Parul University'}
              </p>
            </div>
          </div>
        )}

        {/* Order Details */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h3>
          <div className="space-y-2 mb-4">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between py-2 border-b last:border-b-0">
                <span className="text-gray-700">
                  {item.name} × {item.quantity}
                </span>
                <span className="text-gray-900 font-medium">₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 pt-4 border-t">
            <span className="text-lg font-semibold text-gray-900">Total</span>
            <span className="text-xl font-bold text-orange-600">₹{order.total}</span>
          </div>
          
          {(order.paymentMethod === 'wallet-cash' || order.walletAmount > 0) && (
            <div className="mt-4 p-3 bg-orange-50 rounded-lg">
              <p className="text-sm text-orange-800">
                Payment: ₹{order.walletAmount.toFixed(2)} wallet + ₹{order.cashAmount.toFixed(2)} cash
              </p>
            </div>
          )}
          
          {order.notes && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Special Instructions:</span> {order.notes}
              </p>
            </div>
          )}
        </div>

        {/* Estimated Pickup Time */}
        {order.status !== 'completed' && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            {order.estimatedPickupTime ? (
              <>
                <p className="text-sm text-blue-800 font-medium">
                  🕐 Estimated pickup: around {new Date(order.estimatedPickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(new Date(order.estimatedPickupTime).getTime() + 5 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  This is an estimate based on current queue size (online + walk-in orders)
                </p>
              </>
            ) : (
              <p className="text-sm text-blue-800">
                Estimated preparation time: ~{order.estimatedTime} minutes
              </p>
            )}
          </div>
        )}

        {/* Rating Form */}
        {order.status === 'completed' && showRatingForm && !order.rating && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rate Your Experience</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating *
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-3xl ${rating >= star ? 'text-yellow-500' : 'text-gray-300'} hover:text-yellow-400 transition-colors`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-gray-600 mt-2">{rating} out of 5 stars</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comment (Optional)
                </label>
                <textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                  placeholder="Share your experience..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSubmitRating}
                  disabled={submittingRating || rating < 1}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {submittingRating ? 'Submitting...' : 'Submit Rating'}
                </button>
                <button
                  onClick={() => setShowRatingForm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Show Rating if Already Rated */}
        {order.status === 'completed' && order.rating && (
          <div className="bg-green-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Rating</h3>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map(star => (
                  <span key={star} className={`text-2xl ${order.rating >= star ? 'text-yellow-500' : 'text-gray-300'}`}>
                    ⭐
                  </span>
                ))}
              </div>
              <span className="text-gray-700 font-medium">{order.rating} / 5</span>
            </div>
            {order.ratingComment && (
              <p className="text-gray-700 mt-2">{order.ratingComment}</p>
            )}
          </div>
        )}

        {/* Back to Vendors */}
        <Link
          to="/customer"
          className="block w-full text-center bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-300 transition-colors"
        >
          Browse More Vendors
        </Link>
      </div>
    </div>
  );
}

