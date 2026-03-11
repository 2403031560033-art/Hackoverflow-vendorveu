import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getVendorById, getVendorMenu, getGoogleMapsDirectionsUrl, getImageUrl } from '../../utils/api';
import { addToCart, getCartItemCount } from '../../utils/cart';

export default function VendorMenu() {
  const { id } = useParams();
  const [vendor, setVendor] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    fetchVendor();
    fetchMenu();
    setCartCount(getCartItemCount());
  }, [id]);

  const fetchVendor = async () => {
    try {
      const response = await getVendorById(id);
      setVendor(response.data);
    } catch (error) {
      console.error('Error fetching vendor:', error);
    }
  };

  const fetchMenu = async () => {
    try {
      const response = await getVendorMenu(id);
      setMenuItems(response.data);
    } catch (error) {
      console.error('Error fetching menu:', error);
    }
  };

  const handleAddToCart = (item) => {
    if (!item.inStock) return;

    const result = addToCart(item, id);
    if (result.error) {
      alert(result.error);
    } else {
      setCartCount(getCartItemCount());
    }
  };

  const categories = ['all', ...new Set(menuItems.map(item => item.category))];

  const filteredItems = selectedCategory === 'all'
    ? menuItems
    : menuItems.filter(item => item.category === selectedCategory);

  if (!vendor) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/customer" className="text-orange-600 hover:underline">← Back</Link>
          <Link to="/cart" className="relative text-gray-700 hover:text-orange-600">
            Cart
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-orange-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Vendor Header */}
        <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
          <div className="h-64 bg-gray-200 flex items-center justify-center">
            {vendor.image && vendor.image !== '/images/vendor-placeholder.jpg' ? (
              <img
                src={getImageUrl(vendor.image) || vendor.image}
                alt={vendor.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-gray-400 text-6xl">🏪</span>
            )}
          </div>
          <div className="p-6">
            <div className="flex justify-between items-start mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{vendor.name}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${vendor.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                {vendor.isOpen ? 'Open' : 'Closed'}
              </span>
            </div>
            <p className="text-gray-600 capitalize mb-2">
              <span className="inline-block px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs font-medium mr-1">
                {vendor.serviceType || 'food'}
              </span>
              {vendor.category}
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center">
                <span className="text-yellow-500">⭐</span>
                <span className="text-gray-700 ml-1">{vendor.rating.toFixed(1)}</span>
              </div>
              <p className="text-gray-500 text-sm">{vendor.location.address || 'Parul University'}</p>
              {vendor.currentWaitingTime !== undefined && vendor.currentWaitingTime !== null && (
                <span className={`text-xs px-2 py-1 rounded font-medium ${vendor.currentWaitingTime === 0
                    ? 'bg-green-100 text-green-800'
                    : vendor.currentWaitingTime <= 10
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                  {vendor.currentWaitingTime === 0 ? '⏱️ No wait' : `⏱️ ${vendor.currentWaitingTime} min wait`}
                </span>
              )}
              <a
                href={getGoogleMapsDirectionsUrl(vendor.location.lat, vendor.location.lng, vendor.location.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 text-sm hover:underline font-medium"
              >
                📍 Get Directions
              </a>
            </div>
            {vendor.description && (
              <p className="text-gray-600 mt-2">{vendor.description}</p>
            )}
          </div>
        </div>

        {/* Category Filter */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${selectedCategory === cat
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <div
              key={item._id}
              className={`bg-white rounded-lg shadow overflow-hidden ${!item.inStock ? 'opacity-60' : ''
                }`}
            >
              <div className="h-48 bg-gray-200 flex items-center justify-center">
                {item.image && item.image !== '/images/menu-placeholder.jpg' ? (
                  <img
                    src={getImageUrl(item.image) || item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400 text-4xl">🍽️</span>
                )}
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                  {!item.inStock && (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Out of Stock</span>
                  )}
                </div>
                {item.description && (
                  <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                )}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xl font-bold text-orange-600">₹{item.price}</p>
                    <p className="text-gray-500 text-xs">~{item.preparationTime} min</p>
                  </div>
                  <button
                    onClick={() => handleAddToCart(item)}
                    disabled={!item.inStock}
                    className={`px-4 py-2 rounded-lg font-medium ${item.inStock
                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg">No items in this category</p>
          </div>
        )}
      </div>
    </div>
  );
}

