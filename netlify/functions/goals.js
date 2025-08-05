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
      sortBy = 'created date',
      sortDirection = 'desc',
      limit = '50'
    } = params;

    let filterFormulas = [];
    
    if (status && status !== 'all') {
      filterFormulas.push(`{status} = '${status}'`);
    }
    
    if (goalType) {
      filterFormulas.push(`{goal type} = '${goalType}'`);
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

    // Create goal record - using actual field names from Airtable
    const record = await base('Goals').create({
      'user id': data.userId || 'default-user',
      'goal type': data.goalType,
      'target value': Number(data.targetValue),
      'current value': Number(data.currentValue) || 0,
      'target date': data.targetDate,
      'exercise name': data.exerciseName || '',
      'status': 'Active'
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
    
    if (data.targetValue) updateFields['target value'] = Number(data.targetValue);
    if (data.currentValue !== undefined) updateFields['current value'] = Number(data.currentValue);
    if (data.targetDate) updateFields['target date'] = data.targetDate;
    if (data.status) updateFields['status'] = data.status;
    if (data.exerciseName !== undefined) updateFields['exercise name'] = data.exerciseName;

    // Set completion date if status changed to completed
    if (data.status === 'Completed') {
      updateFields['created date'] = new Date().toISOString().split('T')[0];
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
    userId: record.get('user id'),
    goalType: record.get('goal type'),
    goalTitle: record.get('goal type'), // Using goal type as title since no title field exists
    targetValue: record.get('target value'),
    currentValue: record.get('current value') || 0,
    targetDate: record.get('target date'),
    exerciseName: record.get('exercise name'),
    status: record.get('status'),
    progressPercentage: record.get('goal progress') || 0,
    createdDate: record.get('created date')
  };
}