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

    const tableTests = {};
    const tablesToTest = ['BodyWeight', 'Workouts', 'Goals', 'Progress Records'];

    // Test each table
    for (const tableName of tablesToTest) {
      try {
        const records = [];
        await base(tableName)
          .select({
            maxRecords: 1,
            pageSize: 1
          })
          .eachPage((pageRecords, fetchNextPage) => {
            records.push(...pageRecords);
            // Don't fetch next page, we just want to test access
          });
        
        tableTests[tableName] = {
          accessible: true,
          recordCount: records.length,
          sampleFields: records.length > 0 ? Object.keys(records[0].fields) : []
        };
      } catch (error) {
        tableTests[tableName] = {
          accessible: false,
          error: error.message
        };
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Airtable table test results',
        baseId: process.env.AIRTABLE_BASE_ID,
        tables: tableTests,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Airtable test error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Airtable test failed',
        message: error.message,
        stack: error.stack
      })
    };
  }
};