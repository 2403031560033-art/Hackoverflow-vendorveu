import Order from '../models/Order.js';
import Vendor from '../models/Vendor.js';

// Get vendor analytics data from historical orders
export const getVendorAnalytics = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Rush hours — group completed orders by hour of day
    const rushHours = await Order.aggregate([
      { $match: { vendorId: vendor._id, status: 'completed' } },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Popular dishes — group order items by name
    const popularDishes = await Order.aggregate([
      { $match: { vendorId: vendor._id, status: 'completed' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          totalOrdered: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { totalOrdered: -1 } },
      { $limit: 10 }
    ]);

    // Average preparation time
    const avgPrepTime = await Order.aggregate([
      { $match: { vendorId: vendor._id, status: 'completed', estimatedTime: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          avgTime: { $avg: '$estimatedTime' }
        }
      }
    ]);

    // Rating distribution
    const ratingDistribution = await Order.aggregate([
      { $match: { vendorId: vendor._id, rating: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    // Peak demand by day of week
    const peakDemandByDay = await Order.aggregate([
      { $match: { vendorId: vendor._id, status: 'completed' } },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          count: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Recent low ratings with comments (repeated complaints)
    const complaints = await Order.find({
      vendorId: vendor._id,
      rating: { $lte: 2 },
      ratingComment: { $ne: '' }
    })
      .select('rating ratingComment items createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    // Daily order trends (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dailyTrends = await Order.aggregate([
      { $match: { vendorId: vendor._id, status: 'completed', createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    res.json({
      rushHours: rushHours.map(h => ({
        hour: h._id,
        label: `${h._id}:00 – ${h._id + 1}:00`,
        orderCount: h.count,
        revenue: h.revenue
      })),
      popularDishes,
      avgPreparationTime: avgPrepTime.length > 0 ? Math.round(avgPrepTime[0].avgTime) : 10,
      ratingDistribution: ratingDistribution.map(r => ({
        stars: r._id,
        count: r.count
      })),
      peakDemandByDay: peakDemandByDay.map(d => ({
        day: dayNames[(d._id - 1) % 7],
        dayIndex: d._id,
        orderCount: d.count,
        revenue: d.revenue
      })),
      complaints,
      dailyTrends
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Generate AI-powered recommendations based on analytics data
export const getAIRecommendations = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const recommendations = [];

    // 1. Rush hour analysis
    const rushHours = await Order.aggregate([
      { $match: { vendorId: vendor._id, status: 'completed' } },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    if (rushHours.length > 0) {
      const peakHour = rushHours[0];
      const peakEnd = peakHour._id + 1;
      recommendations.push({
        type: 'rush_hour',
        priority: 'high',
        icon: '⏰',
        title: 'Peak Hour Staffing',
        message: `Your busiest hour is ${peakHour._id}:00–${peakEnd}:00 with ${peakHour.count} orders. Consider increasing staff during this window.`,
        isRecommendation: true
      });
    }

    // 2. Popular dish prep recommendation
    const popularDishes = await Order.aggregate([
      { $match: { vendorId: vendor._id, status: 'completed' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          totalOrdered: { $sum: '$items.quantity' }
        }
      },
      { $sort: { totalOrdered: -1 } },
      { $limit: 3 }
    ]);

    if (popularDishes.length > 0 && rushHours.length > 0) {
      const topDish = popularDishes[0];
      const peakHour = rushHours[0];
      const avgPerHour = Math.ceil(topDish.totalOrdered / Math.max(rushHours.length, 1));
      recommendations.push({
        type: 'prep_ahead',
        priority: 'medium',
        icon: '🍳',
        title: 'Prep Ahead Suggestion',
        message: `Prepare ${avgPerHour} extra "${topDish._id}" between ${peakHour._id}:00 and ${peakHour._id + 1}:00 to reduce wait times.`,
        isRecommendation: true
      });
    }

    // 3. Low demand detection
    if (rushHours.length >= 2) {
      const lowHour = rushHours[rushHours.length - 1];
      recommendations.push({
        type: 'low_demand',
        priority: 'low',
        icon: '📉',
        title: 'Low Demand Period',
        message: `${lowHour._id}:00–${lowHour._id + 1}:00 has the fewest orders (${lowHour.count}). You could use this time for prep or restocking.`,
        isRecommendation: true
      });
    }

    // 4. Complaint pattern detection
    const complaints = await Order.find({
      vendorId: vendor._id,
      rating: { $lte: 2 },
      ratingComment: { $ne: '' }
    }).select('ratingComment items').limit(20);

    if (complaints.length >= 3) {
      recommendations.push({
        type: 'complaint_alert',
        priority: 'high',
        icon: '⚠️',
        title: 'Repeated Low Ratings',
        message: `You have ${complaints.length} orders with 1–2 star ratings. Review the feedback in your analytics page to identify common issues.`,
        isRecommendation: true
      });
    }

    // 5. Peak day recommendation
    const peakDay = await Order.aggregate([
      { $match: { vendorId: vendor._id, status: 'completed' } },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (peakDay.length > 0) {
      const topDay = peakDay[0];
      recommendations.push({
        type: 'peak_day',
        priority: 'medium',
        icon: '📅',
        title: 'Busiest Day',
        message: `${dayNames[(topDay._id - 1) % 7]} is your busiest day with ${topDay.count} total orders. Plan extra inventory and staffing accordingly.`,
        isRecommendation: true
      });
    }

    // 6. Average rating check
    if (vendor.rating < 3.5 && vendor.totalOrders > 5) {
      recommendations.push({
        type: 'rating_improvement',
        priority: 'high',
        icon: '⭐',
        title: 'Rating Improvement Needed',
        message: `Your current rating is ${vendor.rating.toFixed(1)}/5.0. Focus on addressing customer complaints and improving food quality to boost your rating.`,
        isRecommendation: true
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    res.json({
      vendorId,
      generatedAt: new Date(),
      disclaimer: 'These are AI-generated recommendations based on your order history. All decisions remain yours.',
      recommendations
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
