import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCustomerOrders } from '../../utils/api';

export default function OrderHistory() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const customerPhone = localStorage.getItem('customerPhone');

  useEffect(() => {
    if (!customerPhone) {
      navigate('/customer/login');
      return;
    }
    fetchOrders();
  }, [customerPhone, navigate]);

  const fetchOrders = async () => {
    try {
      const response = await getCustomerOrders(customerPhone);
      setOrders(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      preparing: 'bg-blue-100 text-blue-800',
      ready: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800'
    };
    return badges[status] || badges.pending;
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      preparing: 'Preparing',
      ready: 'Ready',
      completed: 'Completed'
    };
    return labels[status] || status;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/customer" className="text-2xl font-bold text-orange-600">VendorVue</Link>
          <div className="flex gap-4 items-center">
            <Link to="/customer" className="text-gray-700 hover:text-orange-600">Home</Link>
            <Link to="/customer/orders" className="text-orange-600 font-medium">Orders</Link>
            <Link to="/customer/settings" className="text-gray-700 hover:text-orange-600">Settings</Link>
            <button
              onClick={() => {
                localStorage.removeItem('customerPhone');
                localStorage.removeItem('customerName');
                localStorage.removeItem('customerLocation');
                navigate('/');
              }}
              className="text-red-600 hover:text-red-700 font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">No orders yet</p>
            <Link
              to="/customer"
              className="text-orange-600 hover:underline font-medium"
            >
              Browse vendors →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div
                key={order._id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Order #{order.orderNumber}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {order.vendorId?.name || 'Vendor'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>

                <div className="border-t pt-4">
                  <div className="space-y-2 mb-4">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-700">
                          {item.name} × {item.quantity}
                        </span>
                        <span className="text-gray-900 font-medium">
                          ₹{item.price * item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center pt-4 border-t">
                    <div>
                      <p className="text-lg font-bold text-gray-900">
                        Total: ₹{order.total.toFixed(2)}
                      </p>
                      {order.paymentMethod && (
                        <p className="text-xs text-gray-500 mt-1">
                          Payment: {order.paymentMethod === 'cash' ? 'Cash' : 
                                   order.paymentMethod === 'wallet' ? 'Wallet' : 'Wallet + Cash'}
                        </p>
                      )}
                    </div>
                    {order.status !== 'completed' && (
                      <Link
                        to={`/order/${order._id}`}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                      >
                        Track Order
                      </Link>
                    )}
                  </div>

                  {order.status === 'ready' && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-800 font-medium">
                        🎉 Your order is ready! OTP: {order.otp}
                      </p>
                      <Link
                        to={`/order/${order._id}`}
                        className="text-sm text-green-700 hover:underline mt-1 inline-block"
                      >
                        View order details →
                      </Link>
                    </div>
                  )}

                  {order.status === 'completed' && order.rating && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-gray-700 font-medium mb-1">Your Rating:</p>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <span key={star} className={`text-lg ${order.rating >= star ? 'text-yellow-500' : 'text-gray-300'}`}>
                            ⭐
                          </span>
                        ))}
                        <span className="text-sm text-gray-600 ml-2">{order.rating} / 5</span>
                      </div>
                      {order.ratingComment && (
                        <p className="text-sm text-gray-600 mt-1">{order.ratingComment}</p>
                      )}
                    </div>
                  )}

                  {order.status === 'completed' && !order.rating && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800 font-medium mb-2">
                        Rate your experience
                      </p>
                      <Link
                        to={`/order/${order._id}`}
                        className="text-sm text-blue-700 hover:underline font-medium"
                      >
                        Rate this order →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
