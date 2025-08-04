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
    // Parse query parameters
    const params = event.queryStringParameters || {};
    const { 
      startDate, 
      endDate,
      limit = '365',  // Default to 1 year of data
      chartData = 'false'  // Return data formatted for charts
    } = params;

    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID);

    // Build filter formula
    let filterFormulas = [];
    
    if (startDate) {
      filterFormulas.push(`IS_AFTER({Date}, '${startDate}')`);
    }
    
    if (endDate) {
      filterFormulas.push(`IS_BEFORE({Date}, '${endDate}')`);
    }

    const filterFormula = filterFormulas.length > 0 
      ? `AND(${filterFormulas.join(', ')})` 
      : '';

    // Query configuration
    const queryConfig = {
      pageSize: Math.min(parseInt(limit), 100),
      sort: [{
        field: 'Date',
        direction: 'asc'  // Ascending for chart data
      }]
    };

    if (filterFormula) {
      queryConfig.filterByFormula = filterFormula;
    }

    // Fetch records
    const records = [];
    await base('BodyWeight')
      .select(queryConfig)
      .eachPage((pageRecords, fetchNextPage) => {
        records.push(...pageRecords);
        if (records.length < parseInt(limit)) {
          fetchNextPage();
        }
      });

    // Format response
    let responseData;
    
    if (chartData === 'true') {
      // Format for chart visualization
      responseData = records.map(record => ({
        date: record.get('Date'),
        weight: record.get('Weight'),
        unit: record.get('Unit') || 'lbs'
      }));

      // Calculate statistics
      const weights = responseData.map(d => d.weight);
      const stats = {
        current: weights[weights.length - 1] || 0,
        highest: Math.max(...weights),
        lowest: Math.min(...weights),
        average: weights.reduce((a, b) => a + b, 0) / weights.length,
        change: weights.length > 1 ? weights[weights.length - 1] - weights[0] : 0
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: responseData,
          stats,
          count: responseData.length
        })
      };
    } else {
      // Standard format
      responseData = records.map(record => ({
        id: record.id,
        weight: record.get('Weight'),
        date: record.get('Date'),
        unit: record.get('Unit') || 'lbs',
        notes: record.get('Notes'),
        createdAt: record.get('CreatedAt')
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: responseData,
          count: responseData.length
        })
      };
    }

  } catch (error) {
    console.error('Error fetching weights:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch weights',
        message: error.message
      })
    };
  }
};