import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminGetConversations, adminGetThreadMessages, adminReplySupport } from '../../utils/api';

export default function AdminSupport() {
  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');
  const adminUsername = localStorage.getItem('adminUsername') || 'Admin';

  const [conversations, setConversations] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [senderInfo, setSenderInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchConversations();
    const interval = setInterval(fetchConversations, 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, [token, navigate]);

  useEffect(() => {
    if (selectedThread) {
      fetchThreadMessages(selectedThread);
      const interval = setInterval(() => fetchThreadMessages(selectedThread), 10000);
      return () => clearInterval(interval);
    }
  }, [selectedThread, token]);

  const fetchConversations = async () => {
    try {
      const response = await adminGetConversations(token);
      setConversations(response.data.conversations || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      alert(error.response?.data?.error || 'Failed to load conversations');
      setLoading(false);
      if (error.response?.status === 401) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUsername');
        navigate('/admin/login');
      }
    }
  };

  const fetchThreadMessages = async (threadId) => {
    if (!threadId || !token) return;

    setLoadingMessages(true);
    try {
      const response = await adminGetThreadMessages(token, threadId);
      setThreadMessages(response.data.messages || []);
      setSenderInfo(response.data.senderInfo || {});
      scrollToBottom();
    } catch (error) {
      console.error('Error fetching thread messages:', error);
      setSenderInfo({});
      setThreadMessages([]);
      alert(error.response?.data?.error || 'Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectThread = (threadId) => {
    setSelectedThread(threadId);
    setReplyMessage('');
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedThread || !token) return;

    setSending(true);
    try {
      await adminReplySupport(token, selectedThread, replyMessage.trim());
      setReplyMessage('');
      await fetchThreadMessages(selectedThread);
      await fetchConversations(); // Refresh conversations to update unread count
    } catch (error) {
      console.error('Error sending reply:', error);
      alert(error.response?.data?.error || 'Failed to send reply. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    navigate('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading support conversations...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/" className="text-orange-600 hover:underline">← Home</Link>
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900">Support Messages</h1>
            <p className="text-xs text-gray-500">Signed in as {adminUsername}</p>
          </div>
          <button onClick={logout} className="text-red-600 hover:text-red-700 font-medium">
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-screen">
          {/* Conversations List */}
          <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
              <p className="text-sm text-gray-600">{conversations.length} active conversation{conversations.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No conversations yet</p>
                  <p className="text-sm mt-2">Messages from customers and vendors will appear here</p>
                </div>
              ) : (
                <div className="divide-y">
                  {conversations.map((conv) => (
                    <button
                      key={conv.threadId}
                      onClick={() => handleSelectThread(conv.threadId)}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                        selectedThread === conv.threadId ? 'bg-orange-50 border-l-4 border-orange-600' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {conv.senderName || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">{conv.senderType}</p>
                          {conv.senderPhone && (
                            <p className="text-xs text-gray-500">{conv.senderPhone}</p>
                          )}
                        </div>
                        {conv.unreadCount > 0 && (
                          <span className="ml-2 px-2 py-1 bg-orange-600 text-white text-xs font-semibold rounded-full">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(conv.lastMessageTime).toLocaleString()}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden flex flex-col">
            {selectedThread ? (
              <>
                {/* Thread Header */}
                <div className="p-4 border-b bg-gray-50">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {senderInfo?.name || 'Loading...'}
                  </h2>
                  <p className="text-sm text-gray-600 capitalize">{senderInfo?.type || 'user'}</p>
                  {senderInfo?.phone && (
                    <p className="text-sm text-gray-600">Phone: {senderInfo.phone}</p>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {loadingMessages ? (
                    <div className="text-center py-8 text-gray-500">Loading messages...</div>
                  ) : threadMessages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No messages yet</div>
                  ) : (
                    threadMessages.map((msg, index) => {
                      const isAdmin = msg.senderType === 'admin';
                      return (
                        <div
                          key={msg._id || index}
                          className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${
                              isAdmin
                                ? 'bg-orange-600 text-white'
                                : 'bg-blue-50 text-gray-900 border border-blue-200'
                            }`}
                          >
                            {!isAdmin && (
                              <p className="text-xs font-semibold mb-1 text-blue-800">
                                {msg.senderType === 'customer' ? 'Customer' : 'Vendor'}
                              </p>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                            <p className={`text-xs mt-1 ${isAdmin ? 'text-orange-100' : 'text-blue-600'}`}>
                              {new Date(msg.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Input */}
                <form onSubmit={handleSendReply} className="p-4 border-t bg-gray-50">
                  <div className="flex gap-2">
                    <textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your reply..."
                      rows="2"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-transparent resize-none"
                      disabled={sending || loadingMessages}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply(e);
                        }
                      }}
                    />
                    <button
                      type="submit"
                      disabled={sending || !replyMessage.trim() || loadingMessages}
                      className="px-6 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {sending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <p className="text-lg mb-2">Select a conversation</p>
                  <p className="text-sm">Choose a conversation from the list to view and reply to messages</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
