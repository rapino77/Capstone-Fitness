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

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const apiKey = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN || process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    
    console.log('Environment check:', {
      hasApiKey: !!apiKey,
      hasBaseId: !!baseId,
      apiKeyPreview: apiKey ? `${apiKey.substring(0, 10)}...` : 'none',
      baseIdPreview: baseId ? `${baseId.substring(0, 10)}...` : 'none'
    });
    
    if (!apiKey || !baseId) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Missing environment variables',
          details: {
            hasApiKey: !!apiKey,
            hasBaseId: !!baseId
          }
        })
      };
    }

    const base = new Airtable({ apiKey }).base(baseId);
    const userId = 'default-user';

    // Test simple queries
    const testResults = {};

    // Test Workouts table
    try {
      const workouts = [];
      await base('Workouts')
        .select({
          filterByFormula: `{User ID} = '${userId}'`,
          maxRecords: 3
        })
        .eachPage((pageRecords, fetchNextPage) => {
          workouts.push(...pageRecords);
          fetchNextPage();
        });
      testResults.workouts = {
        success: true,
        count: workouts.length,
        sample: workouts.length > 0 ? {
          date: workouts[0].get('Date'),
          exercise: workouts[0].get('Exercise')
        } : null
      };
    } catch (error) {
      testResults.workouts = {
        success: false,
        error: error.message
      };
    }

    // Test BodyWeight table
    try {
      const weights = [];
      await base('BodyWeight')
        .select({
          filterByFormula: `{User ID} = '${userId}'`,
          maxRecords: 3
        })
        .eachPage((pageRecords, fetchNextPage) => {
          weights.push(...pageRecords);
          fetchNextPage();
        });
      testResults.weights = {
        success: true,
        count: weights.length,
        sample: weights.length > 0 ? {
          date: weights[0].get('Date'),
          weight: weights[0].get('Weight')
        } : null
      };
    } catch (error) {
      testResults.weights = {
        success: false,
        error: error.message
      };
    }

    // Test Goals table
    try {
      const goals = [];
      await base('Goals')
        .select({
          filterByFormula: `{User ID} = '${userId}'`,
          maxRecords: 3
        })
        .eachPage((pageRecords, fetchNextPage) => {
          goals.push(...pageRecords);
          fetchNextPage();
        });
      testResults.goals = {
        success: true,
        count: goals.length,
        sample: goals.length > 0 ? {
          title: goals[0].get('Goal Title'),
          type: goals[0].get('Goal Type')
        } : null
      };
    } catch (error) {
      testResults.goals = {
        success: false,
        error: error.message
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Airtable connection test completed',
        testResults,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Test summary error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Test failed',
        message: error.message,
        stack: error.stack
      })
    };
  }
};