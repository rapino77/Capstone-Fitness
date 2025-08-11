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

    console.log('🔧 Adding sample duration data to recent workouts...');

    // Get the most recent 3 workouts
    const records = await new Promise((resolve, reject) => {
      const workouts = [];
      base('Workouts')
        .select({
          sort: [{ field: 'Date', direction: 'desc' }],
          maxRecords: 3
        })
        .eachPage(
          (records, fetchNextPage) => {
            workouts.push(...records);
            fetchNextPage();
          },
          error => {
            if (error) reject(error);
            else resolve(workouts);
          }
        );
    });

    console.log(`Found ${records.length} recent workouts to update`);

    // Update each workout with sample duration data
    const updatePromises = records.map(record => {
      const workoutTime = 30 + Math.floor(Math.random() * 40); // 30-70 minutes
      const workTime = Math.floor(workoutTime * 0.6); // 60% work time
      const restTime = workoutTime - workTime; // Rest of the time
      const setCount = parseInt(record.get('Sets') || 3);
      const avgSetDuration = Math.floor(workTime * 60 / setCount); // seconds per set
      const avgRestDuration = Math.floor(restTime * 60 / (setCount - 1)); // seconds between sets
      const efficiency = Math.floor((workTime / workoutTime) * 100);

      console.log(`Updating ${record.id} with duration: ${workoutTime} min`);

      return base('Workouts').update(record.id, {
        'Total Duration': workoutTime * 60, // in seconds
        'Work Time': workTime * 60, // in seconds
        'Rest Time': restTime * 60, // in seconds
        'Set Count': setCount,
        'Average Set Duration': avgSetDuration,
        'Average Rest Duration': avgRestDuration,
        'Workout Efficiency': efficiency,
        'Start Time': '08:00', // Sample start time
        'End Time': `${8 + Math.floor(workoutTime/60)}:${String(workoutTime % 60).padStart(2, '0')}` // Calculated end time
      });
    });

    await Promise.all(updatePromises);

    console.log('✅ Successfully added duration data to recent workouts');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Added duration data to ${records.length} recent workouts`,
        updatedRecords: records.length
      })
    };

  } catch (error) {
    console.error('Error adding duration data:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to add duration data',
        message: error.message
      })
    };
  }
};