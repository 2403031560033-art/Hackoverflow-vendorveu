# VendorVue - Hyperlocal Vendor Discovery Platform

VendorVue is a mobile-first web application that connects customers with nearby hyperlocal vendors through location-based discovery, digital menus, advance ordering, and OTP-based secure pickup.

## 🎯 Product Overview

VendorVue enables vendors to go digital in under 5 minutes with zero upfront cost, while giving customers the power to discover, order, and track from nearby vendors through a single unified platform.

### Key Features

- **Sequential Order Numbers**: Simple #1, #2, #3 system for easy order collection
- **Distance Filter Slider**: Filter vendors by distance (0.5km - 5km)
- **Integrated Wallet System**: Store balance, split payments (wallet + cash)
- **OTP-Based Pickup**: 4-digit OTP system for secure order collection
- **Real-Time Status Updates**: Track orders from pending → preparing → ready → completed
- **Click-to-Call**: Direct communication between customers and vendors
- **Zero Commission Cash**: No fees on cash transactions

## 🏗️ Tech Stack

### Frontend
- React 18.x + Vite
- Tailwind CSS 3.x
- React Router v6
- Leaflet.js + React-Leaflet (Maps)
- Axios (HTTP Client)

### Backend
- Node.js 18.x
- Express.js 4.x
- MongoDB 6.x with Mongoose 7.x
- CORS enabled

### DevOps
- Frontend: Vercel (recommended)
- Backend: Render (recommended)
- Database: MongoDB Atlas (M0 cluster)

## 📦 Installation & Setup

### Prerequisites
- Node.js 18.x or higher
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

```bash
cd vendorvue/backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/vendorvue
# Or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/vendorvue
NODE_ENV=development
```

Start the backend server:

```bash
npm run dev
# Or for production:
npm start
```

The backend will run on `http://localhost:5000`

### Frontend Setup

```bash
cd vendorvue/frontend
npm install
```

Create a `.env` file in the `frontend` directory (optional):

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend development server:

```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## 🗄️ Database Schema

### Vendor Collection
- name, phone, category
- location: {lat, lng, address}
- isOpen, rating, totalOrders

### MenuItem Collection
- vendorId, name, description, price
- category, inStock, preparationTime

### Order Collection
- orderNumber (auto-increment)
- vendorId, customerName, customerPhone
- items[], total, paymentMethod
- walletAmount, cashAmount
- otp (4-digit), status
- estimatedTime, notes

### Customer/Wallet Collection
- phone, name
- walletBalance
- transactions[] (credit/debit history)

## 🚀 API Endpoints

### Vendor APIs
- `POST /api/vendors/register` - Register new vendor
- `POST /api/vendors/login` - Login vendor
- `GET /api/vendors` - Get all active vendors
- `GET /api/vendors/:id` - Get single vendor
- `GET /api/vendors/:id/menu` - Get vendor menu
- `PATCH /api/vendors/:id/toggle` - Toggle open/closed status

### Menu APIs
- `POST /api/menu` - Add menu item
- `GET /api/menu/vendor/:vendorId` - Get vendor's menu
- `PATCH /api/menu/:id` - Update menu item
- `PATCH /api/menu/:id/toggle-stock` - Toggle stock status
- `DELETE /api/menu/:id` - Delete menu item

### Order APIs
- `POST /api/orders` - Create new order (returns orderNumber)
- `GET /api/orders/:id` - Get order details
- `GET /api/orders/number/:orderNumber` - Get order by number
- `GET /api/orders/vendor/:vendorId` - Get vendor orders
- `GET /api/orders/vendor/:vendorId/stats` - Get vendor statistics
- `PATCH /api/orders/:id/status` - Update order status
- `POST /api/orders/:id/verify` - Verify OTP

### Customer/Wallet APIs
- `GET /api/customers/:phone` - Get customer profile
- `GET /api/customers/:phone/wallet` - Get wallet balance & transactions
- `POST /api/customers/:phone/wallet/add` - Add money to wallet
- `GET /api/customers/:phone/orders` - Get customer order history

## 📱 User Flows

### Customer Flow
1. Landing Page → Order as Customer
2. Vendor Discovery (with distance slider)
3. Select Vendor → View Menu
4. Add Items to Cart
5. Checkout (enter details, choose payment)
6. Order Status Tracking (real-time updates)
7. Pickup with OTP verification

### Vendor Flow
1. Vendor Login/Register
2. Dashboard (stats overview)
3. Menu Management (add/edit items)
4. Order Management (view & update status)
5. Verify OTP when order is ready

## 🎨 Features Implementation

### Distance Filter
- Haversine formula for distance calculation
- Real-time vendor filtering based on slider value
- Distance displayed on vendor cards
- Preference saved in localStorage

### Wallet System
- Add money to wallet (quick amounts: ₹50, ₹100, ₹200, ₹500)
- Custom amount input
- Bonus ₹10 on top-ups ≥ ₹100
- Transaction history
- Split payments (wallet + cash)

### Order Management
- Auto-incrementing sequential order numbers (#1, #2, #3...)
- Status updates: pending → preparing → ready → completed
- Audio alerts for new orders (vendor side)
- OTP verification at pickup
- Real-time polling every 10 seconds

## 🔒 Security Features

- Input validation and sanitization
- OTP-based order verification
- Phone number validation (10-digit)
- CORS enabled for cross-origin requests
- HTTPS recommended for production

## 📝 Development Notes

- Frontend uses localStorage for cart persistence
- Vendor authentication stored in localStorage (demo mode)
- Order status polling: 10 seconds (customer), 30 seconds (vendor stats)
- Default location: Parul University (22.2587°N, 73.3570°E)
- Leaflet maps require OpenStreetMap tiles

## 🚢 Deployment

### Backend (Render)
1. Connect GitHub repository
2. Set build command: `cd backend && npm install`
3. Set start command: `cd backend && npm start`
4. Add environment variables (PORT, MONGODB_URI)

### Frontend (Vercel)
1. Connect GitHub repository
2. Set root directory: `frontend`
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Add environment variable: `VITE_API_URL` (backend URL)

## 📄 License

ISC

## 👥 Team

**Product Owner:** Yash Ashok Goti  
**Team:** CORELOOP  
**Institution:** Parul University

## 📚 Documentation

For detailed product requirements, see `vendorvue_prd.md` (if available in project root).

---

**Version:** 1.0.0  
**Status:** MVP Ready for Hackathon

