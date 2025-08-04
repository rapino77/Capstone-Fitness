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

    // Try to read existing records to see the structure
    const records = [];
    await new Promise((resolve, reject) => {
      base('Workouts')
        .select({
          maxRecords: 3
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

    const debugInfo = {
      recordCount: records.length,
      sampleRecords: records.map(record => ({
        id: record.id,
        fields: record.fields,
        fieldNames: Object.keys(record.fields)
      }))
    };

    // Try creating workout records with different field names
    const fieldTests = [];
    
    // Test common field name variations
    const testCases = [
      { name: 'Standard fields', data: { Exercise: 'Test', Sets: 3, Reps: 10, Weight: 135 } },
      { name: 'Lowercase fields', data: { exercise: 'Test', sets: 3, reps: 10, weight: 135 } },
      { name: 'Title case fields', data: { Exercise: 'Test', Sets: 3, Reps: 10, Weight: 135, Date: '2025-08-04' } },
      { name: 'Alternative names', data: { 'Exercise Name': 'Test', 'Set Count': 3, 'Rep Count': 10, 'Weight (lbs)': 135 } },
      { name: 'Minimal test', data: { Name: 'Test Exercise' } },
      { name: 'Another minimal', data: { Title: 'Test Exercise' } }
    ];
    
    for (const testCase of testCases) {
      try {
        const newRecord = await base('Workouts').create(testCase.data);
        fieldTests.push({
          testName: testCase.name,
          success: true,
          recordId: newRecord.id,
          fields: newRecord.fields,
          sentData: testCase.data
        });
        break; // Stop on first success
      } catch (createError) {
        fieldTests.push({
          testName: testCase.name,
          success: false,
          error: createError.message,
          sentData: testCase.data
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Workouts table debug info',
        debugInfo,
        fieldTests,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Debug Workouts error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Debug failed',
        message: error.message,
        stack: error.stack
      })
    };
  }
};