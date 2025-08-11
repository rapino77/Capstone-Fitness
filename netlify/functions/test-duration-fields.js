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

    console.log('Testing Airtable duration fields...');

    // Step 1: Get the most recent workout
    const recentWorkouts = await base('Workouts')
      .select({
        maxRecords: 3,
        sort: [{ field: 'Date', direction: 'desc' }]
      })
      .firstPage();

    if (recentWorkouts.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          error: 'No workouts found',
          message: 'Please log a workout first'
        })
      };
    }

    // Step 2: Check what fields exist in the record
    const firstRecord = recentWorkouts[0];
    const allFields = Object.keys(firstRecord.fields);
    
    // Step 3: Check specifically for duration field values
    const durationFieldCheck = {
      'Total Duration': firstRecord.get('Total Duration'),
      'Work Time': firstRecord.get('Work Time'),
      'Rest Time': firstRecord.get('Rest Time'),
      'Set Count': firstRecord.get('Set Count'),
      'Average Set Duration': firstRecord.get('Average Set Duration'),
      'Average Rest Duration': firstRecord.get('Average Rest Duration'),
      'Workout Efficiency': firstRecord.get('Workout Efficiency'),
      'Start Time': firstRecord.get('Start Time'),
      'End Time': firstRecord.get('End Time')
    };

    // Step 4: Try to create a test workout with duration data
    let testResult = { success: false, error: null };
    try {
      const testRecord = await base('Workouts').create({
        'User ID': 'duration-test',
        'Exercise': 'Duration Field Test',
        'Sets': 3,
        'Reps': 10,
        'Weight': 100,
        'Date': new Date().toISOString().split('T')[0],
        'Notes': 'Testing duration fields',
        'Total Duration': 3600,
        'Work Time': 1800,
        'Rest Time': 1800,
        'Set Count': 3,
        'Average Set Duration': 600,
        'Average Rest Duration': 600,
        'Workout Efficiency': 50,
        'Start Time': new Date(Date.now() - 3600000).toISOString(),
        'End Time': new Date().toISOString()
      });

      testResult.success = true;
      testResult.recordId = testRecord.id;
      testResult.createdFields = Object.keys(testRecord.fields);
      
      // Check what was actually saved
      testResult.savedDurationData = {
        'Total Duration': testRecord.get('Total Duration'),
        'Work Time': testRecord.get('Work Time'),
        'Rest Time': testRecord.get('Rest Time'),
        'Workout Efficiency': testRecord.get('Workout Efficiency')
      };

      // Clean up test record
      await base('Workouts').destroy(testRecord.id);
      
    } catch (error) {
      testResult.error = error.message;
      testResult.errorType = error.error;
      testResult.statusCode = error.statusCode;
    }

    // Step 5: Get field metadata if possible
    let fieldTypes = {};
    try {
      // Try to infer field types from values
      Object.entries(durationFieldCheck).forEach(([field, value]) => {
        if (value !== undefined && value !== null) {
          fieldTypes[field] = {
            hasValue: true,
            type: typeof value,
            sampleValue: value
          };
        } else {
          fieldTypes[field] = {
            hasValue: false,
            type: 'unknown'
          };
        }
      });
    } catch (e) {
      console.log('Could not determine field types');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        recentWorkoutCheck: {
          recordId: firstRecord.id,
          exercise: firstRecord.get('Exercise'),
          date: firstRecord.get('Date'),
          availableFields: allFields,
          durationFieldValues: durationFieldCheck,
          hasDurationData: !!(durationFieldCheck['Total Duration'] || durationFieldCheck['Work Time'])
        },
        fieldTypes,
        testRecordCreation: testResult,
        summary: {
          durationFieldsExist: allFields.some(f => f.includes('Duration') || f.includes('Time')),
          recentWorkoutHasDuration: !!(durationFieldCheck['Total Duration'] || durationFieldCheck['Work Time']),
          canCreateWithDuration: testResult.success,
          possibleIssues: []
        }
      }, null, 2)
    };

  } catch (error) {
    console.error('Error testing duration fields:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to test duration fields',
        message: error.message,
        type: error.error,
        statusCode: error.statusCode
      })
    };
  }
};