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

    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    // Try to list tables/bases
    console.log('Testing Airtable connection...');

    // Try to get just one record from Goals table
    const testRecords = [];
    await base('Goals')
      .select({
        maxRecords: 1
      })
      .eachPage((records, fetchNextPage) => {
        testRecords.push(...records);
        // Don't fetch next page for test
      });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Airtable connection successful',
        environment: envCheck,
        testResults: {
          goalsTableExists: true,
          recordCount: testRecords.length,
          sampleRecord: testRecords[0] ? {
            id: testRecords[0].id,
            fields: Object.keys(testRecords[0].fields || {})
          } : null
        }
      })
    };

  } catch (error) {
    console.error('Test connection error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
        environment: {
          hasToken: !!process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN,
          hasBaseId: !!process.env.AIRTABLE_BASE_ID,
          nodeVersion: process.version
        }
      })
    };
  }
};