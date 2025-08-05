exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('Goals test - Method:', event.httpMethod);
    console.log('Goals test - Body:', event.body);
    console.log('Goals test - Headers:', event.headers);
    
    // Check environment variables
    const envCheck = {
      hasToken: !!process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN,
      hasBaseId: !!process.env.AIRTABLE_BASE_ID,
      tokenLength: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN?.length || 0,
      baseIdLength: process.env.AIRTABLE_BASE_ID?.length || 0
    };
    
    console.log('Environment check:', envCheck);

    if (!process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN) {
      throw new Error('AIRTABLE_PERSONAL_ACCESS_TOKEN environment variable is not set');
    }
    if (!process.env.AIRTABLE_BASE_ID) {
      throw new Error('AIRTABLE_BASE_ID environment variable is not set');
    }

    // Try to load Airtable
    const Airtable = require('airtable');
    console.log('Airtable module loaded successfully');

    // Try to initialize base
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);
    
    console.log('Airtable base initialized successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Goals test endpoint working',
        method: event.httpMethod,
        environment: envCheck,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Goals test error:', error);
    console.error('Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Goals test failed',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      })
    };
  }
};