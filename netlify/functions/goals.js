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
        return await handleCreateGoal(base, JSON.parse(event.body), headers);
      
      case 'PUT':
        if (!isSpecificGoal) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Goal ID required for updates' })
          };
        }
        return await handleUpdateGoal(base, goalId, JSON.parse(event.body), headers);
      
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
    
    if (priority) {
      filterFormulas.push(`{Priority} = '${priority}'`);
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
    // Validate required fields
    const requiredFields = ['goalTitle', 'goalType', 'targetValue', 'targetDate'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          missingFields 
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

    // Create goal record
    const record = await base('Goals').create({
      'User ID': data.userId || 'default-user',
      'Goal Type': data.goalType,
      'Goal Title': data.goalTitle,
      'Target Value': Number(data.targetValue),
      'Current Value': Number(data.currentValue) || 0,
      'Target Date': data.targetDate,
      'Exercise Name': data.exerciseName || '',
      'Status': 'Active',
      'Priority': data.priority || 'Medium',
      'Notes': data.notes || ''
    });

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
  try {
    const updateFields = {};
    
    if (data.goalTitle) updateFields['Goal Title'] = data.goalTitle;
    if (data.targetValue) updateFields['Target Value'] = Number(data.targetValue);
    if (data.currentValue !== undefined) updateFields['Current Value'] = Number(data.currentValue);
    if (data.targetDate) updateFields['Target Date'] = data.targetDate;
    if (data.status) updateFields['Status'] = data.status;
    if (data.priority) updateFields['Priority'] = data.priority;
    if (data.notes !== undefined) updateFields['Notes'] = data.notes;
    if (data.exerciseName !== undefined) updateFields['Exercise Name'] = data.exerciseName;

    // Set completion date if status changed to completed
    if (data.status === 'Completed') {
      updateFields['Completed Date'] = new Date().toISOString().split('T')[0];
    }

    const record = await base('Goals').update(goalId, updateFields);

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
    throw new Error(`Failed to update goal: ${error.message}`);
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
  return {
    id: record.id,
    userId: record.get('User ID'),
    goalType: record.get('Goal Type'),
    goalTitle: record.get('Goal Title'),
    targetValue: record.get('Target Value'),
    currentValue: record.get('Current Value') || 0,
    targetDate: record.get('Target Date'),
    exerciseName: record.get('Exercise Name'),
    status: record.get('Status'),
    priority: record.get('Priority'),
    progressPercentage: record.get('Progress Percentage') || 0,
    daysRemaining: record.get('Days Remaining'),
    createdDate: record.get('Created Date'),
    completedDate: record.get('Completed Date'),
    notes: record.get('Notes')
  };
}