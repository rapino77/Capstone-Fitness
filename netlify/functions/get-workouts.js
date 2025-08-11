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

  if (event.httpMethod !== 'GET') {
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

    // Parse query parameters
    const params = event.queryStringParameters || {};
    const { 
      userId = 'default-user',
      // startDate, 
      // endDate, 
      // exercise, 
      limit = '100',
      offset = '0'
      // sortBy = 'Date',
      // sortDirection = 'desc'
    } = params;

    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    // Skip filter formula since table has no fields
    // Filters will cause errors on non-existent fields
    // const filterFormula = '';

    // Query configuration with User ID filter and sorting
    const queryConfig = {
      pageSize: Math.min(parseInt(limit), 100),
      filterByFormula: `{User ID} = '${userId}'`,
      sort: [
        { field: 'Date', direction: 'desc' }
        // Removed Created Time sort as it might not exist in table
      ]
    };

    // Fetch records
    const records = [];
    await new Promise((resolve, reject) => {
      base('Workouts')
        .select(queryConfig)
        .eachPage(
          (pageRecords, fetchNextPage) => {
            records.push(...pageRecords);
            if (records.length < parseInt(limit) && pageRecords.length > 0) {
              fetchNextPage();
            } else {
              resolve();
            }
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

    // Apply offset manually
    const offsetInt = parseInt(offset);
    const paginatedRecords = records.slice(offsetInt, offsetInt + parseInt(limit));

    // Format response - handle empty records
    const formattedRecords = paginatedRecords.map(record => {
      // Safely try to get created time from various sources
      let createdTime = 'Unknown';
      try {
        createdTime = record.get('Created Time') || 
                     record._rawJson?.createdTime || 
                     record.getId() || // Use record ID as fallback for ordering
                     'Unknown';
      } catch (err) {
        // Ignore errors getting created time
        createdTime = record.getId() || 'Unknown';
      }

      return {
        id: record.id,
        userId: record.get('User ID') || 'default-user',
        exercise: record.get('Exercise') || 'Unknown Exercise',
        sets: record.get('Sets') || 0,
        reps: record.get('Reps') || 0,
        weight: record.get('Weight') || 0,
        date: record.get('Date') || new Date().toISOString().split('T')[0],
        notes: record.get('Notes') || 'Empty record - add fields to Workouts table',
        createdTime: createdTime,
        isEmpty: Object.keys(record.fields).length === 0,
        // Duration fields for analytics
        duration: record.get('Total Duration') || record.get('Duration') || 0,
        totalDuration: record.get('Total Duration') || 0,
        workTime: record.get('Work Time') || 0,
        restTime: record.get('Rest Time') || 0,
        setCount: record.get('Set Count') || 0,
        avgSetDuration: record.get('Average Set Duration') || 0,
        avgRestDuration: record.get('Average Rest Duration') || 0,
        efficiency: record.get('Workout Efficiency') || 0,
        isPR: record.get('Is PR') || false
      };
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: formattedRecords,
        pagination: {
          offset: offsetInt,
          limit: parseInt(limit),
          total: records.length,
          hasMore: offsetInt + parseInt(limit) < records.length
        }
      })
    };

  } catch (error) {
    console.error('Error fetching workouts:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      userId: userId
    });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch workouts',
        message: error.message,
        details: error.stack?.split('\n')[0] || 'Unknown error'
      })
    };
  }
};