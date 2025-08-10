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
    
    // For now, just require some data since table has no fields
    if (!data || Object.keys(data).length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'No workout data provided'
        })
      };
    }

    // Basic validation - just log what we received since table has no fields yet
    console.log('Received workout data:', JSON.stringify(data, null, 2));

    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    // Create record in Airtable with actual workout data
    console.log('Creating workout record with data:', data);
    const record = await base('Workouts').create({
      'User ID': data.userId || 'default-user',  // Add User ID field
      Exercise: data.exercise,
      Sets: parseInt(data.sets) || 0,
      Reps: parseInt(data.reps) || 0,
      Weight: parseFloat(data.weight) || 0,
      Date: data.date || new Date().toISOString().split('T')[0],
      Notes: data.notes || '',
      // Duration tracking fields
      'Total Duration': data.totalDuration ? parseInt(data.totalDuration) : null,
      'Work Time': data.workTime ? parseInt(data.workTime) : null,
      'Rest Time': data.restTime ? parseInt(data.restTime) : null,
      'Set Count': data.setCount ? parseInt(data.setCount) : null,
      'Average Set Duration': data.avgSetDuration ? parseInt(data.avgSetDuration) : null,
      'Average Rest Duration': data.avgRestDuration ? parseInt(data.avgRestDuration) : null,
      'Workout Efficiency': data.efficiency ? parseInt(data.efficiency) : null,
      'Start Time': data.startTime || null,
      'End Time': data.endTime || null
    });

    // Auto-update related goals after logging workout
    try {
      console.log('Triggering goal progress auto-update after workout logging...');
      await fetch(`${process.env.NETLIFY_URL || 'https://delicate-gaufre-27c80c.netlify.app'}/.netlify/functions/auto-update-goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          trigger: 'workout_logged', 
          recordId: record.id,
          exercise: data.exercise,
          weight: data.weight
        })
      });
    } catch (goalUpdateError) {
      console.error('Failed to auto-update goals:', goalUpdateError);
      // Don't fail the workout logging if goal update fails
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Workout logged successfully',
        recordId: record.id,
        recordFields: record.fields,
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
        message: error.message
      })
    };
  }
};