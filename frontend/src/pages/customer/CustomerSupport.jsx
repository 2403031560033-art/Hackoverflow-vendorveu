import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { sendSupportMessage, getMySupportMessages } from '../../utils/api';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://hackoverflow-vendorveu.onrender.com/api';
const customerApi = axios.create({
  baseURL: API_URL,
});

export default function CustomerSupport() {
  const navigate = useNavigate();
  const customerPhone = localStorage.getItem('customerPhone');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [customerId, setCustomerId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!customerPhone) {
      navigate('/customer/login');
      return;
    }
    fetchCustomerAndMessages();
    const interval = setInterval(fetchMessages, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [customerPhone, navigate]);

  const fetchCustomerAndMessages = async () => {
    try {
      // Get customer profile to get ID
      const customerRes = await customerApi.get(`/customers/${customerPhone}`);
      setCustomerId(customerRes.data._id);
      await fetchMessages(customerRes.data._id);
    } catch (error) {
      console.error('Error fetching customer:', error);
      alert('Failed to load customer profile');
    }
  };

  const fetchMessages = async (id = customerId) => {
    if (!id) return;

    setLoading(true);
    try {
      const response = await getMySupportMessages('customer', customerPhone);
      setMessages(response.data.messages || []);
      scrollToBottom();
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !customerPhone) return;

    setSending(true);
    try {
      await sendSupportMessage(newMessage.trim(), 'customer', customerId, customerPhone);
      setNewMessage('');
      await fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      alert(error.response?.data?.error || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/customer/settings" className="text-orange-600 hover:underline">← Back to Settings</Link>
          <h1 className="text-xl font-bold text-gray-900">Customer Support</h1>
          <div></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto w-full px-4 py-6 flex flex-col flex-1">
        {/* Messages Area */}
        <div className="bg-white rounded-lg shadow mb-4 flex-1 flex flex-col min-h-0">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Conversation with Admin</h2>
            <p className="text-sm text-gray-600">Send us a message and we'll get back to you soon!</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading && messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg mb-2">No messages yet</p>
                <p className="text-sm">Start a conversation by sending a message below</p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isAdmin = msg.senderType === 'admin';
                return (
                  <div
                    key={msg._id || index}
                    className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${isAdmin
                          ? 'bg-blue-50 text-gray-900 border border-blue-200'
                          : 'bg-orange-600 text-white'
                        }`}
                    >
                      {isAdmin && (
                        <p className="text-xs font-semibold mb-1 text-blue-800">Admin</p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <p className={`text-xs mt-1 ${isAdmin ? 'text-blue-600' : 'text-orange-100'}`}>
                        {new Date(msg.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="p-4 border-t bg-gray-50">
            <div className="flex gap-2">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                rows="2"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-transparent resize-none"
                disabled={sending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
