import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getMenuItems, addMenuItem, toggleStock, deleteMenuItem, uploadMenuItemImage, getImageUrl } from '../../utils/api';

export default function MenuManagement() {
  const navigate = useNavigate();
  const [menuItems, setMenuItems] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const vendorServiceType = localStorage.getItem('vendorServiceType') || 'food';

  const CATEGORY_OPTIONS = {
    food: ['snacks', 'meals', 'beverages', 'desserts', 'bakery', 'other'],
    salon: ['haircut', 'facial', 'massage', 'nails', 'makeup', 'other'],
    doctor: ['consultation', 'checkup', 'treatment', 'test', 'other'],
    milk: ['milk', 'curd', 'paneer', 'butter', 'ghee', 'other'],
    grocery: ['vegetables', 'fruits', 'grains', 'spices', 'packaged', 'other'],
    service: ['plumbing', 'electrical', 'cleaning', 'repair', 'wedding', 'other']
  };

  const categories = CATEGORY_OPTIONS[vendorServiceType] || CATEGORY_OPTIONS.food;

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: categories[0] || 'other',
    description: '',
    preparationTime: 10,
    imageFile: null,
    imagePreview: null
  });
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState({});
  const [imagePreviews, setImagePreviews] = useState({});
  const vendorId = localStorage.getItem('vendorId');

  useEffect(() => {
    if (!vendorId) {
      navigate('/vendor/login');
      return;
    }
    fetchMenu();
  }, [vendorId, navigate]);

  const fetchMenu = async () => {
    try {
      const response = await getMenuItems(vendorId);
      setMenuItems(response.data);
      // Set image previews for items with images
      const previews = {};
      response.data.forEach(item => {
        if (item.image && item.image !== '/images/menu-placeholder.jpg') {
          previews[item._id] = item.image;
        }
      });
      setImagePreviews(previews);
    } catch (error) {
      console.error('Error fetching menu:', error);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.price || parseFloat(formData.price) <= 0) {
      alert('Please enter valid name and price');
      return;
    }

    setLoading(true);
    try {
      await addMenuItem({
        vendorId,
        name: formData.name,
        price: parseFloat(formData.price),
        category: formData.category,
        description: formData.description,
        preparationTime: parseInt(formData.preparationTime) || 10
      });

      // If image was selected, upload it after creating the item
      const response = await getMenuItems(vendorId);
      const newItem = response.data[0]; // Get the newly created item

      if (formData.imageFile && newItem) {
        try {
          const imageFormData = new FormData();
          imageFormData.append('image', formData.imageFile);
          await uploadMenuItemImage(newItem._id, imageFormData);
        } catch (error) {
          console.error('Error uploading image:', error);
          // Don't fail the whole operation if image upload fails
        }
      }

      await fetchMenu();
      setFormData({ name: '', price: '', category: 'other', description: '', preparationTime: 10, imageFile: null, imagePreview: null });
      setShowAddForm(false);
      alert('Menu item added successfully!');
    } catch (error) {
      console.error('Error adding menu item:', error);
      alert('Failed to add menu item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStock = async (itemId) => {
    try {
      await toggleStock(itemId);
      await fetchMenu();
    } catch (error) {
      console.error('Error toggling stock:', error);
      alert('Failed to update stock status. Please try again.');
    }
  };

  const handleDelete = async (itemId) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await deleteMenuItem(itemId);
      await fetchMenu();
      alert('Menu item deleted successfully!');
    } catch (error) {
      console.error('Error deleting menu item:', error);
      alert('Failed to delete menu item. Please try again.');
    }
  };

  const handleItemImageUpload = async (itemId, e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    if (!file.type.match('image.*')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploadingImages(prev => ({ ...prev, [itemId]: true }));

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await uploadMenuItemImage(itemId, formData);
      setImagePreviews(prev => ({ ...prev, [itemId]: response.data.image }));

      // Refresh menu
      await fetchMenu();

      alert('Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(error.response?.data?.error || 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImages(prev => ({ ...prev, [itemId]: false }));
      e.target.value = ''; // Reset file input
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/vendor/dashboard" className="text-orange-600 hover:underline">← Dashboard</Link>
          <h1 className="text-xl font-bold text-gray-900">Menu Management</h1>
          <div></div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Menu Items</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-orange-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-orange-700"
          >
            {showAddForm ? 'Cancel' : '+ Add Menu Item'}
          </button>
        </div>

        {/* Add Item Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Menu Item</h3>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600"
                    placeholder="e.g., Samosa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600"
                    placeholder="e.g., 20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preparation Time (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.preparationTime}
                    onChange={(e) => setFormData({ ...formData, preparationTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600"
                    placeholder="10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600"
                  placeholder="Item description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Photo (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      if (!file.type.match('image.*')) {
                        alert('Please select an image file');
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        alert('Image size must be less than 5MB');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFormData(prev => ({ ...prev, imageFile: file, imagePreview: reader.result }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600"
                />
                <p className="text-xs text-gray-500 mt-1">Max 5MB, JPG/PNG/WEBP</p>
                {formData.imagePreview && (
                  <div className="mt-2">
                    <img src={formData.imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-orange-700 disabled:bg-gray-400"
              >
                {loading ? 'Adding...' : 'Add Item'}
              </button>
            </form>
          </div>
        )}

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map(item => (
            <div key={item._id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="h-48 bg-gray-200 flex items-center justify-center relative group">
                {(imagePreviews[item._id] || (item.image && item.image !== '/images/menu-placeholder.jpg')) ? (
                  <img
                    src={imagePreviews[item._id] || getImageUrl(item.image) || item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400 text-4xl">🍽️</span>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleItemImageUpload(item._id, e)}
                    disabled={uploadingImages[item._id]}
                    className="hidden"
                    id={`item-image-${item._id}`}
                  />
                  <label
                    htmlFor={`item-image-${item._id}`}
                    className={`px-4 py-2 bg-white text-gray-900 rounded-lg cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity ${uploadingImages[item._id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {uploadingImages[item._id] ? 'Uploading...' : '📷 Upload Photo'}
                  </label>
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                  <span className={`px-2 py-1 rounded text-xs ${item.inStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {item.inStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
                {item.description && (
                  <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                )}
                <div className="flex justify-between items-center mb-4">
                  <p className="text-xl font-bold text-orange-600">₹{item.price}</p>
                  <p className="text-gray-500 text-sm">~{item.preparationTime} min</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleStock(item._id)}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm ${item.inStock
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                  >
                    {item.inStock ? 'Mark Out of Stock' : 'Mark In Stock'}
                  </button>
                  <button
                    onClick={() => handleDelete(item._id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {menuItems.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg">No menu items yet. Add your first item!</p>
          </div>
        )}
      </div>
    </div>
  );
}

