import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getVendorById } from '../../utils/api';
import {
  getCart,
  updateCartItemQuantity,
  removeFromCart,
  getCartTotal,
  clearCart
} from '../../utils/cart';

export default function Cart() {
  const [cart, setCart] = useState([]);
  const [vendor, setVendor] = useState(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadCart();
  }, []);

  useEffect(() => {
    if (cart.length > 0) {
      fetchVendor(cart[0].vendorId);
      setTotal(getCartTotal());
    }
  }, [cart]);

  const loadCart = () => {
    const cartItems = getCart();
    setCart(cartItems);
  };

  const fetchVendor = async (vendorId) => {
    try {
      const response = await getVendorById(vendorId);
      setVendor(response.data);
    } catch (error) {
      console.error('Error fetching vendor:', error);
    }
  };

  const handleQuantityChange = (menuItemId, newQuantity) => {
    const updatedCart = updateCartItemQuantity(menuItemId, newQuantity);
    setCart(updatedCart);
    setTotal(getCartTotal());
  };

  const handleRemove = (menuItemId) => {
    const updatedCart = removeFromCart(menuItemId);
    setCart(updatedCart);
    setTotal(getCartTotal());
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">Your cart is empty</p>
          <Link
            to="/customer"
            className="inline-block bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700"
          >
            Browse Vendors
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/customer" className="text-orange-600 hover:underline">← Back</Link>
          <h1 className="text-xl font-bold text-gray-900">Shopping Cart</h1>
          <div></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {vendor && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{vendor.name}</h2>
            <p className="text-gray-600 capitalize">{vendor.category}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          {cart.map(item => (
            <div key={item.menuItemId} className="flex gap-4 pb-6 mb-6 border-b last:border-b-0">
              <div className="h-24 w-24 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                {item.image && item.image !== '/images/menu-placeholder.jpg' ? (
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover rounded-lg" />
                ) : (
                  <span className="text-gray-400 text-2xl">🍽️</span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.name}</h3>
                <p className="text-orange-600 font-bold mb-2">₹{item.price}</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 border rounded-lg">
                    <button
                      onClick={() => handleQuantityChange(item.menuItemId, item.quantity - 1)}
                      className="px-3 py-1 hover:bg-gray-100"
                    >
                      -
                    </button>
                    <span className="px-3 py-1">{item.quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(item.menuItemId, item.quantity + 1)}
                      className="px-3 py-1 hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemove(item.menuItemId)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">₹{item.price * item.quantity}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-600">Subtotal</span>
            <span className="text-xl font-bold text-gray-900">₹{total}</span>
          </div>
          <Link
            to="/checkout"
            className="block w-full bg-orange-600 text-white text-center py-4 px-6 rounded-lg font-semibold text-lg hover:bg-orange-700 transition-colors"
          >
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}

