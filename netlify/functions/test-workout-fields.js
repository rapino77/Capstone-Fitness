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
    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    // Test one simple field at a time
    const testResults = [];
    
    // Test 1: Try Name field
    try {
      const record1 = await base('Workouts').create({ Name: 'Test Workout' });
      testResults.push({
        test: 'Name field',
        success: true,
        recordId: record1.id,
        fields: record1.fields
      });
    } catch (error) {
      testResults.push({
        test: 'Name field',
        success: false,
        error: error.message
      });
    }

    // Test 2: Try Exercise field
    try {
      const record2 = await base('Workouts').create({ Exercise: 'Test Exercise' });
      testResults.push({
        test: 'Exercise field',
        success: true,
        recordId: record2.id,
        fields: record2.fields
      });
    } catch (error) {
      testResults.push({
        test: 'Exercise field',
        success: false,
        error: error.message
      });
    }

    // Test 3: Try Title field
    try {
      const record3 = await base('Workouts').create({ Title: 'Test Title' });
      testResults.push({
        test: 'Title field',
        success: true,
        recordId: record3.id,
        fields: record3.fields
      });
    } catch (error) {
      testResults.push({
        test: 'Title field',
        success: false,
        error: error.message
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Workout field tests',
        testResults,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Field test error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Field test failed',
        message: error.message,
        stack: error.stack
      })
    };
  }
};