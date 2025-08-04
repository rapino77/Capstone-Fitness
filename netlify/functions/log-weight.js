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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
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

    const data = JSON.parse(event.body);
    
    // Validate required fields
    if (!data.weight || !data.date) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          requiredFields: ['weight', 'date']
        })
      };
    }

    // Validate weight
    const weight = Number(data.weight);
    if (isNaN(weight) || weight <= 0 || weight > 1000) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Weight must be a positive number between 0 and 1000' })
      };
    }

    // Validate date
    const date = new Date(data.date);
    if (isNaN(date.getTime())) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid date format' })
      };
    }

    // Check if date is not in the future
    if (date > new Date()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Date cannot be in the future' })
      };
    }

    // Configure Airtable
    const base = new Airtable({
      token: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    // Create record in Airtable
    const record = await base('BodyWeight').create({
      Weight: weight,
      Date: data.date,
      Unit: data.unit || 'lbs',
      Notes: data.notes || '',
      CreatedAt: new Date().toISOString()
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Weight logged successfully',
        id: record.id,
        data: record.fields
      })
    };

  } catch (error) {
    console.error('Error logging weight:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to log weight',
        message: error.message
      })
    };
  }
};