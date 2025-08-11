import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import axios from 'axios';

const BuddySystem = ({ userId = 'default-user' }) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('connections');
  const [connections, setConnections] = useState([]);
  const [requests, setRequests] = useState({ sent: [], received: [] });
  const [sharedGoals, setSharedGoals] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [newRequestUserId, setNewRequestUserId] = useState('');
  const [newRequestMessage, setNewRequestMessage] = useState('');

  const fetchBuddyData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch connections
      const connectionsResponse = await axios.get(`${process.env.REACT_APP_API_URL}/buddy-system`, {
        params: { userId, action: 'connections' }
      });

      if (connectionsResponse.data.success) {
        setConnections(connectionsResponse.data.connections);
      }

      // Fetch requests
      const requestsResponse = await axios.get(`${process.env.REACT_APP_API_URL}/buddy-system`, {
        params: { userId, action: 'requests' }
      });

      if (requestsResponse.data.success) {
        setRequests({
          sent: requestsResponse.data.sentRequests,
          received: requestsResponse.data.receivedRequests
        });
      }

    } catch (err) {
      console.error('Error fetching buddy data:', err);
      setError(err.response?.data?.message || 'Failed to load buddy system data');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const fetchSharedGoals = useCallback(async (buddyId) => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/buddy-system`, {
        params: { userId, action: 'shared-goals', buddyId }
      });

      if (response.data.success) {
        setSharedGoals(prev => ({
          ...prev,
          [buddyId]: response.data.sharedGoals
        }));
      }
    } catch (err) {
      console.error('Error fetching shared goals:', err);
    }
  }, [userId]);

  useEffect(() => {
    fetchBuddyData();
  }, [fetchBuddyData]);

  const sendBuddyRequest = async () => {
    if (!newRequestUserId.trim()) return;

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/buddy-system`, {
        action: 'send-request',
        targetUserId: newRequestUserId.trim(),
        message: newRequestMessage.trim()
      }, {
        params: { userId }
      });

      if (response.data.success) {
        setShowRequestModal(false);
        setNewRequestUserId('');
        setNewRequestMessage('');
        fetchBuddyData(); // Refresh data
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      console.error('Error sending buddy request:', err);
      setError(err.response?.data?.error || 'Failed to send buddy request');
    }
  };

  const handleRequest = async (requestId, action) => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/buddy-system`, {
        action: action === 'accept' ? 'accept-request' : 'decline-request',
        requestId
      }, {
        params: { userId }
      });

      if (response.data.success) {
        fetchBuddyData(); // Refresh data
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      console.error(`Error ${action}ing request:`, err);
      setError(err.response?.data?.error || `Failed to ${action} request`);
    }
  };

  const sendEncouragement = async (buddyId, message, type = 'general') => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/buddy-system`, {
        action: 'send-encouragement',
        buddyId,
        message,
        type
      }, {
        params: { userId }
      });

      if (response.data.success) {
        // Show success feedback
        alert('Encouragement sent! 🎉');
      }
    } catch (err) {
      console.error('Error sending encouragement:', err);
      setError(err.response?.data?.error || 'Failed to send encouragement');
    }
  };

  const getConnectionStrengthColor = (strength) => {
    if (strength >= 80) return 'text-green-600';
    if (strength >= 60) return 'text-yellow-600';
    if (strength >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getConnectionStrengthText = (strength) => {
    if (strength >= 80) return 'Strong';
    if (strength >= 60) return 'Good';
    if (strength >= 40) return 'Fair';
    return 'Weak';
  };

  if (isLoading) {
    return (
      <div 
        className="rounded-lg shadow-md p-6 transition-colors duration-200"
        style={{ 
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.border
        }}
      >
        <div className="animate-pulse space-y-4">
          <div 
            className="h-6 rounded w-1/3"
            style={{ backgroundColor: theme.colors.border }}
          ></div>
          <div 
            className="h-4 rounded w-full"
            style={{ backgroundColor: theme.colors.border }}
          ></div>
          <div 
            className="h-4 rounded w-2/3"
            style={{ backgroundColor: theme.colors.border }}
          ></div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="rounded-lg shadow-md transition-colors duration-200"
      style={{ 
        backgroundColor: theme.colors.background,
        borderColor: theme.colors.border
      }}
    >
      {/* Header */}
      <div 
        className="border-b p-6 transition-colors duration-200"
        style={{ borderColor: theme.colors.border }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 
            className="text-xl font-bold transition-colors duration-200"
            style={{ color: theme.colors.text }}
          >
            🤝 Workout Buddies
          </h2>
          <button
            onClick={() => setShowRequestModal(true)}
            className="px-4 py-2 rounded transition-colors"
            style={{
              backgroundColor: theme.colors.primary,
              color: theme.colors.background
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = theme.colors.primaryHover;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = theme.colors.primary;
            }}
          >
            + Add Buddy
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-6">
          {[
            { id: 'connections', label: 'My Buddies', count: connections.length },
            { id: 'requests', label: 'Requests', count: requests.sent.length + requests.received.length },
            { id: 'shared', label: 'Shared Goals', count: Object.values(sharedGoals).flat().length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-opacity-100'
                  : 'border-transparent hover:border-opacity-50'
              }`}
              style={{
                color: activeTab === tab.id ? theme.colors.primary : theme.colors.textSecondary,
                borderColor: activeTab === tab.id ? theme.colors.primary : 'transparent'
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span 
                  className="ml-2 px-2 py-1 rounded-full text-xs"
                  style={{
                    backgroundColor: activeTab === tab.id ? theme.colors.primary : theme.colors.border,
                    color: activeTab === tab.id ? theme.colors.background : theme.colors.textSecondary
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-red-800">{error}</div>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Connections Tab */}
        {activeTab === 'connections' && (
          <div className="space-y-4">
            {connections.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">👥</div>
                <div 
                  className="text-lg font-medium mb-2 transition-colors duration-200"
                  style={{ color: theme.colors.text }}
                >
                  No workout buddies yet
                </div>
                <div 
                  className="text-sm transition-colors duration-200"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Connect with friends to share goals and motivation!
                </div>
              </div>
            ) : (
              connections.map(connection => (
                <div
                  key={connection.id}
                  className="border rounded-lg p-4 transition-colors duration-200"
                  style={{ borderColor: theme.colors.border }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: theme.colors.primary }}
                      >
                        {connection.buddyName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div 
                          className="font-medium transition-colors duration-200"
                          style={{ color: theme.colors.text }}
                        >
                          {connection.buddyName}
                        </div>
                        <div 
                          className="text-sm transition-colors duration-200"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          Connected {new Date(connection.connectedDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center space-x-4 mt-1 text-xs">
                          <span className={getConnectionStrengthColor(connection.connectionStrength)}>
                            ● {getConnectionStrengthText(connection.connectionStrength)} Connection
                          </span>
                          {connection.sharedGoals > 0 && (
                            <span style={{ color: theme.colors.textSecondary }}>
                              🎯 {connection.sharedGoals} shared goals
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => fetchSharedGoals(connection.buddyId)}
                        className="px-3 py-1 rounded text-sm transition-colors"
                        style={{
                          backgroundColor: `${theme.colors.primary}20`,
                          color: theme.colors.primary
                        }}
                      >
                        View Goals
                      </button>
                      <button
                        onClick={() => {
                          const message = prompt('Send encouragement to your buddy:');
                          if (message) sendEncouragement(connection.buddyId, message);
                        }}
                        className="px-3 py-1 rounded text-sm transition-colors"
                        style={{
                          backgroundColor: `${theme.colors.primary}20`,
                          color: theme.colors.primary
                        }}
                      >
                        💪 Encourage
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            {/* Received Requests */}
            {requests.received.length > 0 && (
              <div>
                <h3 
                  className="text-lg font-medium mb-3 transition-colors duration-200"
                  style={{ color: theme.colors.text }}
                >
                  Received Requests
                </h3>
                <div className="space-y-3">
                  {requests.received.map(request => (
                    <div
                      key={request.id}
                      className="border rounded-lg p-4 transition-colors duration-200"
                      style={{ borderColor: theme.colors.border }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div 
                            className="font-medium transition-colors duration-200"
                            style={{ color: theme.colors.text }}
                          >
                            {request.senderName}
                          </div>
                          <div 
                            className="text-sm transition-colors duration-200"
                            style={{ color: theme.colors.textSecondary }}
                          >
                            {request.message || 'Wants to be your workout buddy!'}
                          </div>
                          <div 
                            className="text-xs mt-1 transition-colors duration-200"
                            style={{ color: theme.colors.textSecondary }}
                          >
                            {new Date(request.requestDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleRequest(request.id, 'accept')}
                            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRequest(request.id, 'decline')}
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sent Requests */}
            {requests.sent.length > 0 && (
              <div>
                <h3 
                  className="text-lg font-medium mb-3 transition-colors duration-200"
                  style={{ color: theme.colors.text }}
                >
                  Sent Requests
                </h3>
                <div className="space-y-3">
                  {requests.sent.map(request => (
                    <div
                      key={request.id}
                      className="border rounded-lg p-4 transition-colors duration-200"
                      style={{ borderColor: theme.colors.border }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div 
                            className="font-medium transition-colors duration-200"
                            style={{ color: theme.colors.text }}
                          >
                            {request.receiverName}
                          </div>
                          <div 
                            className="text-sm transition-colors duration-200"
                            style={{ color: theme.colors.textSecondary }}
                          >
                            {request.message || 'No message'}
                          </div>
                          <div 
                            className="text-xs mt-1 transition-colors duration-200"
                            style={{ color: theme.colors.textSecondary }}
                          >
                            Sent {new Date(request.requestDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                          Pending
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {requests.received.length === 0 && requests.sent.length === 0 && (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📬</div>
                <div 
                  className="text-lg font-medium mb-2 transition-colors duration-200"
                  style={{ color: theme.colors.text }}
                >
                  No pending requests
                </div>
                <div 
                  className="text-sm transition-colors duration-200"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Send a buddy request to get started!
                </div>
              </div>
            )}
          </div>
        )}

        {/* Shared Goals Tab */}
        {activeTab === 'shared' && (
          <div className="space-y-4">
            {Object.keys(sharedGoals).length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🎯</div>
                <div 
                  className="text-lg font-medium mb-2 transition-colors duration-200"
                  style={{ color: theme.colors.text }}
                >
                  No shared goals yet
                </div>
                <div 
                  className="text-sm transition-colors duration-200"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Share your goals with buddies for motivation and accountability!
                </div>
              </div>
            ) : (
              Object.entries(sharedGoals).map(([buddyId, goals]) => (
                <div key={buddyId} className="space-y-2">
                  <h3 
                    className="font-medium transition-colors duration-200"
                    style={{ color: theme.colors.text }}
                  >
                    Shared with {buddyId}
                  </h3>
                  {goals.map(goal => (
                    <div
                      key={goal.id}
                      className="border rounded-lg p-3 transition-colors duration-200"
                      style={{ borderColor: theme.colors.border }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div 
                            className="font-medium transition-colors duration-200"
                            style={{ color: theme.colors.text }}
                          >
                            Goal ID: {goal.goalId}
                          </div>
                          <div 
                            className="text-sm transition-colors duration-200"
                            style={{ color: theme.colors.textSecondary }}
                          >
                            {goal.type === 'received' ? 'Shared with you' : 'You shared'} • 
                            Level: {goal.shareLevel}
                          </div>
                        </div>
                        <div 
                          className="text-xs transition-colors duration-200"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          {new Date(goal.sharedDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Add Buddy Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div 
            className="rounded-lg p-6 max-w-md w-full mx-4"
            style={{ backgroundColor: theme.colors.background }}
          >
            <h3 
              className="text-lg font-bold mb-4 transition-colors duration-200"
              style={{ color: theme.colors.text }}
            >
              Send Buddy Request
            </h3>
            <div className="space-y-4">
              <div>
                <label 
                  className="block text-sm font-medium mb-2 transition-colors duration-200"
                  style={{ color: theme.colors.text }}
                >
                  Buddy ID/Username
                </label>
                <input
                  type="text"
                  value={newRequestUserId}
                  onChange={(e) => setNewRequestUserId(e.target.value)}
                  className="w-full px-3 py-2 border rounded transition-colors"
                  style={{
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text
                  }}
                  placeholder="Enter their user ID"
                />
              </div>
              <div>
                <label 
                  className="block text-sm font-medium mb-2 transition-colors duration-200"
                  style={{ color: theme.colors.text }}
                >
                  Message (optional)
                </label>
                <textarea
                  value={newRequestMessage}
                  onChange={(e) => setNewRequestMessage(e.target.value)}
                  className="w-full px-3 py-2 border rounded transition-colors"
                  style={{
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text
                  }}
                  rows="3"
                  placeholder="Hi! Let's be workout buddies!"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={sendBuddyRequest}
                className="flex-1 py-2 rounded transition-colors"
                style={{
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.background
                }}
              >
                Send Request
              </button>
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  setNewRequestUserId('');
                  setNewRequestMessage('');
                }}
                className="flex-1 py-2 rounded transition-colors"
                style={{
                  backgroundColor: theme.colors.border,
                  color: theme.colors.textSecondary
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuddySystem;