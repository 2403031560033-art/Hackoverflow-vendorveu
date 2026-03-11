import Vendor from '../models/Vendor.js';
import MenuItem from '../models/MenuItem.js';
import bcrypt from 'bcryptjs';

export const registerVendor = async (req, res) => {
  try {
    const { name, phone, password, category, serviceType, location } = req.body;

    // Validate password
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Check if vendor already exists
    const existingVendor = await Vendor.findOne({ phone });
    if (existingVendor) {
      return res.status(400).json({ error: 'Vendor with this phone number already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const vendor = new Vendor({
      name,
      phone,
      password: hashedPassword,
      serviceType: serviceType || 'food',
      category: category || 'other',
      location: {
        lat: location.lat || 22.2587,
        lng: location.lng || 73.3570,
        address: location.address || 'Parul University'
      }
    });

    await vendor.save();

    // Remove password from response
    const vendorResponse = vendor.toObject();
    delete vendorResponse.password;

    res.status(201).json({ vendorId: vendor._id, vendor: vendorResponse });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const loginVendor = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const vendor = await Vendor.findOne({ phone });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, vendor.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Remove password from response
    const vendorResponse = vendor.toObject();
    delete vendorResponse.password;

    res.json({ vendorId: vendor._id, vendor: vendorResponse });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllVendors = async (req, res) => {
  try {
    const { serviceType } = req.query;
    const filter = {};
    if (serviceType && serviceType !== 'all') {
      // Include vendors without serviceType field as 'food' (legacy vendors)
      if (serviceType === 'food') {
        filter.$or = [{ serviceType: 'food' }, { serviceType: { $exists: false } }];
      } else {
        filter.serviceType = serviceType;
      }
    }
    const vendors = await Vendor.find(filter).sort({ createdAt: -1 });
    // Remove passwords from response
    const vendorsResponse = vendors.map(vendor => {
      const vendorObj = vendor.toObject();
      delete vendorObj.password;
      return vendorObj;
    });
    res.json(vendorsResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Remove password from response
    const vendorResponse = vendor.toObject();
    delete vendorResponse.password;

    res.json(vendorResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getVendorMenu = async (req, res) => {
  try {
    const menuItems = await MenuItem.find({ vendorId: req.params.id }).sort({ createdAt: -1 });
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const toggleVendorStatus = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    vendor.isOpen = !vendor.isOpen;
    await vendor.save();

    const vendorResponse = vendor.toObject();
    delete vendorResponse.password;
    res.json(vendorResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateVendorIsOpen = async (req, res) => {
  try {
    const { isOpen } = req.body;
    if (typeof isOpen !== 'boolean') {
      return res.status(400).json({ error: 'isOpen must be a boolean' });
    }

    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    vendor.isOpen = isOpen;
    await vendor.save();

    const vendorResponse = vendor.toObject();
    delete vendorResponse.password;
    res.json(vendorResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateVendorLocation = async (req, res) => {
  try {
    const { location } = req.body;
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    vendor.location = {
      lat: location.lat || vendor.location.lat,
      lng: location.lng || vendor.location.lng,
      address: location.address || vendor.location.address
    };

    await vendor.save();

    const vendorResponse = vendor.toObject();
    delete vendorResponse.password;

    res.json(vendorResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateVendorProfile = async (req, res) => {
  try {
    const { name, description, upiId } = req.body;
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    if (name !== undefined) {
      if (!name || name.trim().length < 1) {
        return res.status(400).json({ error: 'Name is required and must be at least 1 character' });
      }
      vendor.name = name.trim();
    }

    if (description !== undefined) {
      vendor.description = description.trim() || '';
    }

    if (upiId !== undefined) {
      const trimmedUpiId = upiId.trim();
      if (trimmedUpiId === '') {
        vendor.upiId = null;
      } else {
        // Validate UPI ID format: should contain @ and be 5-50 characters
        if (trimmedUpiId.length < 5 || trimmedUpiId.length > 50) {
          return res.status(400).json({ error: 'UPI ID must be between 5 and 50 characters' });
        }
        if (!trimmedUpiId.includes('@')) {
          return res.status(400).json({ error: 'UPI ID must contain @ symbol (e.g., name@upi, name@paytm)' });
        }
        vendor.upiId = trimmedUpiId;
      }
    }

    await vendor.save();

    const vendorResponse = vendor.toObject();
    delete vendorResponse.password;

    res.json(vendorResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateVendorWaitingTime = async (req, res) => {
  try {
    const { waitingTime } = req.body;
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    if (waitingTime !== undefined) {
      const time = parseInt(waitingTime);
      if (isNaN(time) || time < 0) {
        return res.status(400).json({ error: 'Waiting time must be a non-negative number' });
      }
      vendor.currentWaitingTime = time;
    }

    await vendor.save();

    const vendorResponse = vendor.toObject();
    delete vendorResponse.password;

    res.json(vendorResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const uploadVendorImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const uploadPath = `/uploads/vendors/${req.file.filename}`;

    // Update vendor image
    vendor.image = uploadPath;

    await vendor.save();

    const vendorResponse = vendor.toObject();
    delete vendorResponse.password;

    res.json({
      message: 'Image uploaded successfully',
      image: vendor.image,
      vendor: vendorResponse
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const uploadVendorQRCode = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const uploadPath = `/uploads/vendors/${req.file.filename}`;

    // Update vendor QR code
    vendor.qrCode = uploadPath;

    await vendor.save();

    const vendorResponse = vendor.toObject();
    delete vendorResponse.password;

    res.json({
      message: 'QR Code uploaded successfully',
      image: vendor.qrCode,
      qrCode: vendor.qrCode,
      vendor: vendorResponse
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

