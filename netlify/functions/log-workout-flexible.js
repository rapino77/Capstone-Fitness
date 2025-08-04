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
    
    // For now, just validate that we have some data
    if (!data || Object.keys(data).length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'No workout data provided'
        })
      };
    }

    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    // Try different field combinations to see what works
    const possibleRecords = [
      // Try standard field names
      {
        Exercise: data.exercise || data.Exercise || 'Unknown Exercise',
        Sets: Number(data.sets || data.Sets || 0),
        Reps: Number(data.reps || data.Reps || 0),
        Weight: Number(data.weight || data.Weight || 0),
        Date: data.date || data.Date
      },
      // Try alternative field names
      {
        'Exercise Name': data.exercise || 'Unknown Exercise',
        'Set Count': Number(data.sets || 0),
        'Rep Count': Number(data.reps || 0),
        'Weight (lbs)': Number(data.weight || 0)
      },
      // Try minimal data
      {
        Name: `${data.exercise || 'Workout'} - ${data.sets || 0}x${data.reps || 0} @ ${data.weight || 0}lbs`
      },
      // Try just creating empty record with debug info in console
      {}
    ];

    let record = null;
    let usedFields = null;
    
    for (const recordData of possibleRecords) {
      try {
        console.log('Trying to create record with fields:', recordData);
        record = await base('Workouts').create(recordData);
        usedFields = recordData;
        console.log('Success with fields:', Object.keys(recordData));
        break;
      } catch (error) {
        console.log('Failed with fields:', Object.keys(recordData), 'Error:', error.message);
        continue;
      }
    }

    if (!record) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Could not create workout record with any field combination',
          receivedData: data
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Workout logged successfully',
        recordId: record.id,
        fields: record.fields,
        usedFieldStructure: Object.keys(usedFields),
        receivedData: data
      })
    };

  } catch (error) {
    console.error('Error logging workout:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to log workout',
        message: error.message,
        stack: error.stack
      })
    };
  }
};