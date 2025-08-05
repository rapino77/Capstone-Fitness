const Airtable = require('airtable');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'DELETE') {
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

    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    // First, get all weight records to count them
    const allRecords = [];
    await new Promise((resolve, reject) => {
      base('BodyWeight')
        .select()
        .eachPage(
          (pageRecords, fetchNextPage) => {
            allRecords.push(...pageRecords);
            fetchNextPage();
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

    if (allRecords.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'No weight entries found to delete',
          deletedCount: 0
        })
      };
    }

    // Delete records in batches of 10 (Airtable limit)
    let totalDeleted = 0;
    const recordIds = allRecords.map(record => record.id);
    
    for (let i = 0; i < recordIds.length; i += 10) {
      const batch = recordIds.slice(i, i + 10);
      try {
        await base('BodyWeight').destroy(batch);
        totalDeleted += batch.length;
      } catch (error) {
        console.error(`Error deleting batch ${Math.floor(i/10) + 1}:`, error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: 'Failed to delete all weight entries',
            message: error.message,
            partialSuccess: {
              totalRecords: allRecords.length,
              deletedCount: totalDeleted,
              remainingCount: allRecords.length - totalDeleted
            }
          })
        };
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully deleted all ${totalDeleted} weight entries`,
        deletedCount: totalDeleted,
        originalCount: allRecords.length
      })
    };

  } catch (error) {
    console.error('Error resetting weight entries:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to reset weight entries',
        message: error.message
      })
    };
  }
};