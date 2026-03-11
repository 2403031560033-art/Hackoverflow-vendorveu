import SupportMessage from '../models/SupportMessage.js';
import Customer from '../models/Customer.js';
import Vendor from '../models/Vendor.js';
import Admin from '../models/Admin.js';

// Helper function to find admin ID
const getAdminId = async () => {
  const admin = await Admin.findOne({});
  if (!admin) {
    throw new Error('No admin found in database');
  }
  return admin._id;
};

// Send message from customer/vendor to admin
export const sendMessage = async (req, res) => {
  try {
    const { message, senderType, senderId, senderPhone } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!senderType || !['customer', 'vendor'].includes(senderType)) {
      return res.status(400).json({ error: 'Invalid sender type' });
    }

    // Validate sender exists
    let sender;
    if (senderType === 'customer') {
      // For customers, use phone number
      if (!senderPhone) {
        return res.status(400).json({ error: 'Customer phone is required' });
      }
      sender = await Customer.findOne({ phone: senderPhone });
      if (!sender) {
        return res.status(404).json({ error: 'Customer not found' });
      }
    } else if (senderType === 'vendor') {
      // For vendors, use ID
      if (!senderId) {
        return res.status(400).json({ error: 'Vendor ID is required' });
      }
      sender = await Vendor.findById(senderId);
      if (!sender) {
        return res.status(404).json({ error: 'Vendor not found' });
      }
    }

    // Get admin ID
    const adminId = await getAdminId();

    // Create thread ID
    const threadId = senderType === 'customer' 
      ? `customer-${sender.phone}` 
      : `vendor-${sender._id}`;

    // Create message
    const supportMessage = new SupportMessage({
      senderType,
      senderId: sender._id,
      senderTypeModel: senderType === 'customer' ? 'Customer' : 'Vendor',
      recipientType: 'admin',
      recipientId: adminId,
      recipientTypeModel: 'Admin',
      message: message.trim(),
      threadId,
      isRead: false
    });

    await supportMessage.save();

    res.status(201).json({
      message: 'Message sent successfully',
      supportMessage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get messages for customer/vendor
export const getMyMessages = async (req, res) => {
  try {
    const { senderType, senderId } = req.params;

    if (!senderType || !['customer', 'vendor'].includes(senderType)) {
      return res.status(400).json({ error: 'Invalid sender type' });
    }

    // Validate sender exists
    let sender;
    if (senderType === 'customer') {
      // For customers, senderId is actually phone number
      sender = await Customer.findOne({ phone: senderId });
      if (!sender) {
        return res.status(404).json({ error: 'Customer not found' });
      }
    } else if (senderType === 'vendor') {
      sender = await Vendor.findById(senderId);
      if (!sender) {
        return res.status(404).json({ error: 'Vendor not found' });
      }
    }

    // Create thread ID
    const threadId = senderType === 'customer' 
      ? `customer-${sender.phone}` 
      : `vendor-${sender._id}`;

    // Get all messages in thread, sorted by creation date
    const messages = await SupportMessage.find({ threadId })
      .sort({ createdAt: 1 })
      .populate('senderId', senderType === 'customer' ? 'name phone' : 'name phone')
      .populate('recipientId', 'username');

    // Mark admin messages as read when customer/vendor views them
    await SupportMessage.updateMany(
      { threadId, senderType: 'admin', isRead: false },
      { isRead: true }
    );

    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: Get all conversations
export const adminGetConversations = async (req, res) => {
  try {
    // Get all unique thread IDs
    const threads = await SupportMessage.aggregate([
      {
        $group: {
          _id: '$threadId',
          lastMessage: { $max: '$createdAt' },
          lastMessageText: { $last: '$message' },
          unreadCount: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $in: ['$senderType', ['customer', 'vendor']] },
                    { $eq: ['$isRead', false] }
                  ] 
                },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { lastMessage: -1 } }
    ]);

    // Get details for each thread
    const conversations = await Promise.all(
      threads.map(async (thread) => {
        // Get first message to identify sender
        const firstMessage = await SupportMessage.findOne({ threadId: thread._id })
          .sort({ createdAt: 1 })
          .populate('senderId', 'name phone');

        let senderName = 'Unknown';
        let senderPhone = '';
        let senderType = '';

        if (firstMessage) {
          senderType = firstMessage.senderType;
          if (firstMessage.senderType === 'customer') {
            senderName = firstMessage.senderId?.name || firstMessage.senderId?.phone || 'Customer';
            senderPhone = firstMessage.senderId?.phone || '';
          } else if (firstMessage.senderType === 'vendor') {
            senderName = firstMessage.senderId?.name || 'Vendor';
            senderPhone = firstMessage.senderId?.phone || '';
          }
        }

        return {
          threadId: thread._id,
          senderType,
          senderName,
          senderPhone,
          lastMessage: thread.lastMessageText,
          lastMessageTime: thread.lastMessage,
          unreadCount: thread.unreadCount
        };
      })
    );

    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: Get messages in a specific thread
export const adminGetThreadMessages = async (req, res) => {
  try {
    const { threadId } = req.params;

    if (!threadId) {
      return res.status(400).json({ error: 'Thread ID is required' });
    }

    // Get all messages in thread
    const messages = await SupportMessage.find({ threadId })
      .sort({ createdAt: 1 })
      .populate('senderId', 'name phone username')
      .populate('recipientId', 'name phone username');

    // Get sender info from first message
    const firstMessage = messages[0];
    let senderInfo = {};
    
    if (firstMessage) {
      if (firstMessage.senderType === 'customer') {
        senderInfo = {
          name: firstMessage.senderId?.name || firstMessage.senderId?.phone || 'Customer',
          phone: firstMessage.senderId?.phone || '',
          type: 'customer'
        };
      } else if (firstMessage.senderType === 'vendor') {
        senderInfo = {
          name: firstMessage.senderId?.name || 'Vendor',
          phone: firstMessage.senderId?.phone || '',
          type: 'vendor'
        };
      }
    }

    // Mark messages as read
    await SupportMessage.updateMany(
      { threadId, recipientType: 'admin', isRead: false },
      { isRead: true }
    );

    res.json({ messages, senderInfo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: Reply to a conversation
export const adminReply = async (req, res) => {
  try {
    const { threadId, message } = req.body;

    if (!threadId || !message || !message.trim()) {
      return res.status(400).json({ error: 'Thread ID and message are required' });
    }

    // Get admin ID
    const adminId = await getAdminId();

    // Get first message to find recipient
    const firstMessage = await SupportMessage.findOne({ threadId }).sort({ createdAt: 1 });
    if (!firstMessage) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // Create reply message
    const replyMessage = new SupportMessage({
      senderType: 'admin',
      senderId: adminId,
      senderTypeModel: 'Admin',
      recipientType: firstMessage.senderType,
      recipientId: firstMessage.senderId,
      recipientTypeModel: firstMessage.senderType === 'customer' ? 'Customer' : 'Vendor',
      message: message.trim(),
      threadId,
      isRead: false
    });

    await replyMessage.save();

    res.status(201).json({
      message: 'Reply sent successfully',
      supportMessage: replyMessage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
