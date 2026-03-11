import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import CustomerLogin from './pages/customer/CustomerLogin';
import VendorDiscovery from './pages/customer/VendorDiscovery';
import VendorMenu from './pages/customer/VendorMenu';
import Cart from './pages/customer/Cart';
import Checkout from './pages/customer/Checkout';
import OrderStatus from './pages/customer/OrderStatus';
import OrderHistory from './pages/customer/OrderHistory';
import CustomerSettings from './pages/customer/CustomerSettings';
import CustomerSupport from './pages/customer/CustomerSupport';
import Wallet from './pages/customer/Wallet';
import VendorLogin from './pages/vendor/VendorLogin';
import VendorDashboard from './pages/vendor/VendorDashboard';
import VendorSettings from './pages/vendor/VendorSettings';
import VendorSupport from './pages/vendor/VendorSupport';
import MenuManagement from './pages/vendor/MenuManagement';
import OrderManagement from './pages/vendor/OrderManagement';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/customer/login" element={<CustomerLogin />} />
        <Route path="/customer" element={<VendorDiscovery />} />
        <Route path="/customer/orders" element={<OrderHistory />} />
        <Route path="/customer/settings" element={<CustomerSettings />} />
        <Route path="/customer/support" element={<CustomerSupport />} />
        <Route path="/vendor/:id" element={<VendorMenu />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order/:id" element={<OrderStatus />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/vendor/login" element={<VendorLogin />} />
        <Route path="/vendor/dashboard" element={<VendorDashboard />} />
        <Route path="/vendor/settings" element={<VendorSettings />} />
        <Route path="/vendor/support" element={<VendorSupport />} />
        <Route path="/vendor/menu" element={<MenuManagement />} />
        <Route path="/vendor/orders" element={<OrderManagement />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;

