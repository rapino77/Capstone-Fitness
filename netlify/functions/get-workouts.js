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
      startDate, 
      endDate, 
      exercise, 
      limit = '100',
      offset = '0',
      sortBy = 'Date',
      sortDirection = 'desc'
    } = params;

    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    // Skip filter formula since table has no fields
    // Filters will cause errors on non-existent fields
    const filterFormula = '';

    // Query configuration - remove sort since table has no fields
    const queryConfig = {
      pageSize: Math.min(parseInt(limit), 100)
      // Can't sort by fields that don't exist
    };

    // Skip filter formula since table has no fields to filter on
    // if (filterFormula) {
    //   queryConfig.filterByFormula = filterFormula;
    // }

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
    const formattedRecords = paginatedRecords.map(record => ({
      id: record.id,
      exercise: record.get('Exercise') || 'Unknown Exercise',
      sets: record.get('Sets') || 0,
      reps: record.get('Reps') || 0,
      weight: record.get('Weight') || 0,
      date: record.get('Date') || new Date().toISOString().split('T')[0],
      notes: record.get('Notes') || 'Empty record - add fields to Workouts table',
      createdAt: record.get('CreatedAt') || 'Unknown',
      isEmpty: Object.keys(record.fields).length === 0
    }));

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
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch workouts',
        message: error.message
      })
    };
  }
};