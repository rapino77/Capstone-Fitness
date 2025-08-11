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

  try {
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    console.log('🔍 Checking recent workouts for duration data...');

    // Get last 5 workouts
    const workouts = [];
    await new Promise((resolve, reject) => {
      base('Workouts')
        .select({
          sort: [{ field: 'Date', direction: 'desc' }],
          maxRecords: 5
        })
        .eachPage(
          (records, fetchNextPage) => {
            records.forEach(record => {
              // Get ALL fields from the record
              const allFields = record.fields;
              console.log(`📋 Record ${record.id} fields:`, Object.keys(allFields));
              
              const workout = {
                id: record.id,
                exercise: record.get('Exercise'),
                date: record.get('Date'),
                weight: record.get('Weight'),
                sets: record.get('Sets'),
                reps: record.get('Reps'),
                totalDuration: record.get('Total Duration'),
                workTime: record.get('Work Time'),
                restTime: record.get('Rest Time'),
                setCount: record.get('Set Count'),
                efficiency: record.get('Workout Efficiency'),
                allFieldKeys: Object.keys(allFields)
              };
              
              console.log(`📊 Workout ${record.id} duration check:`, {
                exercise: workout.exercise,
                date: workout.date,
                totalDuration: workout.totalDuration,
                workTime: workout.workTime,
                hasDurationData: !!(workout.totalDuration || workout.workTime)
              });
              
              workouts.push(workout);
            });
            fetchNextPage();
          },
          error => {
            if (error) reject(error);
            else resolve();
          }
        );
    });

    const workoutsWithDuration = workouts.filter(w => w.totalDuration || w.workTime);
    
    console.log(`✅ Found ${workouts.length} total workouts, ${workoutsWithDuration.length} with duration data`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        totalWorkouts: workouts.length,
        workoutsWithDuration: workoutsWithDuration.length,
        workouts: workouts.map(w => ({
          id: w.id,
          exercise: w.exercise,
          date: w.date,
          totalDuration: w.totalDuration,
          workTime: w.workTime,
          efficiency: w.efficiency,
          allFieldKeys: w.allFieldKeys,
          hasDurationData: !!(w.totalDuration || w.workTime)
        }))
      }, null, 2)
    };

  } catch (error) {
    console.error('Error checking workout duration:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to check workout duration',
        message: error.message
      })
    };
  }
};