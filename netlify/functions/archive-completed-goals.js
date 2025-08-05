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
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    const data = JSON.parse(event.body || '{}');
    const { goalId, archiveAll } = data;

    if (archiveAll) {
      // Archive all completed goals
      const completedGoals = [];
      await base('Goals')
        .select({
          filterByFormula: `{Status} = 'Completed'`
        })
        .eachPage((records, fetchNextPage) => {
          completedGoals.push(...records);
          fetchNextPage();
        });

      const archivePromises = completedGoals.map(goal => 
        base('Goals').update(goal.id, { 'Status': 'Archived' })
      );

      await Promise.all(archivePromises);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `Archived ${completedGoals.length} completed goals`,
          archivedCount: completedGoals.length
        })
      };
    } else if (goalId) {
      // Archive specific goal
      const goal = await base('Goals').find(goalId);
      
      if (goal.get('Status') !== 'Completed') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Goal must be completed before archiving',
            currentStatus: goal.get('Status')
          })
        };
      }

      const archivedGoal = await base('Goals').update(goalId, {
        'Status': 'Archived'
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Goal archived successfully',
          data: {
            id: archivedGoal.id,
            status: archivedGoal.get('Status')
          }
        })
      };
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Either goalId or archiveAll must be provided'
        })
      };
    }

  } catch (error) {
    console.error('Archive goals error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to archive goals',
        message: error.message
      })
    };
  }
};