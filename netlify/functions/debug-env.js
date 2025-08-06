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

  // Check environment variables without exposing sensitive data
  const envCheck = {
    hasAirtableToken: !!(process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN || process.env.AIRTABLE_API_KEY),
    hasAirtableBaseId: !!process.env.AIRTABLE_BASE_ID,
    tokenType: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN ? 'PERSONAL_ACCESS_TOKEN' : 
                process.env.AIRTABLE_API_KEY ? 'API_KEY' : 'NONE',
    baseIdLength: process.env.AIRTABLE_BASE_ID ? process.env.AIRTABLE_BASE_ID.length : 0,
    nodeEnv: process.env.NODE_ENV,
    context: process.env.CONTEXT,
    // Show first few characters of base ID (if exists) for verification
    baseIdPrefix: process.env.AIRTABLE_BASE_ID ? process.env.AIRTABLE_BASE_ID.substring(0, 4) + '...' : 'NOT SET',
    timestamp: new Date().toISOString()
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: 'Environment variable check',
      environment: envCheck,
      recommendation: !envCheck.hasAirtableToken || !envCheck.hasAirtableBaseId 
        ? 'Please set environment variables in Netlify dashboard: Site Settings → Environment Variables'
        : 'Environment variables appear to be configured'
    })
  };
};