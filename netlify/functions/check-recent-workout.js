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

    console.log('Checking most recent workouts for duration data...');

    // Get the 5 most recent workouts
    const records = await base('Workouts')
      .select({
        maxRecords: 5,
        sort: [{ field: 'Date', direction: 'desc' }]
      })
      .firstPage();

    const workoutInfo = records.map(record => {
      const fields = record.fields;
      return {
        id: record.id,
        exercise: fields.Exercise,
        date: fields.Date,
        sets: fields.Sets,
        reps: fields.Reps,
        weight: fields.Weight,
        // Check for duration fields
        hasDurationData: !!(fields['Total Duration'] || fields['Work Time']),
        totalDuration: fields['Total Duration'] || 'NOT SET',
        workTime: fields['Work Time'] || 'NOT SET',
        restTime: fields['Rest Time'] || 'NOT SET',
        efficiency: fields['Workout Efficiency'] || 'NOT SET',
        allFields: Object.keys(fields)
      };
    });

    // Check if duration fields exist in the table
    const sampleRecord = records[0];
    const availableFields = sampleRecord ? Object.keys(sampleRecord.fields) : [];
    
    const durationFields = [
      'Total Duration',
      'Work Time',
      'Rest Time',
      'Set Count',
      'Average Set Duration',
      'Average Rest Duration',
      'Workout Efficiency',
      'Start Time',
      'End Time'
    ];
    
    const existingDurationFields = durationFields.filter(field => availableFields.includes(field));
    const missingDurationFields = durationFields.filter(field => !availableFields.includes(field));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        recentWorkouts: workoutInfo,
        tableInfo: {
          availableFields,
          existingDurationFields,
          missingDurationFields,
          hasDurationFields: existingDurationFields.length > 0
        },
        summary: {
          totalWorkouts: workoutInfo.length,
          workoutsWithDuration: workoutInfo.filter(w => w.hasDurationData).length,
          message: missingDurationFields.length > 0 
            ? `Missing duration fields: ${missingDurationFields.join(', ')}. Add these to your Airtable to save duration data.`
            : 'All duration fields exist in the table.'
        }
      }, null, 2)
    };

  } catch (error) {
    console.error('Error checking workouts:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to check workouts',
        message: error.message
      })
    };
  }
};