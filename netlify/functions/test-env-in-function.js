// Test what environment variables the Netlify functions actually see
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const envInfo = {
    AIRTABLE_PERSONAL_ACCESS_TOKEN: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN ? 
      `${process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN.substring(0, 20)}...` : 'MISSING',
    AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID || 'MISSING',
    AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY ? 
      `${process.env.AIRTABLE_API_KEY.substring(0, 20)}...` : 'MISSING',
    allAirtableEnvs: Object.keys(process.env)
      .filter(key => key.includes('AIRTABLE'))
      .reduce((acc, key) => {
        acc[key] = process.env[key]?.substring(0, 20) + '...' || 'MISSING';
        return acc;
      }, {}),
    NODE_ENV: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Environment variables in Netlify function:',
      env: envInfo
    }, null, 2)
  };
};