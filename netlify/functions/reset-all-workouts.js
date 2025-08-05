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

    // Fetch all workout records first
    const recordsToDelete = [];
    await new Promise((resolve, reject) => {
      base('Workouts')
        .select({
          pageSize: 100 // Maximum allowed by Airtable
        })
        .eachPage(
          (pageRecords, fetchNextPage) => {
            recordsToDelete.push(...pageRecords.map(record => record.id));
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

    console.log(`Found ${recordsToDelete.length} workout records to delete`);

    if (recordsToDelete.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'No workouts to delete',
          deletedCount: 0
        })
      };
    }

    // Delete records in batches (Airtable allows max 10 records per batch)
    const batchSize = 10;
    let deletedCount = 0;

    for (let i = 0; i < recordsToDelete.length; i += batchSize) {
      const batch = recordsToDelete.slice(i, i + batchSize);
      console.log(`Deleting batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records`);
      
      await base('Workouts').destroy(batch);
      deletedCount += batch.length;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully deleted all ${deletedCount} workout records`,
        deletedCount: deletedCount
      })
    };

  } catch (error) {
    console.error('Error resetting workouts:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to reset workouts',
        message: error.message
      })
    };
  }
};