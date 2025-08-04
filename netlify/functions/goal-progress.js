const Airtable = require('airtable');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
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

    switch (event.httpMethod) {
      case 'GET':
        return await handleGetGoalProgress(base, event.queryStringParameters, headers);
      
      case 'POST':
        return await handleLogGoalProgress(base, JSON.parse(event.body), headers);
      
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

  } catch (error) {
    console.error('Goal Progress API error:', error);
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

// GET Goal Progress History
async function handleGetGoalProgress(base, queryParams, headers) {
  try {
    const params = queryParams || {};
    const {
      goalId,
      startDate,
      endDate,
      limit = '50',
      sortDirection = 'desc'
    } = params;

    if (!goalId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Goal ID is required' })
      };
    }

    let filterFormulas = [`{Goal ID} = '${goalId}'`];
    
    if (startDate) {
      filterFormulas.push(`IS_AFTER({Date Recorded}, '${startDate}')`);
    }
    
    if (endDate) {
      filterFormulas.push(`IS_BEFORE({Date Recorded}, '${endDate}')`);
    }

    const queryConfig = {
      pageSize: Math.min(parseInt(limit), 100),
      sort: [{
        field: 'Date Recorded',
        direction: sortDirection
      }],
      filterByFormula: `AND(${filterFormulas.join(', ')})`
    };

    const records = [];
    await base('Goal Progress')
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
        data: records.map(formatProgressRecord),
        count: records.length
      })
    };

  } catch (error) {
    throw new Error(`Failed to fetch goal progress: ${error.message}`);
  }
}

// POST Log Goal Progress
async function handleLogGoalProgress(base, data, headers) {
  try {
    // Validate required fields
    if (!data.goalId || data.progressValue === undefined) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: goalId and progressValue are required'
        })
      };
    }

    // Get the goal to validate progress value
    const goalRecord = await base('Goals').find(data.goalId);
    const targetValue = goalRecord.get('Target Value');
    const progressValue = Number(data.progressValue);

    // Validate progress value
    if (progressValue < 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Progress value cannot be negative' })
      };
    }

    // Check if this is a milestone (25%, 50%, 75%, 100%)
    const progressPercentage = (progressValue / targetValue) * 100;
    const milestones = [25, 50, 75, 100];
    const isMilestone = milestones.some(milestone => 
      Math.abs(progressPercentage - milestone) < 1
    );

    // Create progress record
    const progressRecord = await base('Goal Progress').create({
      'Goal ID': [data.goalId],
      'Progress Value': progressValue,
      'Date Recorded': data.dateRecorded || new Date().toISOString().split('T')[0],
      'Progress Type': data.progressType || 'Manual Update',
      'Notes': data.notes || '',
      'Milestone Achieved': isMilestone
    });

    // Update the goal's current value
    await base('Goals').update(data.goalId, {
      'Current Value': progressValue
    });

    // Check if goal is completed
    if (progressValue >= targetValue) {
      await base('Goals').update(data.goalId, {
        'Status': 'Completed',
        'Completed Date': new Date().toISOString().split('T')[0]
      });
    }

    // Get updated goal record
    const updatedGoal = await base('Goals').find(data.goalId);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Goal progress logged successfully',
        data: {
          progress: formatProgressRecord(progressRecord),
          goal: formatGoalRecord(updatedGoal),
          milestone: isMilestone,
          completed: progressValue >= targetValue
        }
      })
    };

  } catch (error) {
    throw new Error(`Failed to log goal progress: ${error.message}`);
  }
}

// Helper functions
function formatProgressRecord(record) {
  return {
    id: record.id,
    goalId: record.get('Goal ID')?.[0],
    progressValue: record.get('Progress Value'),
    dateRecorded: record.get('Date Recorded'),
    progressType: record.get('Progress Type'),
    notes: record.get('Notes'),
    milestoneAchieved: record.get('Milestone Achieved'),
    createdAt: record.get('Created At')
  };
}

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