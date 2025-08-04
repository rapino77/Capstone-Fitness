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

    // Test creating a simple record
    const record = await base('BodyWeight').create({
      Weight: 180,
      Date: '2025-08-04',
      Unit: 'lbs',
      Notes: 'Test entry from API',
      CreatedAt: new Date().toISOString()
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Test weight logged successfully',
        recordId: record.id,
        data: record.fields
      })
    };

  } catch (error) {
    console.error('Test log weight error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Test log weight failed',
        message: error.message,
        stack: error.stack
      })
    };
  }
};