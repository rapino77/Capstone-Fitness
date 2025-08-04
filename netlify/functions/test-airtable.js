// Import Airtable
const Airtable = require('airtable');

// This is the main function that Netlify will call
exports.handler = async (event, context) => {
  
  // Set CORS headers to allow frontend to call this function
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Configure Airtable connection
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    // Test connection by fetching records from your first table
    // Replace 'Table1' with your actual table name
    const records = await base('Table1').select({
      maxRecords: 5,
      view: 'Grid view'
    }).firstPage();

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Airtable connection successful!',
        recordCount: records.length,
        sampleData: records.map(record => ({
          id: record.id,
          fields: record.fields
        }))
      })
    };

  } catch (error) {
    console.error('Airtable connection error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Airtable connection failed',
        error: error.message
      })
    };
  }
};
