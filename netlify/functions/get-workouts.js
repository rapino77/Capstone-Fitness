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

    // Build filter formula
    let filterFormulas = [];
    
    if (startDate) {
      filterFormulas.push(`IS_AFTER({Date}, '${startDate}')`);
    }
    
    if (endDate) {
      filterFormulas.push(`IS_BEFORE({Date}, '${endDate}')`);
    }
    
    if (exercise) {
      filterFormulas.push(`SEARCH(LOWER('${exercise}'), LOWER({Exercise}))`);
    }

    const filterFormula = filterFormulas.length > 0 
      ? `AND(${filterFormulas.join(', ')})` 
      : '';

    // Query configuration
    const queryConfig = {
      pageSize: Math.min(parseInt(limit), 100),
      sort: [{
        field: sortBy,
        direction: sortDirection
      }]
    };

    if (filterFormula) {
      queryConfig.filterByFormula = filterFormula;
    }

    // Fetch records
    const records = [];
    await base('Workouts')
      .select(queryConfig)
      .eachPage((pageRecords, fetchNextPage) => {
        records.push(...pageRecords);
        if (records.length < parseInt(limit)) {
          fetchNextPage();
        }
      });

    // Apply offset manually
    const offsetInt = parseInt(offset);
    const paginatedRecords = records.slice(offsetInt, offsetInt + parseInt(limit));

    // Format response
    const formattedRecords = paginatedRecords.map(record => ({
      id: record.id,
      exercise: record.get('Exercise'),
      sets: record.get('Sets'),
      reps: record.get('Reps'),
      weight: record.get('Weight'),
      date: record.get('Date'),
      notes: record.get('Notes'),
      createdAt: record.get('CreatedAt')
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