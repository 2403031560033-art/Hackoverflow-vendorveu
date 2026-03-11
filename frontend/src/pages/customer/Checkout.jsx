import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrder, getCustomerWallet, getVendorById, getImageUrl } from '../../utils/api';
import { getCart, clearCart, getCartTotal } from '../../utils/cart';

export default function Checkout() {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletAmount, setWalletAmount] = useState(0);
  const [cashAmount, setCashAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [vendorQRCode, setVendorQRCode] = useState(null);
  const [vendorUPIId, setVendorUPIId] = useState(null);

  useEffect(() => {
    // Check authentication
    const phone = localStorage.getItem('customerPhone');
    if (!phone) {
      navigate('/customer/login');
      return;
    }

    const cartItems = getCart();
    if (cartItems.length === 0) {
      navigate('/customer');
      return;
    }
    setCart(cartItems);
    setTotal(getCartTotal());
    
    // Pre-fill customer data from localStorage
    setCustomerPhone(phone);
    setCustomerName(localStorage.getItem('customerName') || '');
    
    // Fetch vendor QR code
    if (cartItems.length > 0) {
      fetchVendorQR(cartItems[0].vendorId);
    }
  }, [navigate]);

  const fetchVendorQR = async (vendorId) => {
    try {
      const response = await getVendorById(vendorId);
      if (response.data.qrCode) {
        setVendorQRCode(response.data.qrCode);
      }
      if (response.data.upiId) {
        setVendorUPIId(response.data.upiId);
      }
    } catch (error) {
      console.error('Error fetching vendor payment info:', error);
    }
  };

  useEffect(() => {
    if (customerPhone && customerPhone.length === 10) {
      fetchWalletBalance();
    }
  }, [customerPhone]);

  useEffect(() => {
    updatePaymentAmounts();
  }, [paymentMethod, total, walletBalance]);

  const fetchWalletBalance = async () => {
    try {
      const response = await getCustomerWallet(customerPhone);
      setWalletBalance(response.data.balance || 0);
    } catch (error) {
      setWalletBalance(0);
    }
  };

  const updatePaymentAmounts = () => {
    if (paymentMethod === 'cash') {
      setWalletAmount(0);
      setCashAmount(total);
    } else if (paymentMethod === 'wallet') {
      if (walletBalance >= total) {
        setWalletAmount(total);
        setCashAmount(0);
      } else {
        setWalletAmount(walletBalance);
        setCashAmount(total - walletBalance);
      }
    } else if (paymentMethod === 'wallet-cash') {
      const walletPart = Math.min(walletBalance, total);
      setWalletAmount(walletPart);
      setCashAmount(total - walletPart);
    } else {
      setWalletAmount(0);
      setCashAmount(total);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!customerName.trim() || !customerPhone.match(/^[0-9]{10}$/)) {
      alert('Please enter valid name and 10-digit phone number');
      return;
    }

    // Validate COD payment - requires minimum ₹100 wallet balance
    if (paymentMethod === 'cash' && walletBalance < 100) {
      alert('COD payment requires minimum ₹100 wallet balance. Please add money to wallet first.');
      return;
    }

    if (paymentMethod === 'wallet' && walletBalance < total) {
      alert('Insufficient wallet balance');
      return;
    }

    // For UPI payment, show payment info and wait for manual payment
    if (paymentMethod === 'upi' && (vendorQRCode || vendorUPIId)) {
      alert('Please complete the payment using the QR code or UPI ID displayed above, then click "I have paid via UPI"');
      return;
    }

    // Create order
    await createAndPlaceOrder();
  };

  const createAndPlaceOrder = async () => {
    setLoading(true);

    try {
      const orderData = {
        vendorId: cart[0].vendorId,
        customerName: customerName.trim(),
        customerPhone,
        items: cart.map(item => ({
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          preparationTime: item.preparationTime
        })),
        total,
        paymentMethod,
        walletAmount,
        cashAmount,
        notes: notes.trim()
      };

      const response = await createOrder(orderData);
      clearCart();
      
      alert(`Order #${response.data.orderNumber} placed successfully! Your OTP: ${response.data.otp}`);
      navigate(`/order/${response.data.orderId}`);
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmUPIPayment = () => {
    if (!confirm('Have you completed the payment via UPI QR code? You will not be able to change this.')) {
      return;
    }
    createAndPlaceOrder();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Information Section - Show before order placement */}
          {(vendorQRCode || vendorUPIId) && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow-lg p-6 border-2 border-green-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                💳 Pay Online Before Placing Order
              </h2>
              <p className="text-gray-700 mb-4">
                Please complete the payment of <span className="font-bold text-lg text-orange-600">₹{total.toFixed(2)}</span> using one of the methods below, then proceed to place your order.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* QR Code Section */}
                {vendorQRCode && (
                  <div className="bg-white rounded-lg p-4 shadow-md">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      📲 Scan QR Code
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Scan this QR code with any UPI app (Google Pay, PhonePe, Paytm, etc.)
                    </p>
                    <div className="flex justify-center mb-3">
                      <img
                        src={getImageUrl(vendorQRCode) || vendorQRCode}
                        alt="Vendor UPI QR Code"
                        className="w-48 h-48 border-2 border-green-600 rounded-lg object-contain bg-white"
                      />
                    </div>
                    <p className="text-center text-sm font-medium text-gray-700">
                      Amount: ₹{total.toFixed(2)}
                    </p>
                  </div>
                )}

                {/* UPI ID Section */}
                {vendorUPIId && (
                  <div className="bg-white rounded-lg p-4 shadow-md">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      💳 Pay via UPI ID
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Enter this UPI ID in your payment app and send ₹{total.toFixed(2)}
                    </p>
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="text"
                        value={vendorUPIId}
                        readOnly
                        className="flex-1 px-4 py-3 border-2 border-green-600 rounded-lg bg-gray-50 font-mono text-lg font-semibold text-gray-900"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(vendorUPIId);
                          alert('UPI ID copied to clipboard!');
                        }}
                        className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                      >
                        📋 Copy
                      </button>
                    </div>
                    <p className="text-center text-sm font-medium text-gray-700">
                      Amount: ₹{total.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Important:</strong> Complete the payment first, then click "Place Order" below. Select "Pay via UPI QR" as your payment method.
                </p>
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
            {cart.map(item => (
              <div key={item.menuItemId} className="flex justify-between py-2 border-b last:border-b-0">
                <span className="text-gray-700">
                  {item.name} × {item.quantity}
                </span>
                <span className="text-gray-900 font-medium">₹{item.price * item.quantity}</span>
              </div>
            ))}
            <div className="flex justify-between mt-4 pt-4 border-t">
              <span className="text-lg font-semibold text-gray-900">Total</span>
              <span className="text-xl font-bold text-orange-600">₹{total}</span>
            </div>
          </div>

          {/* Customer Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Customer Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-transparent"
                  placeholder="10-digit phone number"
                  maxLength="10"
                />
              </div>
              {customerPhone.length === 10 && walletBalance > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Wallet Balance: ₹{walletBalance.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Method</h2>
            <div className="space-y-3">
              <label className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                walletBalance < 100 ? 'opacity-60 border-red-300' : ''
              }`}>
                <input
                  type="radio"
                  name="payment"
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={walletBalance < 100}
                  className="mr-3"
                />
                <div className="flex-1">
                  <span className="font-medium text-gray-900">💵 Cash on Pickup</span>
                  {walletBalance < 100 ? (
                    <p className="text-sm text-red-600 font-medium">
                      Requires minimum ₹100 wallet balance (Current: ₹{walletBalance.toFixed(2)})
                    </p>
                  ) : (
                    <p className="text-sm text-gray-600">₹{total.toFixed(2)}</p>
                  )}
                </div>
              </label>
              {walletBalance < 100 && (
                <div className="ml-8 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ COD payment requires minimum ₹100 wallet balance. Please add money to your wallet first.
                  </p>
                </div>
              )}

              {(vendorQRCode || vendorUPIId) && (
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="payment"
                    value="upi"
                    checked={paymentMethod === 'upi'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">📲 Pay via UPI</span>
                    <p className="text-sm text-gray-600">
                      {vendorQRCode && vendorUPIId 
                        ? `Scan QR or use UPI ID to pay ₹${total.toFixed(2)}`
                        : vendorQRCode 
                        ? `Scan QR to pay ₹${total.toFixed(2)}`
                        : `Use UPI ID to pay ₹${total.toFixed(2)}`}
                    </p>
                  </div>
                </label>
              )}
              
              {walletBalance > 0 && (
                <>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="payment"
                      value="wallet"
                      checked={paymentMethod === 'wallet'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      disabled={walletBalance < total}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">💰 Wallet Balance</span>
                      {walletBalance >= total ? (
                        <p className="text-sm text-gray-600">₹{total.toFixed(2)}</p>
                      ) : (
                        <p className="text-sm text-red-600">Insufficient balance (₹{walletBalance.toFixed(2)} available)</p>
                      )}
                    </div>
                  </label>
                  
                  {walletBalance < total && walletBalance > 0 && (
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="payment"
                        value="wallet-cash"
                        checked={paymentMethod === 'wallet-cash'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <span className="font-medium text-gray-900">💰 + 💵 Wallet + Cash</span>
                        <p className="text-sm text-gray-600">
                          ₹{walletAmount.toFixed(2)} wallet + ₹{cashAmount.toFixed(2)} cash
                        </p>
                      </div>
                    </label>
                  )}
                </>
              )}
            </div>
            
            {(paymentMethod === 'wallet-cash' || (paymentMethod === 'wallet' && walletBalance < total)) && (
              <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-800">
                  Paying ₹{walletAmount.toFixed(2)} from wallet + ₹{cashAmount.toFixed(2)} cash
                </p>
              </div>
            )}
          </div>

          {/* Payment Info Display for UPI (when selected) */}
          {paymentMethod === 'upi' && (vendorQRCode || vendorUPIId) && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">💳 Payment Details</h2>
              <div className={`grid ${vendorQRCode && vendorUPIId ? 'md:grid-cols-2' : ''} gap-6`}>
                {vendorQRCode && (
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">
                      Scan this QR code with any UPI app (Google Pay, PhonePe, Paytm, etc.)
                    </p>
                    <div className="flex justify-center mb-4">
                      <img
                        src={getImageUrl(vendorQRCode) || vendorQRCode}
                        alt="Vendor UPI QR Code"
                        className="w-48 h-48 border-2 border-orange-600 rounded-lg"
                      />
                    </div>
                    <p className="text-lg font-semibold text-gray-900 mb-2">
                      Amount: ₹{total.toFixed(2)}
                    </p>
                  </div>
                )}
                {vendorUPIId && (
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">
                      Enter this UPI ID in your payment app
                    </p>
                    <div className="flex items-center gap-2 mb-4">
                      <input
                        type="text"
                        value={vendorUPIId}
                        readOnly
                        className="flex-1 px-4 py-3 border-2 border-orange-600 rounded-lg bg-gray-50 font-mono text-lg font-semibold text-gray-900"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(vendorUPIId);
                          alert('UPI ID copied to clipboard!');
                        }}
                        className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors"
                      >
                        📋 Copy
                      </button>
                    </div>
                    <p className="text-lg font-semibold text-gray-900 mb-2">
                      Amount: ₹{total.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Special Instructions */}
          <div className="bg-white rounded-lg shadow p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Instructions (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-transparent"
              placeholder="Any special requests or notes..."
            />
          </div>

          {/* Place Order Button */}
          {paymentMethod === 'upi' && (vendorQRCode || vendorUPIId) ? (
            <button
              type="button"
              onClick={handleConfirmUPIPayment}
              disabled={loading}
              className="w-full bg-green-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Placing Order...' : '✅ I have paid via UPI QR'}
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Placing Order...' : 'Place Order'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

