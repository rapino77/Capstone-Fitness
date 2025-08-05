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

    // Try to create a minimal goal
    console.log('Testing minimal goal creation...');
    
    const testData = {
      'User ID': 'test-user',
      'Goal Type': 'Body Weight',
      'Target Value': 150,
      'Current Value': 140,
      'Target Date': '2025-12-31',
      'Status': 'Active'
    };

    try {
      const record = await base('Goals').create(testData);
      console.log('Success! Created record:', record.id);
      
      // List all fields
      const fields = Object.keys(record.fields);
      console.log('Available fields:', fields);
      
      // Delete test record
      await base('Goals').destroy(record.id);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Goal creation test successful',
          availableFields: fields,
          testData: testData
        })
      };
    } catch (error) {
      console.error('Failed to create goal:', error);
      
      // Try with even fewer fields
      const minimalData = {
        'Goal Type': 'Body Weight',
        'Target Value': 150,
        'Target Date': '2025-12-31'
      };
      
      try {
        const minimalRecord = await base('Goals').create(minimalData);
        const fields = Object.keys(minimalRecord.fields);
        await base('Goals').destroy(minimalRecord.id);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Minimal goal creation successful',
            availableFields: fields,
            workingFields: Object.keys(minimalData),
            failedFields: Object.keys(testData).filter(key => !Object.keys(minimalData).includes(key))
          })
        };
      } catch (minimalError) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: 'Goal creation failed',
            fullError: error.message,
            minimalError: minimalError.message,
            attemptedFields: Object.keys(testData)
          })
        };
      }
    }

  } catch (error) {
    console.error('Test goal fields error:', error);
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