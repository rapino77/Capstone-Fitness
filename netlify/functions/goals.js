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

    // Extract goal ID from path if present
    const pathParts = event.path.split('/');
    const goalId = pathParts[pathParts.length - 1];
    const isSpecificGoal = goalId && goalId !== 'goals';

    switch (event.httpMethod) {
      case 'GET':
        return await handleGetGoals(base, event.queryStringParameters, isSpecificGoal ? goalId : null, headers);
      
      case 'POST':
        let parsedBody;
        try {
          parsedBody = JSON.parse(event.body || '{}');
          console.log('Parsed POST body successfully:', parsedBody);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'Invalid JSON in request body',
              message: parseError.message 
            })
          };
        }
        return await handleCreateGoal(base, parsedBody, headers);
      
      case 'PUT':
        if (!isSpecificGoal) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Goal ID required for updates' })
          };
        }
        let putParsedBody;
        try {
          putParsedBody = JSON.parse(event.body || '{}');
          console.log('PUT body parsed successfully:', putParsedBody);
        } catch (parseError) {
          console.error('PUT JSON parse error:', parseError);
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'Invalid JSON in request body',
              message: parseError.message 
            })
          };
        }
        return await handleUpdateGoal(base, goalId, putParsedBody, headers);
      
      case 'DELETE':
        if (!isSpecificGoal) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Goal ID required for deletion' })
          };
        }
        return await handleDeleteGoal(base, goalId, headers);
      
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

  } catch (error) {
    console.error('Goals API error:', error);
    console.error('Error stack:', error.stack);
    console.error('Event body:', event.body);
    console.error('Event method:', event.httpMethod);
    console.error('Environment check:', {
      hasToken: !!process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN,
      hasBaseId: !!process.env.AIRTABLE_BASE_ID
    });
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        debug: {
          method: event.httpMethod,
          hasBody: !!event.body,
          bodyLength: event.body?.length || 0
        }
      })
    };
  }
};

// GET Goals
async function handleGetGoals(base, queryParams, goalId, headers) {
  try {
    const params = queryParams || {};
    
    if (goalId) {
      // Get specific goal
      const record = await base('Goals').find(goalId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: formatGoalRecord(record)
        })
      };
    }

    // Get multiple goals with filtering
    const {
      status = 'Active',
      goalType,
      priority,
      sortBy = 'Created Date',
      sortDirection = 'desc',
      limit = '50'
    } = params;

    let filterFormulas = [];
    
    if (status && status !== 'all') {
      filterFormulas.push(`{Status} = '${status}'`);
    }
    
    if (goalType) {
      filterFormulas.push(`{Goal Type} = '${goalType}'`);
    }

    const queryConfig = {
      pageSize: Math.min(parseInt(limit), 100),
      sort: [{
        field: sortBy,
        direction: sortDirection
      }]
    };

    if (filterFormulas.length > 0) {
      queryConfig.filterByFormula = `AND(${filterFormulas.join(', ')})`;
    }

    const records = [];
    await base('Goals')
      .select(queryConfig)
      .eachPage((pageRecords, fetchNextPage) => {
        records.push(...pageRecords);
        if (records.length < parseInt(limit)) {
          fetchNextPage();
        }
      });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: records.map(formatGoalRecord),
        count: records.length
      })
    };

  } catch (error) {
    throw new Error(`Failed to fetch goals: ${error.message}`);
  }
}

// POST Create Goal
async function handleCreateGoal(base, data, headers) {
  try {
    console.log('Creating goal with data:', JSON.stringify(data, null, 2));
    
    // Check if data exists
    if (!data) {
      throw new Error('No data provided for goal creation');
    }
    
    // Validate required fields - only check fields that actually exist in Airtable
    const requiredFields = ['goalType', 'targetValue', 'targetDate'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      console.log('Missing fields:', missingFields);
      console.log('Received data:', data);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          missingFields,
          receivedFields: Object.keys(data)
        })
      };
    }

    // Validate goal type
    const validGoalTypes = ['Body Weight', 'Exercise PR', 'Frequency', 'Volume', 'Custom'];
    if (!validGoalTypes.includes(data.goalType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid goal type' })
      };
    }

    // Validate target date is in future
    const targetDate = new Date(data.targetDate);
    if (targetDate <= new Date()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Target date must be in the future' })
      };
    }

    // Validate target value is positive
    if (data.targetValue <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Target value must be positive' })
      };
    }

    // Create goal record - using only confirmed field names from Airtable
    const goalData = {
      'User ID': data.userId || 'default-user',
      'Goal Type': data.goalType,
      'Target Value': Number(data.targetValue),
      'Current Value': Number(data.currentValue) || 0,
      'Target Date': data.targetDate,
      'Exercise Name': data.exerciseName || '',
      'Status': 'Active'
    };
    
    // Log what we're trying to create
    console.log('Creating goal with data:', goalData);
    
    const record = await base('Goals').create(goalData);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Goal created successfully',
        data: formatGoalRecord(record)
      })
    };

  } catch (error) {
    throw new Error(`Failed to create goal: ${error.message}`);
  }
}

