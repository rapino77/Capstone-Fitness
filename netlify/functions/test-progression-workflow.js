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
    console.log('=== PROGRESSION WORKFLOW TEST ===');
    
    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    const userId = 'default-user';
    const exercise = 'Bench Press';
    
    // Step 1: Check current workouts for this user/exercise
    console.log('Step 1: Checking existing workouts...');
    const existingRecords = await base('Workouts')
      .select({
        filterByFormula: `AND({User ID} = '${userId}', {Exercise} = '${exercise}')`,
        sort: [{ field: 'Date', direction: 'desc' }],
        maxRecords: 5
      })
      .all();

    console.log(`Found ${existingRecords.length} existing records for ${exercise}`);
    existingRecords.forEach((record, idx) => {
      console.log(`Existing Record ${idx}:`, {
        id: record.id,
        userId: record.get('User ID'),
        exercise: record.get('Exercise'),
        sets: record.get('Sets'),
        reps: record.get('Reps'),
        weight: record.get('Weight'),
        date: record.get('Date')
      });
    });

    // Step 2: Log a test workout
    console.log('Step 2: Logging a test workout...');
    const testWorkout = {
      'User ID': userId,
      'Exercise': exercise,
      'Sets': 3,
      'Reps': 8,
      'Weight': 55, // 5 more than the expected 50
      'Date': new Date().toISOString().split('T')[0],
      'Notes': 'Test workout for progression validation'
    };

    const newRecord = await base('Workouts').create(testWorkout);
    console.log('New workout logged:', {
      id: newRecord.id,
      fields: newRecord.fields
    });

    // Step 3: Test progression suggestion API
    console.log('Step 3: Testing progression suggestion...');
    
    // Simulate the progression API call manually
    const progressionRecords = await base('Workouts')
      .select({
        filterByFormula: `AND({User ID} = '${userId}', {Exercise} = '${exercise}')`,
        sort: [{ field: 'Date', direction: 'desc' }],
        maxRecords: 20
      })
      .all();

    const workouts = progressionRecords.map(record => ({
      userId: record.get('User ID'),
      date: record.get('Date'),
      sets: parseInt(record.get('Sets')) || 0,
      reps: parseInt(record.get('Reps')) || 0,
      weight: parseFloat(record.get('Weight')) || 0,
      notes: record.get('Notes') || ''
    }));

    console.log(`Progression API would find ${workouts.length} workouts:`);
    workouts.forEach((workout, idx) => {
      console.log(`Workout ${idx}:`, workout);
    });

    // Step 4: Calculate what the progression should suggest
    if (workouts.length > 0) {
      const lastWorkout = workouts[0];
      const suggestedWeight = lastWorkout.weight + 5;
      console.log(`Last workout: ${lastWorkout.weight} lbs`);
      console.log(`Should suggest: ${suggestedWeight} lbs (+5)`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        testResults: {
          existingWorkoutsCount: existingRecords.length,
          newWorkoutLogged: true,
          newWorkoutId: newRecord.id,
          progressionWorkoutsFound: workouts.length,
          lastWorkout: workouts[0] || null,
          suggestedNextWeight: workouts.length > 0 ? workouts[0].weight + 5 : null
        },
        message: 'Progression workflow test completed'
      })
    };

  } catch (error) {
    console.error('Progression workflow test error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Progression workflow test failed',
        message: error.message,
        stack: error.stack
      })
    };
  }
};