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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Check environment variables
    if (!process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN) {
      throw new Error('AIRTABLE_PERSONAL_ACCESS_TOKEN environment variable is not set');
    }
    if (!process.env.AIRTABLE_BASE_ID) {
      throw new Error('AIRTABLE_BASE_ID environment variable is not set');
    }

    const data = JSON.parse(event.body);
    
    // Validate required fields
    if (!data.weight) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required field: weight'
        })
      };
    }

    // Validate weight
    const weight = Number(data.weight);
    if (isNaN(weight) || weight <= 0 || weight > 1000) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Weight must be a positive number between 0 and 1000' })
      };
    }

    // Validate date if provided
    if (data.date) {
      const date = new Date(data.date);
      if (isNaN(date.getTime())) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid date format' })
        };
      }

      // Check if date is not in the future
      if (date > new Date()) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Date cannot be in the future' })
        };
      }
    }

    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    // Create record in Airtable - start with minimal fields that work
    const recordData = {
      Weight: weight
    };
    
    // Add optional fields only if they're provided and non-empty
    if (data.date) {
      recordData.Date = data.date;
    }
    if (data.unit) {
      recordData.Unit = data.unit;
    }
    if (data.notes) {
      recordData.Notes = data.notes;
    }
    
    console.log('Creating record with data:', recordData);
    const record = await base('BodyWeight').create(recordData);

    // Auto-update body weight goals after logging weight
    try {
      console.log('Auto-updating body weight goals after weight logging...');
      
      // Get all active Body Weight goals and update them with the new weight
      const goalRecords = await base('Goals').select({
        filterByFormula: `AND({Status} = 'Active', {Goal Type} = 'Body Weight')`,
      }).all();
      
      console.log(`Found ${goalRecords.length} active body weight goals to update`);
      
      let goalsUpdated = 0;
      for (const goalRecord of goalRecords) {
        try {
          const goalId = goalRecord.id;
          const currentValue = goalRecord.get('Current Value') || 0;
          
          // Update the goal's current value with the new weight
          if (weight !== currentValue) {
            await base('Goals').update(goalId, {
              'Current Value': weight
            });
            
            console.log(`Updated goal ${goalId}: ${currentValue} → ${weight} lbs`);
            
            // Calculate progress percentage for potential milestone celebrations
            const targetValue = Number(goalRecord.get('Target Value'));
            const oldProgressPercentage = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;
            const newProgressPercentage = targetValue > 0 ? (weight / targetValue) * 100 : 0;
            
            console.log(`Goal progress: ${oldProgressPercentage.toFixed(1)}% → ${newProgressPercentage.toFixed(1)}%`);
            
            goalsUpdated++;
          }
        } catch (goalError) {
          console.error(`Failed to update goal ${goalRecord.id}:`, goalError);
        }
      }
      
      console.log(`Successfully updated ${goalsUpdated} body weight goals`);
      
    } catch (goalUpdateError) {
      console.error('Failed to auto-update body weight goals:', goalUpdateError);
      // Don't fail the weight logging if goal update fails
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Weight logged successfully',
        id: record.id,
        data: record.fields
      })
    };

  } catch (error) {
    console.error('Error logging weight:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to log weight',
        message: error.message
      })
    };
  }
};