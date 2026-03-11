import axios from 'axios';

// Use environment variable for production, localhost for development
const API_URL = import.meta.env.VITE_API_URL || 'https://hackoverflow-vendorveu.onrender.com/api';
const BASE_URL = API_URL.replace('/api', '');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

const adminApi = axios.create({
  baseURL: `${API_URL}/admin`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Helper function to get full image URL
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  if (imagePath.startsWith('/uploads')) {
    return `${BASE_URL}${imagePath}`;
  }
  return imagePath;
};

// Vendor APIs
export const getVendors = (serviceType) => {
  const params = serviceType && serviceType !== 'all' ? `?serviceType=${serviceType}` : '';
  return api.get(`/vendors${params}`);
};
export const getVendorById = (id) => api.get(`/vendors/${id}`);
export const getVendorMenu = (id) => api.get(`/vendors/${id}/menu`);
export const registerVendor = (data) => api.post('/vendors/register', data);
export const loginVendor = (phone, password) => api.post('/vendors/login', { phone, password });

// Menu APIs
export const getMenuItems = (vendorId) => api.get(`/menu/vendor/${vendorId}`);
export const addMenuItem = (data) => api.post('/menu', data);
export const toggleStock = (id) => api.patch(`/menu/${id}/toggle-stock`);
export const deleteMenuItem = (id) => api.delete(`/menu/${id}`);

// Order APIs
export const createOrder = (data) => api.post('/orders', data);
export const getOrderById = (id) => api.get(`/orders/${id}`);
export const getOrderByNumber = (number) => api.get(`/orders/number/${number}`);
export const getVendorOrders = (vendorId, status) => {
  const url = `/orders/vendor/${vendorId}${status ? `?status=${status}` : ''}`;
  return api.get(url);
};
export const getVendorStats = (vendorId) => api.get(`/orders/vendor/${vendorId}/stats`);
export const updateOrderStatus = (id, status, estimatedTime) => {
  const body = { status };
  if (estimatedTime !== undefined && estimatedTime !== null) {
    body.estimatedTime = estimatedTime;
  }
  return api.patch(`/orders/${id}/status`, body);
};
export const verifyOTP = (id, otp) => api.post(`/orders/${id}/verify`, { otp });
export const submitRating = (id, rating, ratingComment) => api.post(`/orders/${id}/rating`, { rating, ratingComment });

// Customer/Wallet APIs
export const registerCustomer = (data) => api.post('/customers/register', data);
export const loginCustomer = (phone, password) => api.post('/customers/login', { phone, password });
export const getCustomerWallet = (phone) => api.get(`/customers/${phone}/wallet`);
export const addToWallet = (phone, amount, transactionId) =>
  api.post(`/customers/${phone}/wallet/add`, { amount, transactionId });
export const getCustomerOrders = (phone) => api.get(`/customers/${phone}/orders`);
export const updateCustomerLocation = (phone, location) => api.patch(`/customers/${phone}/location`, { location });
export const updateVendorLocation = (id, location) => api.patch(`/vendors/${id}/location`, { location });
export const updateVendorProfile = (id, data) => api.patch(`/vendors/${id}/profile`, data);
export const updateVendorWaitingTime = (id, waitingTime) => api.patch(`/vendors/${id}/waiting-time`, { waitingTime });
export const updateVendorIsOpen = (id, isOpen) => api.patch(`/vendors/${id}/is-open`, { isOpen });
export const uploadVendorImage = (id, formData) => api.post(`/vendors/${id}/image`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const uploadVendorQRCode = (id, formData) => api.post(`/vendors/${id}/qrcode`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const uploadMenuItemImage = (id, formData) => api.post(`/menu/${id}/image`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

// Admin APIs
export const adminLogin = (username, password) =>
  adminApi.post('/login', { username, password });

export const adminGetVendors = (token) =>
  adminApi.get('/vendors', { headers: { Authorization: `Bearer ${token}` } });

export const adminGetCustomers = (token) =>
  adminApi.get('/customers', { headers: { Authorization: `Bearer ${token}` } });

export const adminDeleteVendor = (token, id) =>
  adminApi.delete(`/vendors/${id}`, { headers: { Authorization: `Bearer ${token}` } });

export const adminDeleteCustomer = (token, id) =>
  adminApi.delete(`/customers/${id}`, { headers: { Authorization: `Bearer ${token}` } });

export const uploadAdminQRCode = (token, formData) =>
  adminApi.post('/qrcode', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${token}`
    }
  });

export const getAdminQRCode = (token) =>
  adminApi.get('/qrcode', { headers: { Authorization: `Bearer ${token}` } });

// Public endpoint for customers to get admin QR code
export const getPublicAdminQRCode = () => api.get('/admin/qrcode/public');

export const adminGetCustomerWallet = (token, phone) =>
  adminApi.get(`/customers/${phone}/wallet`, { headers: { Authorization: `Bearer ${token}` } });

export const adminUpdateCustomerWallet = (token, phone, amount, description) =>
  adminApi.patch(`/customers/${phone}/wallet`, { amount, description }, {
    headers: { Authorization: `Bearer ${token}` }
  });

// Support Message APIs
export const sendSupportMessage = (message, senderType, senderId, senderPhone) =>
  api.post('/support/message', { message, senderType, senderId, senderPhone });

export const getMySupportMessages = (senderType, senderId) =>
  api.get(`/support/messages/${senderType}/${senderId}`);

export const adminGetConversations = (token) =>
  adminApi.get('/support/conversations', { headers: { Authorization: `Bearer ${token}` } });

export const adminGetThreadMessages = (token, threadId) =>
  adminApi.get(`/support/messages/${threadId}`, { headers: { Authorization: `Bearer ${token}` } });

export const adminReplySupport = (token, threadId, message) =>
  adminApi.post('/support/reply', { threadId, message }, { headers: { Authorization: `Bearer ${token}` } });

// Utility function for Haversine distance calculation
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Google Maps directions URL helper
export const getGoogleMapsDirectionsUrl = (lat, lng, address) => {
  if (address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
};

export default api;

