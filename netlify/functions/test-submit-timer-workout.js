const Airtable = require('airtable');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
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

    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    // Create a test workout with timer data
    const testWorkoutData = {
      'User ID': 'default-user',
      Exercise: 'Test Workout with Timer',
      Sets: 3,
      Reps: 10,
      Weight: 100,
      Date: new Date().toISOString().split('T')[0],
      Notes: 'Test workout submitted via API with timer data',
      // Duration fields
      'Total Duration': 1800, // 30 minutes in seconds
      'Work Time': 1200, // 20 minutes in seconds
      'Rest Time': 600, // 10 minutes in seconds
      'Set Count': 3,
      'Average Set Duration': 400, // 6.67 minutes per set
      'Average Rest Duration': 200, // 3.33 minutes rest average
      'Workout Efficiency': 67 // 67% efficiency
    };

    console.log('🧪 Creating test workout with timer data:', testWorkoutData);

    const record = await base('Workouts').create(testWorkoutData);
    
    console.log('✅ Test workout created successfully');
    console.log('📊 Record ID:', record.id);
    console.log('📊 Saved duration data:');
    console.log('- Total Duration:', record.get('Total Duration'));
    console.log('- Work Time:', record.get('Work Time'));
    console.log('- Efficiency:', record.get('Workout Efficiency'));

    // Now try to read it back
    console.log('🔍 Reading back the record...');
    const retrievedRecord = await base('Workouts').find(record.id);
    console.log('📊 Retrieved data:');
    console.log('- Total Duration:', retrievedRecord.get('Total Duration'));
    console.log('- Work Time:', retrievedRecord.get('Work Time'));
    console.log('- Rest Time:', retrievedRecord.get('Rest Time'));
    console.log('- Efficiency:', retrievedRecord.get('Workout Efficiency'));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Test workout with timer data created successfully',
        recordId: record.id,
        durationData: {
          totalDuration: record.get('Total Duration'),
          workTime: record.get('Work Time'),
          restTime: record.get('Rest Time'),
          efficiency: record.get('Workout Efficiency')
        }
      })
    };

  } catch (error) {
    console.error('❌ Error creating test workout:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create test workout',
        message: error.message,
        details: error.stack
      })
    };
  }
};