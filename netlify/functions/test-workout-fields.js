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

    // Test creating records with different approaches
    const testResults = [];
    
    // Test 1: Try creating empty record (like existing ones)
    try {
      const record1 = await base('Workouts').create({});
      testResults.push({
        test: 'Empty record',
        success: true,
        recordId: record1.id,
        fields: record1.fields
      });
    } catch (error) {
      testResults.push({
        test: 'Empty record',
        success: false,
        error: error.message
      });
    }

    // Test 2: Try creating with Airtable auto ID
    try {
      const record2 = await base('Workouts').create({
        'Record ID': 'AUTO_GENERATED'
      });
      testResults.push({
        test: 'Record ID field',
        success: true,
        recordId: record2.id,
        fields: record2.fields
      });
    } catch (error) {
      testResults.push({
        test: 'Record ID field',
        success: false,
        error: error.message
      });
    }

    // Test 3: Common Airtable field variations
    const commonFields = [
      'Name', 'Exercise', 'Title', 'Workout', 'Activity',
      'Exercise Name', 'Workout Name', 'Type', 'Description'
    ];
    
    for (const fieldName of commonFields) {
      try {
        const recordData = {};
        recordData[fieldName] = 'Test Value';
        const record = await base('Workouts').create(recordData);
        testResults.push({
          test: `${fieldName} field`,
          success: true,
          recordId: record.id,
          fields: record.fields
        });
        break; // Stop on first success
      } catch (error) {
        testResults.push({
          test: `${fieldName} field`,
          success: false,
          error: error.message
        });
      }
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