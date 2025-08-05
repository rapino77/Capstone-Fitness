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
    const { recordIds, dryRun = true } = JSON.parse(event.body || '{}');

    if (!recordIds || !Array.isArray(recordIds)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'recordIds array is required' })
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

    if (dryRun) {
      // Just show what would be deleted
      const recordsToDelete = [];
      for (const recordId of recordIds) {
        try {
          const record = await base('BodyWeight').find(recordId);
          recordsToDelete.push({
            id: record.id,
            weight: record.get('Weight'),
            date: record.get('Date'),
            notes: record.get('Notes')
          });
        } catch (error) {
          console.error(`Error finding record ${recordId}:`, error);
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          dryRun: true,
          message: `Would delete ${recordsToDelete.length} records`,
          recordsToDelete
        })
      };
    } else {
      // Actually delete the records
      const deleteResults = [];
      
      // Delete in batches of 10 (Airtable limit)
      for (let i = 0; i < recordIds.length; i += 10) {
        const batch = recordIds.slice(i, i + 10);
        try {
          const deletedRecords = await base('BodyWeight').destroy(batch);
          deleteResults.push(...deletedRecords.map(r => r.id));
        } catch (error) {
          console.error(`Error deleting batch ${i/10 + 1}:`, error);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
              error: 'Failed to delete records',
              message: error.message,
              partialSuccess: deleteResults
            })
          };
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          dryRun: false,
          deletedCount: deleteResults.length,
          deletedRecords: deleteResults
        })
      };
    }

  } catch (error) {
    console.error('Error in cleanup-weights:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to cleanup weights',
        message: error.message
      })
    };
  }
};