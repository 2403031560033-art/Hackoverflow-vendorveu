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
        {/* Order Number & OTP */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg shadow-lg p-8 text-white mb-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2">Order #{order.orderNumber}</h2>
            <p className="text-orange-100 mb-4">Your OTP for pickup:</p>
            <div className="text-6xl font-bold mb-2">{order.otp}</div>
            <p className="text-sm text-orange-100">Show this OTP to the vendor</p>
          </div>
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

        {/* Estimated Time */}
        {order.status !== 'completed' && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              Estimated preparation time: ~{order.estimatedTime} minutes
            </p>
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

