const Airtable = require('airtable');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    // Get the first active goal to test with
    const goals = [];
    await base('Goals')
      .select({
        filterByFormula: `{Status} = 'Active'`,
        maxRecords: 1
      })
      .eachPage((records, fetchNextPage) => {
        goals.push(...records);
      });

    if (goals.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'No active goals found to test'
        })
      };
    }

    const testGoal = goals[0];
    const goalId = testGoal.id;
    
    console.log('Testing goal:', {
      id: goalId,
      currentStatus: testGoal.get('Status'),
      fields: Object.keys(testGoal.fields)
    });

    // Try to update status
    try {
      const updated = await base('Goals').update(goalId, {
        'Status': 'Archived'
      });
      
      console.log('Successfully updated status to:', updated.get('Status'));
      
      // Revert it back
      await base('Goals').update(goalId, {
        'Status': 'Active'
      });
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Status field can be updated successfully',
          testedGoalId: goalId,
          originalStatus: testGoal.get('Status'),
          temporaryStatus: 'Archived',
          revertedTo: 'Active'
        })
      };
    } catch (updateError) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Failed to update Status field',
          error: updateError.message,
          fieldList: Object.keys(testGoal.fields),
          suggestion: 'Check if Status field exists and is writable in Airtable'
        })
      };
    }

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Test failed',
        message: error.message
      })
    };
  }
};