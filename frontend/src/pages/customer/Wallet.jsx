import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCustomerWallet, addToWallet, getPublicAdminQRCode, getImageUrl } from '../../utils/api';

export default function Wallet() {
  const [phone, setPhone] = useState('');
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [adminQRCode, setAdminQRCode] = useState(null);
  const [showQRPayment, setShowQRPayment] = useState(false);
  const [transactionId, setTransactionId] = useState('');

  useEffect(() => {
    const savedPhone = localStorage.getItem('customerPhone');
    if (savedPhone) {
      setPhone(savedPhone);
      fetchWallet(savedPhone);
    }
    fetchAdminQR();
  }, []);

  const fetchAdminQR = async () => {
    try {
      const response = await getPublicAdminQRCode();
      if (response.data.qrCode) {
        setAdminQRCode(response.data.qrCode);
      }
    } catch (error) {
      console.error('Error fetching admin QR code:', error);
    }
  };

  const fetchWallet = async (phoneNumber) => {
    try {
      const response = await getCustomerWallet(phoneNumber);
      setBalance(response.data.balance || 0);
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
  };

  const handleAddMoney = async (addAmount, txId = null) => {
    if (!phone || phone.length !== 10) {
      alert('Please enter a valid 10-digit phone number');
      return;
    }

    if (!addAmount || addAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const response = await addToWallet(phone, addAmount, txId);
      setBalance(response.data.balance);
      await fetchWallet(phone); // Refresh transactions
      setAmount('');
      setTransactionId('');
      setShowQRPayment(false);
      alert(response.data.message || 'Money added successfully!');
    } catch (error) {
      console.error('Error adding money:', error);
      alert('Failed to add money. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQRPayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!transactionId || transactionId.trim() === '') {
      alert('Please enter your transaction ID from the UPI payment');
      return;
    }

    await handleAddMoney(parseFloat(amount), transactionId.trim());
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/customer" className="text-orange-600 hover:underline">← Back</Link>
          <h1 className="text-xl font-bold text-gray-900">My Wallet</h1>
          <div></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Phone Input / Wallet Balance */}
        {!phone || phone.length !== 10 ? (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Enter Phone Number</h2>
            <div className="flex gap-4">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600"
                placeholder="10-digit phone number"
                maxLength="10"
              />
              <button
                onClick={() => {
                  if (phone.length === 10) {
                    localStorage.setItem('customerPhone', phone);
                    fetchWallet(phone);
                  }
                }}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-orange-700"
              >
                Load Wallet
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Balance Display */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg shadow-lg p-8 text-white mb-6">
              <div className="text-center">
                <p className="text-green-100 mb-2">Wallet Balance</p>
                <h2 className="text-5xl font-bold mb-4">₹{balance.toFixed(2)}</h2>
                {balance < 50 && (
                  <p className="text-yellow-200 text-sm">Low balance warning</p>
                )}
              </div>
            </div>

            {/* Admin QR Code Section */}
            {adminQRCode && (
              <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg shadow-lg p-6 mb-6 border-2 border-blue-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">💳 Add Money via QR Code</h2>
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="flex-shrink-0">
                    <div className="w-48 h-48 bg-white rounded-lg p-2 border-2 border-blue-600 flex items-center justify-center">
                      <img
                        src={getImageUrl(adminQRCode) || adminQRCode}
                        alt="Admin QR Code"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700 mb-4">
                      Scan this QR code with any UPI app (Google Pay, PhonePe, Paytm, etc.) to add money to your wallet.
                    </p>
                    <button
                      onClick={() => setShowQRPayment(true)}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
                    >
                      Pay via QR Code
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* QR Payment Modal */}
            {showQRPayment && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-2 border-green-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Complete Payment</h2>
                  <button
                    onClick={() => {
                      setShowQRPayment(false);
                      setAmount('');
                      setTransactionId('');
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount Paid
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600"
                      placeholder="Enter amount"
                      min="1"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transaction ID *
                    </label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600"
                      placeholder="Enter transaction ID from UPI app"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      You can find this in your UPI app after payment
                    </p>
                  </div>
                  <button
                    onClick={handleQRPayment}
                    disabled={loading || !amount || !transactionId}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Processing...' : 'Confirm Payment'}
                  </button>
                </div>
              </div>
            )}

            {/* Transaction History */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Transaction History</h2>
              {transactions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No transactions yet</p>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-3 border-b last:border-b-0"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {transaction.type === 'credit' ? '💰 Added' : '💸 Spent'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {transaction.description || `Wallet ${transaction.type}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(transaction.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className={`font-semibold ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

