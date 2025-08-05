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

    // Update the goal record
    const updateFields = {
      'Current Value': progressValue,
      'Goal Progress': Math.min(progressPercentage, 100) // Cap at 100%
    };

    // Mark as completed if target reached
    if (progressValue >= targetValue) {
      updateFields['Status'] = 'Completed';
      updateFields['Created Date'] = new Date().toISOString().split('T')[0]; // Using Created Date as completion date
    }

    console.log('Updating goal with fields:', updateFields);

    const updatedRecord = await base('Goals').update(data.goalId, updateFields);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Goal progress updated successfully',
        data: {
          id: updatedRecord.id,
          currentValue: updatedRecord.get('Current Value'),
          goalProgress: updatedRecord.get('Goal Progress'),
          status: updatedRecord.get('Status'),
          completed: progressValue >= targetValue
        }
      })
    };

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