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
    const data = JSON.parse(event.body);
    
    // Validate required fields
    const requiredFields = ['exercise', 'sets', 'reps', 'weight', 'date'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          missingFields 
        })
      };
    }

    // Validate data types
    if (typeof data.exercise !== 'string' || data.exercise.trim() === '') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Exercise must be a non-empty string' })
      };
    }

    const numericFields = ['sets', 'reps', 'weight'];
    for (const field of numericFields) {
      const value = Number(data[field]);
      if (isNaN(value) || value <= 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `${field} must be a positive number` })
        };
      }
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

    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    // Create record in Airtable
    const record = await base('Workouts').create({
      Exercise: data.exercise,
      Sets: Number(data.sets),
      Reps: Number(data.reps),
      Weight: Number(data.weight),
      Date: data.date,
      Notes: data.notes || '',
      CreatedAt: new Date().toISOString()
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Workout logged successfully',
        id: record.id,
        data: record.fields
      })
    };

  } catch (error) {
    console.error('Error logging workout:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to log workout',
        message: error.message
      })
    };
  }
};