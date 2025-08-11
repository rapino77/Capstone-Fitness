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
    const data = JSON.parse(event.body);
    
    console.log('🧪 TEST FORM SUBMISSION - Received data:');
    console.log('Full payload:', JSON.stringify(data, null, 2));
    console.log('Duration fields:', {
      totalDuration: data.totalDuration,
      workTime: data.workTime,
      restTime: data.restTime,
      setCount: data.setCount,
      efficiency: data.efficiency,
      hasDurationData: !!(data.totalDuration || data.workTime)
    });

    // Just return what we received without saving to Airtable
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Test form submission received',
        receivedData: data,
        durationFieldsPresent: {
          totalDuration: !!data.totalDuration,
          workTime: !!data.workTime,
          restTime: !!data.restTime,
          setCount: !!data.setCount,
          efficiency: !!data.efficiency
        },
        hasDurationData: !!(data.totalDuration || data.workTime)
      }, null, 2)
    };

  } catch (error) {
    console.error('Error in test form submission:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process test submission',
        message: error.message
      })
    };
  }
};