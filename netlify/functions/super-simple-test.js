exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'Super simple test works!',
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        hasAirtableToken: !!process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN,
        hasAirtableBaseId: !!process.env.AIRTABLE_BASE_ID
      }
    })
  };
};