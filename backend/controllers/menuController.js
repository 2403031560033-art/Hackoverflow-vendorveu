import MenuItem from '../models/MenuItem.js';

export const addMenuItem = async (req, res) => {
  try {
    const { vendorId, name, price, category, description, preparationTime } = req.body;

    const menuItem = new MenuItem({
      vendorId,
      name,
      price,
      category: category || 'other',
      description: description || '',
      preparationTime: preparationTime || 10
    });

    await menuItem.save();
    res.status(201).json(menuItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getVendorMenu = async (req, res) => {
  try {
    const menuItems = await MenuItem.find({ vendorId: req.params.vendorId }).sort({ createdAt: -1 });
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json(menuItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const toggleStock = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    menuItem.inStock = !menuItem.inStock;
    await menuItem.save();
    res.json(menuItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findByIdAndDelete(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const uploadMenuItemImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Update menu item image path
    menuItem.image = `/uploads/menu/${req.file.filename}`;
    await menuItem.save();

    res.json({ 
      message: 'Image uploaded successfully',
      image: menuItem.image,
      menuItem
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