// PUT Update Goal
async function handleUpdateGoal(base, goalId, data, headers) {
  let updateFields = {};
  
  try {
    console.log('=== PUT UPDATE GOAL DEBUG ===');
    console.log('Goal ID:', goalId);
    console.log('Update data:', data);
    
    if (data.targetValue) updateFields['Target Value'] = Number(data.targetValue);
    if (data.currentValue !== undefined) updateFields['Current Value'] = Number(data.currentValue);
    if (data.targetDate) updateFields['Target Date'] = data.targetDate;
    if (data.status) updateFields['Status'] = data.status;
    if (data.exerciseName !== undefined) updateFields['Exercise Name'] = data.exerciseName;
    
    console.log('Update fields:', updateFields);

    // Don't try to update Created Date - it's auto-managed by Airtable
    // Only update the Status field when archiving
    
    console.log('Attempting to update goal with fields:', updateFields);
    
    // Validate that we have at least one field to update
    if (Object.keys(updateFields).length === 0) {
      throw new Error('No valid fields provided for update');
    }
    
    // Ensure goalId is valid
    if (!goalId || typeof goalId !== 'string') {
      throw new Error('Invalid goal ID provided');
    }
    
    const record = await base('Goals').update(goalId, updateFields);
    console.log('Goal updated successfully:', record.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Goal updated successfully',
        data: formatGoalRecord(record)
      })
    };

  } catch (error) {
    console.error('Update goal error details:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Goal ID:', goalId);
    console.error('Update fields:', updateFields);
    console.error('Request data:', data);
    
    // Handle Airtable-specific errors
    let errorMessage = error.message;
    let statusCode = 500;
    
    if (error.message?.includes('NOT_FOUND')) {
      errorMessage = 'Goal not found';
      statusCode = 404;
    } else if (error.message?.includes('INVALID_FIELD')) {
      errorMessage = 'Invalid field in update request';
      statusCode = 400;
    } else if (error.message?.includes('AUTHENTICATION_REQUIRED')) {
      errorMessage = 'Airtable authentication failed';
      statusCode = 401;
    }
    
    return {
      statusCode: statusCode,
      headers,
      body: JSON.stringify({
        error: 'Failed to update goal',
        message: errorMessage,
        goalId: goalId,
        originalError: error.message,
        debug: {
          updateFields: updateFields,
          hasUpdateFields: Object.keys(updateFields).length > 0,
          goalIdType: typeof goalId,
          goalIdLength: goalId?.length
        }
      })
    };
  }
}

// DELETE Goal
async function handleDeleteGoal(base, goalId, headers) {
  try {
    await base('Goals').destroy(goalId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Goal deleted successfully'
      })
    };

  } catch (error) {
    throw new Error(`Failed to delete goal: ${error.message}`);
  }
}

// Helper function to format goal records
function formatGoalRecord(record) {
  const currentValue = record.get('Current Value') || 0;
  const targetValue = record.get('Target Value') || 1;
  const progressPercentage = Math.min((currentValue / targetValue) * 100, 100);
  
  // Calculate days remaining
  const targetDate = new Date(record.get('Target Date'));
  const today = new Date();
  const daysRemaining = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
  
  // Build goalTitle from available data
  const goalType = record.get('Goal Type');
  const exerciseName = record.get('Exercise Name');
  let goalTitle = goalType;
  
  if (exerciseName) {
    if (goalType === 'Exercise PR') {
      goalTitle = `${exerciseName} PR Goal`;
    } else if (goalType === 'Frequency') {
      goalTitle = `${exerciseName} Frequency Goal`;
    }
  }
  
  return {
    id: record.id,
    userId: record.get('User ID'),
    goalType: goalType,
    goalTitle: goalTitle,
    targetValue: record.get('Target Value'),
    currentValue: currentValue,
    targetDate: record.get('Target Date'),
    exerciseName: record.get('Exercise Name') || '',
    status: record.get('Status'),
    priority: 'Medium', // Default since field may not exist
    notes: '', // Default since field may not exist
    progressPercentage: Math.round(progressPercentage * 100) / 100,
    createdDate: record.get('Target Date'), // Use target date as created date fallback
    daysRemaining: daysRemaining,
    milestoneStatus: calculateMilestoneStatus(progressPercentage),
    isOverdue: daysRemaining < 0 && record.get('Status') === 'Active',
    urgencyLevel: calculateUrgencyLevel(daysRemaining, progressPercentage),
    completionDate: record.get('Status') === 'Archived' ? new Date().toISOString().split('T')[0] : null
  };
}

function calculateMilestoneStatus(progressPercentage) {
  if (progressPercentage >= 100) return 'completed';
  if (progressPercentage >= 75) return 'milestone_75';
  if (progressPercentage >= 50) return 'milestone_50';
  if (progressPercentage >= 25) return 'milestone_25';
  return 'started';
}

function calculateUrgencyLevel(daysRemaining, progressPercentage) {
  if (daysRemaining < 0) return 'overdue';
  if (daysRemaining <= 7 && progressPercentage < 80) return 'critical';
  if (daysRemaining <= 14 && progressPercentage < 60) return 'urgent';
  if (daysRemaining <= 30 && progressPercentage < 40) return 'moderate';
  return 'low';
}