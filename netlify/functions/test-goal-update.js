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
    console.log('=== GOAL UPDATE TEST ===');
    
    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    // First, let's see what goals exist and their field structure
    console.log('Fetching goals to see structure...');
    
    const records = [];
    await base('Goals')
      .select({
        maxRecords: 3
      })
      .eachPage((pageRecords, fetchNextPage) => {
        records.push(...pageRecords);
      });

    const goalData = records.map(record => ({
      id: record.id,
      fields: record.fields,
      fieldNames: Object.keys(record.fields)
    }));

    console.log('Found goals:', goalData);

    // Try to get a specific goal if provided
    let testResult = null;
    if (event.queryStringParameters?.goalId) {
      const goalId = event.queryStringParameters.goalId;
      console.log('Testing specific goal:', goalId);
      
      try {
        const testGoal = await base('Goals').find(goalId);
        console.log('Found test goal:', testGoal.fields);
        
        // Try a simple update
        const updateResult = await base('Goals').update(goalId, {
          'Current Value': 50  // Simple test update
        });
        
        testResult = {
          success: true,
          updatedFields: updateResult.fields
        };
        
      } catch (updateError) {
        console.error('Update test failed:', updateError);
        testResult = {
          success: false,
          error: updateError.message
        };
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Goal update test completed',
        availableGoals: goalData,
        testResult: testResult,
        instructions: 'Add ?goalId=RECORD_ID to test updating a specific goal'
      })
    };

  } catch (error) {
    console.error('Goal update test error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Goal update test failed',
        message: error.message,
        stack: error.stack
      })
    };
  }
};