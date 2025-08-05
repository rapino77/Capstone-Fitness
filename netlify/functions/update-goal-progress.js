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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('Update goal progress - Event body:', event.body);
    
    const data = JSON.parse(event.body || '{}');
    console.log('Parsed data:', data);

    // Validate required fields
    if (!data.goalId || data.progressValue === undefined) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: goalId and progressValue are required'
        })
      };
    }

    // Check environment variables
    if (!process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN) {
      throw new Error('AIRTABLE_PERSONAL_ACCESS_TOKEN environment variable is not set');
    }
    if (!process.env.AIRTABLE_BASE_ID) {
      throw new Error('AIRTABLE_BASE_ID environment variable is not set');
    }

    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    // Get the current goal
    const goalRecord = await base('Goals').find(data.goalId);
    const targetValue = goalRecord.get('Target Value');
    const progressValue = Number(data.progressValue);

    // Calculate progress percentage
    const progressPercentage = targetValue > 0 ? (progressValue / targetValue) * 100 : 0;

    // Try updating only Current Value first to see which fields work
    console.log('Attempting to update Current Value only...');
    
    try {
      // First, try just updating Current Value
      const updatedRecord = await base('Goals').update(data.goalId, {
        'Current Value': progressValue
      });
      
      console.log('Successfully updated Current Value');
      
      // Try to calculate and store progress percentage if field exists and is writable
      const progressPercentage = Math.min((progressValue / targetValue) * 100, 100);
      
      console.log('Calculated progress percentage:', progressPercentage);
      
      // Check if goal is completed and archive it
      let finalStatus = updatedRecord.get('Status');
      if (progressValue >= targetValue && finalStatus !== 'Archived') {
        console.log('Goal completed! Archiving...');
        try {
          const archivedRecord = await base('Goals').update(data.goalId, {
            'Status': 'Archived'
          });
          finalStatus = 'Archived';
          console.log('Goal successfully archived');
        } catch (archiveError) {
          console.error('Failed to archive goal:', archiveError);
          // Continue even if archiving fails
        }
      }
      
      // Return success with what we could update
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: progressValue >= targetValue ? 'Goal completed and archived!' : 'Goal progress updated successfully',
          data: {
            id: updatedRecord.id,
            currentValue: updatedRecord.get('Current Value'),
            calculatedProgress: progressPercentage,
            status: finalStatus,
            completed: progressValue >= targetValue,
            goalProgress: progressPercentage
          }
        })
      };
      
    } catch (updateError) {
      console.error('Failed to update Current Value:', updateError);
      
      // If Current Value also fails, try without any updates
      throw new Error(`Cannot update goal fields. Error: ${updateError.message}`);
    }

  } catch (error) {
    console.error('Update goal progress error:', error);
    console.error('Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to update goal progress',
        message: error.message
      })
    };
  }
};