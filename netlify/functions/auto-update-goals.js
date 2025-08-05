const Airtable = require('airtable');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('=== AUTO-UPDATING GOALS AFTER DATA CHANGE ===');
    
    const data = JSON.parse(event.body || '{}');
    console.log('Trigger data:', data);

    // This function will be called after:
    // - New workout logged
    // - New weight logged
    // - Workout updated/deleted
    // - Weight updated/deleted

    // Call the main goal calculation function
    const response = await fetch(`${process.env.NETLIFY_URL || 'https://delicate-gaufre-27c80c.netlify.app'}/.netlify/functions/calculate-goal-progress`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    console.log('Goal progress calculation result:', result);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Goals auto-updated successfully',
        trigger: data.trigger || 'manual',
        goalUpdates: result
      })
    };

  } catch (error) {
    console.error('Auto-update goals error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to auto-update goals',
        message: error.message
      })
    };
  }
};