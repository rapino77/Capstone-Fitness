const Airtable = require('airtable');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'PUT') {
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

    // Parse request body
    const data = JSON.parse(event.body);
    const { recordId, weight, date, unit, notes } = data;

    if (!recordId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Record ID is required' })
      };
    }

    if (!weight || !date) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Weight and date are required' })
      };
    }

    // Validate weight
    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Weight must be a positive number' })
      };
    }

    // Validate date
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
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

    // Update the record
    const updatedRecord = await base('BodyWeight').update(recordId, {
      'Weight': weightNum,
      'Date': date,
      'Unit': unit || 'lbs',
      'Notes': notes || ''
    });

    console.log('Weight record updated:', updatedRecord.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Weight updated successfully',
        data: {
          id: updatedRecord.id,
          weight: updatedRecord.get('Weight'),
          date: updatedRecord.get('Date'),
          unit: updatedRecord.get('Unit'),
          notes: updatedRecord.get('Notes')
        }
      })
    };

  } catch (error) {
    console.error('Error updating weight:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to update weight',
        message: error.message
      })
    };
  }
};