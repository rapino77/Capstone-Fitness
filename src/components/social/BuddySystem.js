import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { MobileButton } from '../common/MobileOptimized';
import { MobileToast } from '../common/MobileStatusBar';
import useMobileEnhancements from '../../hooks/useMobileEnhancements';
import axios from 'axios';

const BuddySystem = ({ userId = 'default-user' }) => {
  const { theme } = useTheme();
  const { hapticFeedback } = useMobileEnhancements();
  const [activeTab, setActiveTab] = useState('connections');
  const [connections, setConnections] = useState([]);
  const [requests, setRequests] = useState({ sent: [], received: [] });
  const [sharedGoals, setSharedGoals] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showInviteLinkModal, setShowInviteLinkModal] = useState(false);
  const [newRequestUserId, setNewRequestUserId] = useState('');
  const [newRequestMessage, setNewRequestMessage] = useState('');
  const [invitationLink, setInvitationLink] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info');
  
  // Show toast message helper
  const showToastMessage = useCallback((message, type = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  }, []);

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

  // Handle invitation from shared link
  const handleInvitationFromLink = useCallback(async (inviteToken, fromUser) => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/buddy-system`, {
        action: 'accept-invite-link',
        inviteToken,
        fromUser
      }, {
        params: { userId }
      });

      if (response.data.success) {
        showToastMessage(`You're now buddies with ${fromUser}! 🤝`, 'success');
        hapticFeedback.success();
        fetchBuddyData(); // Refresh buddy data
        
        // Clean up URL
        const url = new URL(window.location);
        url.searchParams.delete('buddy_invite');
        url.searchParams.delete('from');
        window.history.replaceState({}, document.title, url);
      } else {
        showToastMessage(response.data.error || 'Failed to accept buddy invitation', 'error');
      }
    } catch (err) {
      console.error('Error accepting invitation from link:', err);
      showToastMessage('Failed to accept buddy invitation', 'error');
    }
  }, [userId, hapticFeedback, fetchBuddyData, showToastMessage]);

  useEffect(() => {
    fetchBuddyData();
  }, [fetchBuddyData]);

  // Check for invitation token in URL on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get('buddy_invite');
    const fromUser = urlParams.get('from');
    
    if (inviteToken && fromUser) {
      handleInvitationFromLink(inviteToken, fromUser);
    }
  }, [handleInvitationFromLink]);

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
        showToastMessage('Encouragement sent! 🎉', 'success');
        hapticFeedback.success();
      }
    } catch (err) {
      console.error('Error sending encouragement:', err);
      setError(err.response?.data?.error || 'Failed to send encouragement');
    }
  };

  // Generate invitation link
  const generateInvitationLink = async () => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/buddy-system`, {
        action: 'generate-invite-link'
      }, {
        params: { userId }
      });

      if (response.data.success) {
        const { inviteToken } = response.data;
        const baseUrl = window.location.origin + window.location.pathname;
        const link = `${baseUrl}?buddy_invite=${inviteToken}&from=${encodeURIComponent(userId)}`;
        setInvitationLink(link);
        setShowInviteLinkModal(true);
        hapticFeedback.light();
      } else {
        showToastMessage('Failed to generate invitation link', 'error');
      }
    } catch (err) {
      console.error('Error generating invitation link:', err);
      showToastMessage('Failed to generate invitation link', 'error');
    }
  };


  // Copy invitation link to clipboard
  const copyInvitationLink = async () => {
    try {
      await navigator.clipboard.writeText(invitationLink);
      showToastMessage('Invitation link copied to clipboard! 📋', 'success');
      hapticFeedback.medium();
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = invitationLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToastMessage('Invitation link copied! 📋', 'success');
      hapticFeedback.medium();
    }
  };

  // Share invitation link (Web Share API)
  const shareInvitationLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me as a Workout Buddy!',
          text: `Hey! Join me as a workout buddy on Fitness Command Center. Let's motivate each other to reach our fitness goals! 💪`,
          url: invitationLink
        });
        hapticFeedback.light();
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.log('Error sharing:', err);
          copyInvitationLink(); // Fallback to copy
        }
      }
    } else {
      copyInvitationLink(); // Fallback to copy
    }
  };

  // Copy user ID to clipboard
  const copyUserId = async () => {
    try {
      await navigator.clipboard.writeText(userId);
      showToastMessage('Your User ID copied to clipboard! 📋', 'success');
      hapticFeedback.medium();
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = userId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToastMessage('User ID copied! 📋', 'success');
      hapticFeedback.medium();
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
          <div className="flex space-x-2">
            <MobileButton
              onClick={generateInvitationLink}
              variant="secondary"
              size="medium"
              className="hidden sm:block"
            >
              🔗 Share Link
            </MobileButton>
            <button
              onClick={generateInvitationLink}
              className="sm:hidden px-3 py-2 rounded-full transition-all duration-200 hover:scale-105"
              style={{
                backgroundColor: `${theme.colors.primary}20`,
                color: theme.colors.primary
              }}
            >
              🔗
            </button>
            <MobileButton
              onClick={() => setShowRequestModal(true)}
              variant="primary"
              size="medium"
            >
              <span className="hidden sm:inline">+ Add Buddy</span>
              <span className="sm:hidden">+</span>
            </MobileButton>
          </div>
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

      {/* User ID Display Section */}
      <div 
        className="border-b px-4 sm:px-6 py-5 transition-colors duration-200 relative overflow-hidden"
        style={{ 
          borderColor: theme.colors.border,
          backgroundColor: theme.mode === 'dark' ? `${theme.colors.primary}15` : `${theme.colors.primary}08`
        }}
      >
        {/* Subtle pattern background */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, ${theme.colors.primary} 2px, transparent 2px), radial-gradient(circle at 75% 75%, ${theme.colors.primary} 1px, transparent 1px)`,
            backgroundSize: '30px 30px, 20px 20px'
          }}
        />
        
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-lg flex-shrink-0"
                style={{ backgroundColor: theme.colors.primary }}
              >
                {userId.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div 
                  className="text-xs sm:text-sm font-semibold mb-1 transition-colors duration-200"
                  style={{ color: theme.colors.text }}
                >
                  Your User ID:
                </div>
                <div 
                  className="font-bold text-base sm:text-xl font-mono px-2 sm:px-3 py-2 rounded-lg border-2 transition-colors duration-200 shadow-sm break-all"
                  style={{ 
                    color: theme.colors.text,
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.primary,
                    boxShadow: `0 2px 8px ${theme.colors.primary}20`
                  }}
                >
                  {userId}
                </div>
              </div>
            </div>
            <div className="flex justify-center sm:justify-end space-x-2">
              <MobileButton
                onClick={copyUserId}
                variant="primary"
                size="small"
                className="text-xs shadow-lg px-4 sm:px-6"
              >
                <span className="hidden sm:inline">📋 Copy User ID</span>
                <span className="sm:hidden">📋 Copy</span>
              </MobileButton>
            </div>
          </div>
          <div 
            className="mt-4 text-xs sm:text-sm text-center font-medium p-3 rounded-lg transition-colors duration-200"
            style={{ 
              color: theme.colors.text,
              backgroundColor: theme.colors.background + '90',
              border: `1px solid ${theme.colors.border}`,
              backdropFilter: 'blur(8px)'
            }}
          >
            💡 <span className="hidden sm:inline">Share this ID with friends so they can add you manually using the "Add Buddy" button</span>
            <span className="sm:hidden">Share this ID with friends to add you as their buddy</span>
          </div>
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
              <div className="text-center py-8 space-y-6">
                <div>
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
                
                {/* Connection options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
                  <div 
                    className="p-4 rounded-xl border-2 border-dashed transition-colors duration-200"
                    style={{ borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}05` }}
                  >
                    <div className="text-2xl mb-2">🔗</div>
                    <div 
                      className="font-semibold text-sm mb-1 transition-colors duration-200"
                      style={{ color: theme.colors.text }}
                    >
                      Share Link
                    </div>
                    <div 
                      className="text-xs transition-colors duration-200"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      Send a link that automatically adds you as buddies
                    </div>
                    <MobileButton
                      onClick={generateInvitationLink}
                      variant="primary"
                      size="small"
                      className="mt-3 w-full text-xs"
                    >
                      Generate Link
                    </MobileButton>
                  </div>
                  
                  <div 
                    className="p-4 rounded-xl border-2 border-dashed transition-colors duration-200"
                    style={{ borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}05` }}
                  >
                    <div className="text-2xl mb-2">🆔</div>
                    <div 
                      className="font-semibold text-sm mb-1 transition-colors duration-200"
                      style={{ color: theme.colors.text }}
                    >
                      Manual Add
                    </div>
                    <div 
                      className="text-xs transition-colors duration-200"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      Enter your friend's User ID to send a request
                    </div>
                    <MobileButton
                      onClick={() => setShowRequestModal(true)}
                      variant="secondary"
                      size="small"
                      className="mt-3 w-full text-xs"
                    >
                      Add by ID
                    </MobileButton>
                  </div>
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
              className="text-lg font-bold mb-2 transition-colors duration-200"
              style={{ color: theme.colors.text }}
            >
              Add Workout Buddy
            </h3>
            <p 
              className="text-sm mb-4 opacity-75 transition-colors duration-200"
              style={{ color: theme.colors.textSecondary }}
            >
              Enter your friend's User ID to send them a buddy request
            </p>
            <div className="space-y-4">
              <div>
                <label 
                  className="block text-sm font-medium mb-2 transition-colors duration-200"
                  style={{ color: theme.colors.text }}
                >
                  Friend's User ID
                </label>
                <input
                  type="text"
                  value={newRequestUserId}
                  onChange={(e) => setNewRequestUserId(e.target.value)}
                  className="w-full px-3 py-3 border rounded-lg transition-colors font-mono"
                  style={{
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text
                  }}
                  placeholder="e.g., default-user"
                />
                <div 
                  className="mt-1 text-xs opacity-60 transition-colors duration-200"
                  style={{ color: theme.colors.textSecondary }}
                >
                  💡 Ask your friend for their User ID from the Buddies section
                </div>
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

      {/* Invitation Link Modal */}
      {showInviteLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
            style={{ backgroundColor: theme.colors.background }}
          >
            {/* Header */}
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white text-center"
            >
              <div className="text-4xl mb-2">🔗</div>
              <h3 className="text-xl font-bold mb-2">Share Your Buddy Link!</h3>
              <p className="text-sm opacity-90">
                Send this link to friends to instantly connect as workout buddies
              </p>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <label 
                  className="block text-sm font-semibold mb-2 transition-colors duration-200"
                  style={{ color: theme.colors.text }}
                >
                  Your Invitation Link:
                </label>
                <div 
                  className="p-3 rounded-xl border-2 border-dashed break-all text-sm font-mono"
                  style={{ 
                    backgroundColor: `${theme.colors.primary}08`,
                    borderColor: theme.colors.primary,
                    color: theme.colors.text
                  }}
                >
                  {invitationLink}
                </div>
              </div>
              
              <div className="text-xs text-center opacity-70" style={{ color: theme.colors.textSecondary }}>
                ✨ Anyone who clicks this link will automatically be added as your workout buddy!
              </div>
              
              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                <MobileButton
                  onClick={shareInvitationLink}
                  variant="primary"
                  size="medium"
                  fullWidth
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  📱 Share Link
                </MobileButton>
                <MobileButton
                  onClick={copyInvitationLink}
                  variant="secondary"
                  size="medium"
                  fullWidth
                >
                  📋 Copy Link
                </MobileButton>
              </div>
              
              {/* Popular sharing options */}
              <div className="border-t pt-4 mt-4" style={{ borderColor: theme.colors.border }}>
                <p className="text-xs font-semibold mb-3 text-center" style={{ color: theme.colors.textSecondary }}>
                  Quick Share Options:
                </p>
                <div className="flex justify-center space-x-4">
                  {[
                    { icon: '💬', label: 'Message', action: () => window.open(`sms:?body=${encodeURIComponent(`Hey! Join me as a workout buddy: ${invitationLink}`)}`) },
                    { icon: '📧', label: 'Email', action: () => window.open(`mailto:?subject=${encodeURIComponent('Join me as a workout buddy!')}&body=${encodeURIComponent(`Hey! Join me as a workout buddy on Fitness Command Center. Let's motivate each other to reach our fitness goals! 💪\n\n${invitationLink}`)}`) },
                    { icon: '📋', label: 'Copy', action: copyInvitationLink }
                  ].map((option, index) => (
                    <button
                      key={index}
                      onClick={option.action}
                      className="flex flex-col items-center space-y-1 p-2 rounded-xl transition-all duration-200 hover:scale-110 hover:bg-opacity-20"
                      style={{ backgroundColor: `${theme.colors.primary}10` }}
                    >
                      <span className="text-lg">{option.icon}</span>
                      <span className="text-xs font-medium" style={{ color: theme.colors.textSecondary }}>
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t flex justify-center" style={{ borderColor: theme.colors.border }}>
              <MobileButton
                onClick={() => setShowInviteLinkModal(false)}
                variant="outline"
                size="medium"
              >
                Close
              </MobileButton>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Toast Notification */}
      <MobileToast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        duration={3000}
      />
    </div>
  );
};

export default BuddySystem;