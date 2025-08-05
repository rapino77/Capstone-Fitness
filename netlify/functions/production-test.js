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
    // Basic environment check
    const envStatus = {
      nodeVersion: process.version,
      platform: process.platform,
      hasAirtableToken: !!process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN,
      hasAirtableBaseId: !!process.env.AIRTABLE_BASE_ID,
      tokenLength: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN?.length || 0,
      baseIdLength: process.env.AIRTABLE_BASE_ID?.length || 0
    };

    // Test Airtable module loading
    let airtableStatus = 'not_tested';
    try {
      const Airtable = require('airtable');
      airtableStatus = 'loaded_successfully';
    } catch (airtableError) {
      airtableStatus = `failed_to_load: ${airtableError.message}`;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Production test function working!',
        timestamp: new Date().toISOString(),
        environment: envStatus,
        airtable: airtableStatus,
        netlifyContext: {
          deployId: context.deployId || 'unknown',
          functionName: context.functionName || 'unknown',
          region: context.region || 'unknown'
        }
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Production test failed',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      })
    };
  }
};