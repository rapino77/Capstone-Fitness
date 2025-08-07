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
    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    // Simple fetch of workouts
    const records = [];
    await new Promise((resolve, reject) => {
      base('Workouts')
        .select({
          maxRecords: 10
        })
        .eachPage(
          (pageRecords, fetchNextPage) => {
            records.push(...pageRecords);
            resolve();
          },
          (error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          }
        );
    });

    // Debug: Show raw field data first
    console.log('=== RAW WORKOUT RECORDS ===');
    records.forEach((record, idx) => {
      console.log(`Record ${idx}:`, {
        id: record.id,
        fields: Object.keys(record.fields),
        userId: record.get('User ID'),
        exercise: record.get('Exercise'),
        sets: record.get('Sets'),
        reps: record.get('Reps'),
        weight: record.get('Weight'),
        date: record.get('Date')
      });
    });

    // Format like the original function expects
    const formattedRecords = records.map(record => ({
      id: record.id,
      userId: record.get('User ID') || 'NO_USER_ID',
      exercise: record.get('Exercise') || 'Test Exercise',
      sets: record.get('Sets') || 3,
      reps: record.get('Reps') || 10,
      weight: record.get('Weight') || 135,
      date: record.get('Date') || new Date().toISOString().split('T')[0],
      notes: record.get('Notes') || 'Empty record - needs fields added to table',
      createdAt: record.get('CreatedAt') || 'Unknown'
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: formattedRecords,
        pagination: {
          offset: 0,
          limit: 10,
          total: records.length,
          hasMore: false
        },
        message: `Found ${records.length} workout records`
      })
    };

  } catch (error) {
    console.error('Test get workouts error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Test get workouts failed',
        message: error.message,
        stack: error.stack
      })
    };
  }
};