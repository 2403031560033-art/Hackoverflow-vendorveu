import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminDeleteCustomer, adminDeleteVendor, adminGetCustomers, adminGetVendors, getImageUrl, uploadAdminQRCode, getAdminQRCode, adminGetCustomerWallet, adminUpdateCustomerWallet } from '../../utils/api';
import AdminSupport from './AdminSupport';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');
  const adminUsername = localStorage.getItem('adminUsername') || 'Admin';

  const [tab, setTab] = useState('vendors'); // vendors | customers | support | settings | wallet
  const [vendors, setVendors] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [adminQRCode, setAdminQRCode] = useState(null);
  const [uploadingQR, setUploadingQR] = useState(false);
  const [walletPhone, setWalletPhone] = useState('');
  const [walletData, setWalletData] = useState(null);
  const [walletAmount, setWalletAmount] = useState('');
  const [walletDescription, setWalletDescription] = useState('');
  const [updatingWallet, setUpdatingWallet] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [vRes, cRes, qrRes] = await Promise.all([
        adminGetVendors(token),
        adminGetCustomers(token),
        getAdminQRCode(token).catch(() => ({ data: { qrCode: null } }))
      ]);
      setVendors(vRes.data);
      setCustomers(cRes.data);
      setAdminQRCode(qrRes.data.qrCode);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to load admin data');
      if (err.response?.status === 401) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUsername');
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQRUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploadingQR(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await uploadAdminQRCode(token, formData);
      setAdminQRCode(response.data.qrCode);
      alert('QR Code uploaded successfully!');
      e.target.value = '';
    } catch (error) {
      console.error('Error uploading QR code:', error);
      alert(error.response?.data?.error || 'Failed to upload QR code. Please try again.');
    } finally {
      setUploadingQR(false);
    }
  };

  const handleFetchWallet = async () => {
    if (!walletPhone || walletPhone.length !== 10) {
      alert('Please enter a valid 10-digit phone number');
      return;
    }

    try {
      const response = await adminGetCustomerWallet(token, walletPhone);
      setWalletData(response.data);
    } catch (error) {
      console.error('Error fetching wallet:', error);
      alert(error.response?.data?.error || 'Failed to fetch wallet. Customer may not exist.');
      setWalletData(null);
    }
  };

  const handleUpdateWallet = async () => {
    if (!walletAmount || parseFloat(walletAmount) === 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!walletPhone || walletPhone.length !== 10) {
      alert('Please enter a valid 10-digit phone number');
      return;
    }

    setUpdatingWallet(true);
    try {
      const amount = parseFloat(walletAmount);
      await adminUpdateCustomerWallet(token, walletPhone, amount, walletDescription);
      alert('Wallet updated successfully!');
      setWalletAmount('');
      setWalletDescription('');
      await handleFetchWallet();
    } catch (error) {
      console.error('Error updating wallet:', error);
      alert(error.response?.data?.error || 'Failed to update wallet. Please try again.');
    } finally {
      setUpdatingWallet(false);
    }
  };

  const filteredVendors = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return vendors;
    return vendors.filter(v =>
      (v.name || '').toLowerCase().includes(query) ||
      (v.phone || '').toLowerCase().includes(query) ||
      (v.category || '').toLowerCase().includes(query) ||
      (v.serviceType || '').toLowerCase().includes(query)
    );
  }, [vendors, q]);

  const filteredCustomers = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter(c =>
      (c.name || '').toLowerCase().includes(query) ||
      (c.phone || '').toLowerCase().includes(query)
    );
  }, [customers, q]);

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    navigate('/admin/login');
  };

  const handleDeleteVendor = async (id) => {
    if (!confirm('Delete this vendor? Orders will be kept.')) return;
    try {
      await adminDeleteVendor(token, id);
      await fetchAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete vendor');
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!confirm('Delete this customer? Orders will be kept.')) return;
    try {
      await adminDeleteCustomer(token, id);
      await fetchAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete customer');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading admin panel…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/" className="text-orange-600 hover:underline">← Home</Link>
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-xs text-gray-500">Signed in as {adminUsername}</p>
          </div>
          <button onClick={logout} className="text-red-600 hover:text-red-700 font-medium">
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('vendors')}
              className={`px-4 py-2 rounded-lg font-medium ${tab === 'vendors' ? 'bg-orange-600 text-white' : 'bg-white text-gray-700 border'}`}
            >
              Vendors ({vendors.length})
            </button>
            <button
              onClick={() => setTab('customers')}
              className={`px-4 py-2 rounded-lg font-medium ${tab === 'customers' ? 'bg-orange-600 text-white' : 'bg-white text-gray-700 border'}`}
            >
              Customers ({customers.length})
            </button>
            <button
              onClick={() => setTab('support')}
              className={`px-4 py-2 rounded-lg font-medium ${tab === 'support' ? 'bg-orange-600 text-white' : 'bg-white text-gray-700 border'}`}
            >
              Support
            </button>
            <button
              onClick={() => setTab('settings')}
              className={`px-4 py-2 rounded-lg font-medium ${tab === 'settings' ? 'bg-orange-600 text-white' : 'bg-white text-gray-700 border'}`}
            >
              Settings
            </button>
            <button
              onClick={() => setTab('wallet')}
              className={`px-4 py-2 rounded-lg font-medium ${tab === 'wallet' ? 'bg-orange-600 text-white' : 'bg-white text-gray-700 border'}`}
            >
              Wallet Management
            </button>
          </div>

          {tab !== 'support' && (
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-transparent"
              placeholder={tab === 'vendors' ? 'Search vendors by name/phone/category…' : 'Search customers by name/phone…'}
            />
          )}
        </div>

        {tab === 'support' ? (
          <AdminSupport />
        ) : tab === 'settings' ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin QR Code Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wallet Top-up QR Code
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-32 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center border-2 border-green-300">
                    {adminQRCode ? (
                      <img
                        src={getImageUrl(adminQRCode) || adminQRCode}
                        alt="Admin QR Code"
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
                      onChange={handleQRUpload}
                      disabled={uploadingQR}
                      className="hidden"
                      id="admin-qr-upload"
                    />
                    <label
                      htmlFor="admin-qr-upload"
                      className={`inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors ${uploadingQR ? 'opacity-50' : ''}`}
                    >
                      {uploadingQR ? 'Uploading...' : 'Upload QR Code'}
                    </label>
                    <p className="text-xs text-gray-500 mt-1">Max 5MB, JPG/PNG/WEBP</p>
                    <p className="text-sm text-gray-600 mt-2">
                      Customers will see this QR code in their wallet page to add money
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : tab === 'wallet' ? (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Customer Wallet Management</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Customer by Phone
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="tel"
                      value={walletPhone}
                      onChange={(e) => setWalletPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600"
                      placeholder="10-digit phone number"
                      maxLength="10"
                    />
                    <button
                      onClick={handleFetchWallet}
                      className="px-6 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700"
                    >
                      Search
                    </button>
                  </div>
                </div>

                {walletData && (
                  <div className="mt-6 space-y-4">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-green-800 mb-1">Customer: {walletData.name || 'N/A'}</p>
                      <p className="text-sm text-green-800 mb-1">Phone: {walletData.phone}</p>
                      <p className="text-lg font-bold text-green-900">Current Balance: ₹{walletData.balance.toFixed(2)}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Add/Subtract Money
                      </label>
                      <div className="space-y-3">
                        <input
                          type="number"
                          value={walletAmount}
                          onChange={(e) => setWalletAmount(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600"
                          placeholder="Amount (positive to add, negative to subtract)"
                          step="0.01"
                        />
                        <input
                          type="text"
                          value={walletDescription}
                          onChange={(e) => setWalletDescription(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600"
                          placeholder="Description (optional)"
                        />
                        <button
                          onClick={handleUpdateWallet}
                          disabled={updatingWallet || !walletAmount}
                          className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          {updatingWallet ? 'Updating...' : 'Update Wallet'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Transaction History</h3>
                      {walletData.transactions && walletData.transactions.length > 0 ? (
                        <div className="space-y-2">
                          {walletData.transactions.map((transaction, index) => (
                            <div
                              key={index}
                              className="flex justify-between items-center p-3 border-b last:border-b-0 bg-gray-50 rounded"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">
                                  {transaction.type === 'credit' ? '💰 Added' : '💸 Deducted'}
                                </p>
                                <p className="text-sm text-gray-600">{transaction.description || 'Transaction'}</p>
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
                      ) : (
                        <p className="text-gray-500 text-center py-4">No transactions yet</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : tab === 'vendors' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVendors.map(v => (
              <div key={v._id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="h-40 bg-gray-200 flex items-center justify-center">
                  {v.image && v.image !== '/images/vendor-placeholder.jpg' ? (
                    <img src={getImageUrl(v.image) || v.image} alt={v.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-gray-400 text-4xl">🏪</span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{v.name}</h3>
                      <p className="text-sm text-gray-600">{v.phone}</p>
                      <p className="text-xs text-gray-500 capitalize">
                        <span className="inline-block px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded text-xs font-medium mr-1">
                          {v.serviceType || 'food'}
                        </span>
                        {v.category}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${v.isOpen ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                      {v.isOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleDeleteVendor(v._id)}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                    >
                      Remove Vendor
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Orders will be kept (no cascading deletes).
                  </p>
                </div>
              </div>
            ))}
            {filteredVendors.length === 0 && (
              <div className="col-span-full text-center text-gray-500">No vendors found.</div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3">Name</th>
                    <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3">Phone</th>
                    <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3">Created</th>
                    <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map(c => (
                    <tr key={c._id} className="border-t">
                      <td className="px-4 py-3 text-sm text-gray-900">{c.name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{c.phone}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {c.createdAt ? new Date(c.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteCustomer(c._id)}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <tr className="border-t">
                      <td colSpan="4" className="px-4 py-6 text-center text-gray-500">
                        No customers found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

