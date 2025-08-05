const Airtable = require('airtable');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('=== GOAL CREATION DEBUG ===');
    console.log('Event body:', event.body);
    
    const data = JSON.parse(event.body || '{}');
    console.log('Parsed data:', data);

    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    // Try to create a very simple record first
    console.log('Attempting to create simple goal record...');
    
    const testRecord = {
      'user id': 'test-user',
      'goal type': 'Body Weight',
      'target value': 100,
      'current value': 120,
      'target date': '2025-12-31',
      'status': 'Active'
    };
    
    console.log('Test record data:', testRecord);
    
    const record = await base('Goals').create(testRecord);
    console.log('Successfully created record:', record.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Debug goal creation successful!',
        recordId: record.id,
        testData: testRecord
      })
    };

  } catch (error) {
    console.error('Debug goal creation error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Debug goal creation failed',
        message: error.message,
        stack: error.stack
      })
    };
  }
};