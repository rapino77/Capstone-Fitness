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
    console.log('🔧 Setting up Duration Fields in Workouts Table');

    if (!process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN || !process.env.AIRTABLE_BASE_ID) {
      throw new Error('Missing Airtable credentials');
    }

    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    // Note: Airtable API doesn't allow creating fields programmatically
    // This function will check if we can access the fields and provide guidance
    
    const fieldsToCheck = [
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

    console.log('Checking for duration fields in Workouts table...');
    
    // Try to fetch a record to see available fields
    try {
      const records = await base('Workouts')
        .select({ 
          maxRecords: 1,
          view: 'Grid view'
        })
        .firstPage();
      
      if (records.length > 0) {
        const existingFields = Object.keys(records[0].fields);
        const missingFields = fieldsToCheck.filter(field => !existingFields.includes(field));
        
        if (missingFields.length > 0) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: false,
              message: 'Duration fields are missing from Workouts table',
              missingFields: missingFields,
              instructions: `Please add these fields to your Airtable Workouts table:
                - Total Duration (Number - Integer)
                - Work Time (Number - Integer)
                - Rest Time (Number - Integer)
                - Set Count (Number - Integer)
                - Average Set Duration (Number - Integer)
                - Average Rest Duration (Number - Integer)
                - Workout Efficiency (Number - Integer, 0-100)
                - Start Time (Date with time)
                - End Time (Date with time)`
            })
          };
        } else {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: 'All duration fields are present in Workouts table!'
            })
          };
        }
      } else {
        // No records to check, try creating a test record
        try {
          const testRecord = await base('Workouts').create({
            'User ID': 'duration-field-test',
            Exercise: 'Field Test',
            Sets: 1,
            Reps: 1,
            Weight: 0,
            Date: new Date().toISOString().split('T')[0],
            'Total Duration': 0,
            'Work Time': 0,
            'Rest Time': 0,
            'Set Count': 0,
            'Average Set Duration': 0,
            'Average Rest Duration': 0,
            'Workout Efficiency': 0,
            'Start Time': new Date().toISOString(),
            'End Time': new Date().toISOString()
          });
          
          // If successful, delete the test record
          await base('Workouts').destroy(testRecord.id);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: 'Duration fields are properly configured!'
            })
          };
        } catch (createError) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: false,
              message: 'Duration fields need to be added to Workouts table',
              error: createError.message,
              instructions: `Please add these fields to your Airtable Workouts table:
                - Total Duration (Number - Integer, in seconds)
                - Work Time (Number - Integer, in seconds)
                - Rest Time (Number - Integer, in seconds)
                - Set Count (Number - Integer)
                - Average Set Duration (Number - Integer, in seconds)
                - Average Rest Duration (Number - Integer, in seconds)
                - Workout Efficiency (Number - Integer, percentage 0-100)
                - Start Time (Date with time)
                - End Time (Date with time)`
            })
          };
        }
      }
    } catch (error) {
      throw error;
    }

  } catch (error) {
    console.error('Error checking duration fields:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to check duration fields',
        message: error.message,
        details: error.stack
      })
    };
  }
};