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
    console.log('=== UPDATING BODY WEIGHT GOALS ===');
    
    // Check environment variables
    if (!process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN || !process.env.AIRTABLE_BASE_ID) {
      throw new Error('Missing Airtable environment variables');
    }

    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    // Get all active Body Weight goals
    const goalRecords = await base('Goals').select({
      filterByFormula: `AND({Status} = 'Active', {Goal Type} = 'Body Weight')`,
    }).all();

    console.log(`Found ${goalRecords.length} active body weight goals`);

    if (goalRecords.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'No body weight goals to update'
        })
      };
    }

    // Get latest weight entry
    const weightRecords = await base('BodyWeight').select({
      sort: [{ field: 'Date', direction: 'desc' }],
      maxRecords: 1
    }).all();

    if (weightRecords.length === 0) {
      console.log('No weight data found');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'No weight data to update goals with'
        })
      };
    }

    const latestWeight = weightRecords[0].get('Weight');
    console.log(`Latest weight: ${latestWeight} lbs`);

    const updates = [];

    // Update each body weight goal
    for (const goalRecord of goalRecords) {
      try {
        const goalId = goalRecord.id;
        const currentValue = goalRecord.get('Current Value') || 0;
        
        // Only update if the weight has changed
        if (latestWeight !== currentValue) {
          await base('Goals').update(goalId, {
            'Current Value': latestWeight
          });
          
          console.log(`Updated goal ${goalId}: ${currentValue} → ${latestWeight} lbs`);
          
          updates.push({
            goalId,
            oldValue: currentValue,
            newValue: latestWeight
          });
        }
      } catch (error) {
        console.error(`Failed to update goal ${goalRecord.id}:`, error);
        updates.push({
          goalId: goalRecord.id,
          error: error.message
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Updated ${updates.filter(u => !u.error).length} body weight goals`,
        updates,
        latestWeight
      })
    };

  } catch (error) {
    console.error('Update body weight goals error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to update body weight goals',
        message: error.message
      })
    };
  }
};