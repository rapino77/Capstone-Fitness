const Airtable = require('airtable');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Check environment variables
    if (!process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN) {
      throw new Error('AIRTABLE_PERSONAL_ACCESS_TOKEN environment variable is not set');
    }
    if (!process.env.AIRTABLE_BASE_ID) {
      throw new Error('AIRTABLE_BASE_ID environment variable is not set');
    }

    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    // Parse request
    const params = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};
    const { userId = 'default-user' } = params;

    let response;

    switch (event.httpMethod) {
      case 'GET':
        response = await handleGetRequest(base, params, userId);
        break;
      case 'POST':
        response = await handlePostRequest(base, body, userId);
        break;
      case 'PUT':
        response = await handlePutRequest(base, body, userId);
        break;
      case 'DELETE':
        response = await handleDeleteRequest(base, params, userId);
        break;
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Buddy system error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

async function handleGetRequest(base, params, userId) {
  const { action, buddyId, connectionId } = params;

  switch (action) {
    case 'connections':
      return await getBuddyConnections(base, userId);
    
    case 'requests':
      return await getBuddyRequests(base, userId);
    
    case 'shared-goals':
      return await getSharedGoals(base, userId, buddyId);
    
    case 'buddy-activity':
      return await getBuddyActivity(base, userId, buddyId);
    
    case 'leaderboard':
      return await getBuddyLeaderboard(base, userId);
    
    case 'search':
      return await searchBuddies(base, params.query, userId);
    
    default:
      return { error: 'Invalid action' };
  }
}

async function handlePostRequest(base, body, userId) {
  const { action } = body;

  switch (action) {
    case 'send-request':
      return await sendBuddyRequest(base, userId, body.targetUserId, body.message);
    
    case 'accept-request':
      return await acceptBuddyRequest(base, body.requestId, userId);
    
    case 'decline-request':
      return await declineBuddyRequest(base, body.requestId, userId);
    
    case 'share-goal':
      return await shareGoalWithBuddy(base, userId, body.goalId, body.buddyId, body.shareLevel);
    
    case 'send-encouragement':
      return await sendEncouragement(base, userId, body.buddyId, body.message, body.type);
    
    case 'create-challenge':
      return await createBuddyChallenge(base, userId, body.buddyId, body.challenge);
    
    default:
      return { error: 'Invalid action' };
  }
}

async function handlePutRequest(base, body, userId) {
  const { action } = body;

  switch (action) {
    case 'update-connection':
      return await updateBuddyConnection(base, body.connectionId, userId, body.updates);
    
    case 'update-shared-goal':
      return await updateSharedGoal(base, body.shareId, userId, body.updates);
    
    default:
      return { error: 'Invalid action' };
  }
}

async function handleDeleteRequest(base, params, userId) {
  const { action, connectionId, shareId } = params;

  switch (action) {
    case 'remove-connection':
      return await removeBuddyConnection(base, connectionId, userId);
    
    case 'unshare-goal':
      return await unshareGoal(base, shareId, userId);
    
    default:
      return { error: 'Invalid action' };
  }
}

// Get all buddy connections for a user
async function getBuddyConnections(base, userId) {
  console.log('Getting buddy connections for:', userId);
  
  const connections = [];
  
  try {
    // Fetch connections where user is either sender or receiver
    await base('Buddy_Connections')
      .select({
        filterByFormula: `OR(
          AND({Sender_User_ID} = '${userId}', {Status} = 'accepted'),
          AND({Receiver_User_ID} = '${userId}', {Status} = 'accepted')
        )`,
        sort: [{ field: 'Connected_Date', direction: 'desc' }]
      })
      .eachPage((records, fetchNextPage) => {
        records.forEach(record => {
          const senderId = record.get('Sender_User_ID');
          const receiverId = record.get('Receiver_User_ID');
          const buddyId = senderId === userId ? receiverId : senderId;
          
          connections.push({
            id: record.id,
            buddyId: buddyId,
            buddyName: record.get(senderId === userId ? 'Receiver_Name' : 'Sender_Name') || buddyId,
            connectedDate: record.get('Connected_Date'),
            connectionStrength: calculateConnectionStrength(record),
            sharedGoals: record.get('Shared_Goals_Count') || 0,
            lastInteraction: record.get('Last_Interaction'),
            privacyLevel: record.get('Privacy_Level') || 'standard'
          });
        });
        fetchNextPage();
      });
  } catch (error) {
    console.error('Error fetching buddy connections:', error);
    return { success: false, error: error.message };
  }

  return {
    success: true,
    connections,
    totalConnections: connections.length
  };
}

// Get pending buddy requests
async function getBuddyRequests(base, userId) {
  console.log('Getting buddy requests for:', userId);
  
  const sentRequests = [];
  const receivedRequests = [];
  
  try {
    // Get sent requests
    await base('Buddy_Connections')
      .select({
        filterByFormula: `AND({Sender_User_ID} = '${userId}', {Status} = 'pending')`,
        sort: [{ field: 'Request_Date', direction: 'desc' }]
      })
      .eachPage((records, fetchNextPage) => {
        records.forEach(record => {
          sentRequests.push({
            id: record.id,
            receiverId: record.get('Receiver_User_ID'),
            receiverName: record.get('Receiver_Name') || record.get('Receiver_User_ID'),
            message: record.get('Request_Message'),
            requestDate: record.get('Request_Date'),
            status: 'pending'
          });
        });
        fetchNextPage();
      });

    // Get received requests
    await base('Buddy_Connections')
      .select({
        filterByFormula: `AND({Receiver_User_ID} = '${userId}', {Status} = 'pending')`,
        sort: [{ field: 'Request_Date', direction: 'desc' }]
      })
      .eachPage((records, fetchNextPage) => {
        records.forEach(record => {
          receivedRequests.push({
            id: record.id,
            senderId: record.get('Sender_User_ID'),
            senderName: record.get('Sender_Name') || record.get('Sender_User_ID'),
            message: record.get('Request_Message'),
            requestDate: record.get('Request_Date'),
            status: 'pending'
          });
        });
        fetchNextPage();
      });
  } catch (error) {
    console.error('Error fetching buddy requests:', error);
    return { success: false, error: error.message };
  }

  return {
    success: true,
    sentRequests,
    receivedRequests,
    totalPending: sentRequests.length + receivedRequests.length
  };
}

// Send a buddy request
async function sendBuddyRequest(base, senderId, receiverId, message = '') {
  console.log('Sending buddy request:', { senderId, receiverId });
  
  if (senderId === receiverId) {
    return { success: false, error: 'Cannot send request to yourself' };
  }

  try {
    // Check if connection already exists
    const existingConnections = [];
    await base('Buddy_Connections')
      .select({
        filterByFormula: `OR(
          AND({Sender_User_ID} = '${senderId}', {Receiver_User_ID} = '${receiverId}'),
          AND({Sender_User_ID} = '${receiverId}', {Receiver_User_ID} = '${senderId}')
        )`
      })
      .eachPage((records, fetchNextPage) => {
        existingConnections.push(...records);
        fetchNextPage();
      });

    if (existingConnections.length > 0) {
      const status = existingConnections[0].get('Status');
      if (status === 'accepted') {
        return { success: false, error: 'Already connected' };
      } else if (status === 'pending') {
        return { success: false, error: 'Request already pending' };
      }
    }

    // Create new buddy request
    const record = await base('Buddy_Connections').create({
      'Sender_User_ID': senderId,
      'Receiver_User_ID': receiverId,
      'Sender_Name': senderId, // This could be enhanced with actual user names
      'Receiver_Name': receiverId,
      'Status': 'pending',
      'Request_Date': new Date().toISOString(),
      'Request_Message': message,
      'Privacy_Level': 'standard'
    });

    return {
      success: true,
      requestId: record.id,
      message: 'Buddy request sent successfully'
    };
  } catch (error) {
    console.error('Error sending buddy request:', error);
    return { success: false, error: error.message };
  }
}

// Accept a buddy request
async function acceptBuddyRequest(base, requestId, userId) {
  console.log('Accepting buddy request:', { requestId, userId });
  
  try {
    // Verify the request exists and user is the receiver
    const record = await base('Buddy_Connections').find(requestId);
    
    if (record.get('Receiver_User_ID') !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (record.get('Status') !== 'pending') {
      return { success: false, error: 'Request is not pending' };
    }

    // Update the request to accepted
    const updatedRecord = await base('Buddy_Connections').update(requestId, {
      'Status': 'accepted',
      'Connected_Date': new Date().toISOString(),
      'Last_Interaction': new Date().toISOString()
    });

    return {
      success: true,
      connection: {
        id: updatedRecord.id,
        buddyId: record.get('Sender_User_ID'),
        buddyName: record.get('Sender_Name'),
        connectedDate: updatedRecord.get('Connected_Date')
      },
      message: 'Buddy request accepted'
    };
  } catch (error) {
    console.error('Error accepting buddy request:', error);
    return { success: false, error: error.message };
  }
}

// Decline a buddy request
async function declineBuddyRequest(base, requestId, userId) {
  console.log('Declining buddy request:', { requestId, userId });
  
  try {
    const record = await base('Buddy_Connections').find(requestId);
    
    if (record.get('Receiver_User_ID') !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (record.get('Status') !== 'pending') {
      return { success: false, error: 'Request is not pending' };
    }

    // Delete the request record
    await base('Buddy_Connections').destroy(requestId);

    return {
      success: true,
      message: 'Buddy request declined'
    };
  } catch (error) {
    console.error('Error declining buddy request:', error);
    return { success: false, error: error.message };
  }
}

// Share a goal with a buddy
async function shareGoalWithBuddy(base, userId, goalId, buddyId, shareLevel = 'progress') {
  console.log('Sharing goal with buddy:', { userId, goalId, buddyId, shareLevel });
  
  try {
    // Verify buddy connection exists
    const connections = [];
    await base('Buddy_Connections')
      .select({
        filterByFormula: `OR(
          AND({Sender_User_ID} = '${userId}', {Receiver_User_ID} = '${buddyId}', {Status} = 'accepted'),
          AND({Sender_User_ID} = '${buddyId}', {Receiver_User_ID} = '${userId}', {Status} = 'accepted')
        )`
      })
      .eachPage((records, fetchNextPage) => {
        connections.push(...records);
        fetchNextPage();
      });

    if (connections.length === 0) {
      return { success: false, error: 'No connection with this buddy' };
    }

    // Check if goal is already shared
    const existingShares = [];
    await base('Shared_Goals')
      .select({
        filterByFormula: `AND({Owner_User_ID} = '${userId}', {Goal_ID} = '${goalId}', {Shared_With_User_ID} = '${buddyId}')`
      })
      .eachPage((records, fetchNextPage) => {
        existingShares.push(...records);
        fetchNextPage();
      });

    if (existingShares.length > 0) {
      // Update existing share
      const updatedRecord = await base('Shared_Goals').update(existingShares[0].id, {
        'Share_Level': shareLevel,
        'Updated_Date': new Date().toISOString()
      });

      return {
        success: true,
        shareId: updatedRecord.id,
        message: 'Goal sharing updated'
      };
    } else {
      // Create new share
      const record = await base('Shared_Goals').create({
        'Owner_User_ID': userId,
        'Goal_ID': goalId,
        'Shared_With_User_ID': buddyId,
        'Share_Level': shareLevel,
        'Shared_Date': new Date().toISOString(),
        'Updated_Date': new Date().toISOString(),
        'Is_Active': true
      });

      return {
        success: true,
        shareId: record.id,
        message: 'Goal shared successfully'
      };
    }
  } catch (error) {
    console.error('Error sharing goal:', error);
    return { success: false, error: error.message };
  }
}

// Get shared goals between user and buddy
async function getSharedGoals(base, userId, buddyId) {
  console.log('Getting shared goals:', { userId, buddyId });
  
  const sharedGoals = [];
  
  try {
    // Get goals shared with user by buddy
    await base('Shared_Goals')
      .select({
        filterByFormula: `AND({Shared_With_User_ID} = '${userId}', {Owner_User_ID} = '${buddyId}', {Is_Active} = TRUE())`,
        sort: [{ field: 'Shared_Date', direction: 'desc' }]
      })
      .eachPage((records, fetchNextPage) => {
        records.forEach(record => {
          sharedGoals.push({
            id: record.id,
            goalId: record.get('Goal_ID'),
            ownerId: record.get('Owner_User_ID'),
            ownerName: buddyId, // Could be enhanced with actual names
            shareLevel: record.get('Share_Level'),
            sharedDate: record.get('Shared_Date'),
            type: 'received'
          });
        });
        fetchNextPage();
      });

    // Get goals shared by user with buddy
    await base('Shared_Goals')
      .select({
        filterByFormula: `AND({Owner_User_ID} = '${userId}', {Shared_With_User_ID} = '${buddyId}', {Is_Active} = TRUE())`,
        sort: [{ field: 'Shared_Date', direction: 'desc' }]
      })
      .eachPage((records, fetchNextPage) => {
        records.forEach(record => {
          sharedGoals.push({
            id: record.id,
            goalId: record.get('Goal_ID'),
            ownerId: record.get('Owner_User_ID'),
            ownerName: userId,
            shareLevel: record.get('Share_Level'),
            sharedDate: record.get('Shared_Date'),
            type: 'shared'
          });
        });
        fetchNextPage();
      });

    return {
      success: true,
      sharedGoals,
      totalShared: sharedGoals.length
    };
  } catch (error) {
    console.error('Error getting shared goals:', error);
    return { success: false, error: error.message };
  }
}

// Send encouragement to buddy
async function sendEncouragement(base, senderId, receiverId, message, type = 'general') {
  console.log('Sending encouragement:', { senderId, receiverId, type });
  
  try {
    const record = await base('Buddy_Interactions').create({
      'Sender_User_ID': senderId,
      'Receiver_User_ID': receiverId,
      'Interaction_Type': 'encouragement',
      'Subtype': type,
      'Message': message,
      'Date': new Date().toISOString(),
      'Is_Read': false
    });

    // Update last interaction date in connection
    const connections = [];
    await base('Buddy_Connections')
      .select({
        filterByFormula: `OR(
          AND({Sender_User_ID} = '${senderId}', {Receiver_User_ID} = '${receiverId}', {Status} = 'accepted'),
          AND({Sender_User_ID} = '${receiverId}', {Receiver_User_ID} = '${senderId}', {Status} = 'accepted')
        )`
      })
      .eachPage((records, fetchNextPage) => {
        connections.push(...records);
        fetchNextPage();
      });

    if (connections.length > 0) {
      await base('Buddy_Connections').update(connections[0].id, {
        'Last_Interaction': new Date().toISOString()
      });
    }

    return {
      success: true,
      interactionId: record.id,
      message: 'Encouragement sent successfully'
    };
  } catch (error) {
    console.error('Error sending encouragement:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to calculate connection strength
function calculateConnectionStrength(record) {
  const connectedDate = new Date(record.get('Connected_Date'));
  const lastInteraction = record.get('Last_Interaction') ? new Date(record.get('Last_Interaction')) : connectedDate;
  const now = new Date();
  
  const daysSinceConnection = Math.floor((now - connectedDate) / (1000 * 60 * 60 * 24));
  const daysSinceLastInteraction = Math.floor((now - lastInteraction) / (1000 * 60 * 60 * 24));
  
  const sharedGoals = record.get('Shared_Goals_Count') || 0;
  const interactionCount = record.get('Interaction_Count') || 0;
  
  // Calculate strength score (0-100)
  let score = 50; // Base score
  
  // Longevity bonus
  if (daysSinceConnection > 30) score += 10;
  if (daysSinceConnection > 90) score += 10;
  
  // Recent activity bonus
  if (daysSinceLastInteraction <= 7) score += 20;
  else if (daysSinceLastInteraction <= 14) score += 10;
  else if (daysSinceLastInteraction > 30) score -= 20;
  
  // Engagement bonuses
  score += Math.min(sharedGoals * 5, 20); // Max 20 points for shared goals
  score += Math.min(interactionCount * 2, 20); // Max 20 points for interactions
  
  return Math.max(0, Math.min(100, score));
}

// Search for potential buddies (simplified version)
async function searchBuddies(base, query, userId) {
  // In a real implementation, this would search a Users table
  // For now, return empty results
  return {
    success: true,
    results: [],
    message: 'Search functionality requires user management system'
  };
}

// Get buddy activity/leaderboard
async function getBuddyLeaderboard(base, userId) {
  const connections = await getBuddyConnections(base, userId);
  
  if (!connections.success) {
    return connections;
  }

  // Sort by connection strength and recent activity
  const leaderboard = connections.connections
    .sort((a, b) => {
      // Prioritize by connection strength, then by recent interaction
      if (b.connectionStrength !== a.connectionStrength) {
        return b.connectionStrength - a.connectionStrength;
      }
      return new Date(b.lastInteraction || 0) - new Date(a.lastInteraction || 0);
    })
    .map((buddy, index) => ({
      ...buddy,
      rank: index + 1
    }));

  return {
    success: true,
    leaderboard,
    topBuddy: leaderboard[0] || null
  };
}

// Remove buddy connection
async function removeBuddyConnection(base, connectionId, userId) {
  try {
    const record = await base('Buddy_Connections').find(connectionId);
    
    // Verify user is part of this connection
    const senderId = record.get('Sender_User_ID');
    const receiverId = record.get('Receiver_User_ID');
    
    if (senderId !== userId && receiverId !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Instead of deleting, mark as removed
    await base('Buddy_Connections').update(connectionId, {
      'Status': 'removed',
      'Removed_Date': new Date().toISOString(),
      'Removed_By': userId
    });

    // Also deactivate shared goals
    const buddyId = senderId === userId ? receiverId : senderId;
    const sharedGoals = [];
    
    await base('Shared_Goals')
      .select({
        filterByFormula: `OR(
          AND({Owner_User_ID} = '${userId}', {Shared_With_User_ID} = '${buddyId}'),
          AND({Owner_User_ID} = '${buddyId}', {Shared_With_User_ID} = '${userId}')
        )`
      })
      .eachPage((records, fetchNextPage) => {
        sharedGoals.push(...records);
        fetchNextPage();
      });

    for (const shareRecord of sharedGoals) {
      await base('Shared_Goals').update(shareRecord.id, {
        'Is_Active': false,
        'Removed_Date': new Date().toISOString()
      });
    }

    return {
      success: true,
      message: 'Buddy connection removed'
    };
  } catch (error) {
    console.error('Error removing connection:', error);
    return { success: false, error: error.message };
  }
}