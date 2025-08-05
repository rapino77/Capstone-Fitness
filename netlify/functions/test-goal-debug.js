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

  try {
    console.log('Starting goal debug...');
    
    // Check environment variables
    if (!process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN || !process.env.AIRTABLE_BASE_ID) {
      throw new Error('Missing Airtable environment variables');
    }

    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    console.log('Airtable configured, fetching goals...');

    // Test fetching goals
    const records = await base('Goals').select({
      filterByFormula: `{Status} = 'Active'`,
      maxRecords: 3
    }).all();

    console.log(`Found ${records.length} active goals`);

    const goals = records.map(record => ({
      id: record.id,
      goalType: record.get('Goal Type'),
      targetValue: record.get('Target Value'),
      currentValue: record.get('Current Value') || 0,
      exerciseName: record.get('Exercise Name')
    }));

    console.log('Goals:', goals);

    // Test weight lookup if we have a body weight goal
    const bodyWeightGoal = goals.find(g => g.goalType === 'Body Weight');
    let weightTest = null;
    
    if (bodyWeightGoal) {
      console.log('Testing weight lookup...');
      const weightRecords = await base('BodyWeight').select({
        sort: [{ field: 'Date', direction: 'desc' }],
        maxRecords: 1
      }).all();
      
      weightTest = {
        recordCount: weightRecords.length,
        latestWeight: weightRecords.length > 0 ? weightRecords[0].get('Weight') : null,
        latestDate: weightRecords.length > 0 ? weightRecords[0].get('Date') : null
      };
      
      console.log('Weight test result:', weightTest);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Debug complete',
        goalCount: goals.length,
        goals: goals,
        weightTest: weightTest
      })
    };

  } catch (error) {
    console.error('Debug error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Debug failed',
        message: error.message
      })
    };
  }
};