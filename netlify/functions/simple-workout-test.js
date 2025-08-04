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

    // Just try creating an empty record like the existing ones
    const record = await base('Workouts').create({});

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Empty workout record created successfully',
        recordId: record.id,
        fields: record.fields,
        fieldsCount: Object.keys(record.fields).length,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Simple workout test error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Simple workout test failed',
        message: error.message,
        stack: error.stack
      })
    };
  }
};