import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getVendorAnalytics, getVendorRecommendations } from '../../utils/api';

export default function VendorAnalytics() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const vendorId = localStorage.getItem('vendorId');

  useEffect(() => {
    if (!vendorId) {
      navigate('/vendor/login');
      return;
    }
    fetchData();
  }, [vendorId, navigate]);

  const fetchData = async () => {
    try {
      const [analyticsRes, recsRes] = await Promise.all([
        getVendorAnalytics(vendorId),
        getVendorRecommendations(vendorId)
      ]);
      setAnalytics(analyticsRes.data);
      setRecommendations(recsRes.data.recommendations || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/vendor/dashboard" className="text-orange-600 hover:underline">← Dashboard</Link>
          <h1 className="text-xl font-bold text-gray-900">📊 AI Analytics</h1>
          <div></div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Disclaimer */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            📊 <strong>AI Recommendations:</strong> These insights are generated from your order history.
            All recommendations are suggestions — you remain in full control of all decisions.
          </p>
        </div>

        {/* AI Recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🤖 AI Recommendations</h2>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    rec.priority === 'high'
                      ? 'bg-red-50 border-red-200'
                      : rec.priority === 'medium'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{rec.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-1">{rec.title}</p>
                      <p className="text-sm text-gray-700">{rec.message}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                          rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {rec.priority} priority
                        </span>
                        <span className="text-xs text-gray-500 italic">AI Recommendation</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {analytics && (
          <>
            {/* Rush Hours */}
            {analytics.rushHours && analytics.rushHours.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">⏰ Rush Hours</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 text-gray-600">Time Slot</th>
                        <th className="text-right py-2 px-3 text-gray-600">Orders</th>
                        <th className="text-right py-2 px-3 text-gray-600">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.rushHours.slice(0, 8).map((hour, index) => (
                        <tr key={index} className={`border-b ${index === 0 ? 'bg-orange-50' : ''}`}>
                          <td className="py-2 px-3 font-medium text-gray-900">
                            {index === 0 && '🔥 '}{hour.label}
                          </td>
                          <td className="py-2 px-3 text-right text-gray-700">{hour.orderCount}</td>
                          <td className="py-2 px-3 text-right text-gray-700">₹{hour.revenue?.toFixed(0) || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Popular Dishes + Rating Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Popular Dishes */}
              {analytics.popularDishes && analytics.popularDishes.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">🍽️ Popular Dishes</h2>
                  <div className="space-y-3">
                    {analytics.popularDishes.map((dish, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                          <span className="text-gray-900 font-medium">{dish._id}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{dish.totalOrdered} ordered</p>
                          <p className="text-xs text-gray-500">₹{dish.totalRevenue?.toFixed(0) || 0}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rating Distribution */}
              {analytics.ratingDistribution && analytics.ratingDistribution.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">⭐ Rating Distribution</h2>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map(stars => {
                      const found = analytics.ratingDistribution.find(r => r.stars === stars);
                      const count = found ? found.count : 0;
                      const total = analytics.ratingDistribution.reduce((sum, r) => sum + r.count, 0);
                      const percentage = total > 0 ? (count / total) * 100 : 0;
                      return (
                        <div key={stars} className="flex items-center gap-3">
                          <span className="text-sm font-medium w-12">{stars} ⭐</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-4">
                            <div
                              className={`h-4 rounded-full ${stars >= 4 ? 'bg-green-500' : stars === 3 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-10 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      Average prep time: <span className="font-bold">{analytics.avgPreparationTime || 10} min</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Peak Demand by Day */}
            {analytics.peakDemandByDay && analytics.peakDemandByDay.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">📅 Busiest Days</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {analytics.peakDemandByDay.map((day, index) => (
                    <div
                      key={index}
                      className={`text-center p-4 rounded-lg ${index === 0 ? 'bg-orange-100 border-2 border-orange-300' : 'bg-gray-50'}`}
                    >
                      <p className="text-sm font-semibold text-gray-900">{day.day}</p>
                      <p className="text-2xl font-bold text-orange-600 mt-1">{day.orderCount}</p>
                      <p className="text-xs text-gray-500">orders</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Complaints */}
            {analytics.complaints && analytics.complaints.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">⚠️ Recent Low Ratings</h2>
                <div className="space-y-3">
                  {analytics.complaints.map((complaint, index) => (
                    <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map(star => (
                            <span key={star} className={`text-sm ${complaint.rating >= star ? 'text-yellow-500' : 'text-gray-300'}`}>⭐</span>
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(complaint.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800">{complaint.ratingComment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!analytics && !loading && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg">No analytics data available yet.</p>
            <p className="text-gray-400 text-sm mt-2">Complete more orders to see insights here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
