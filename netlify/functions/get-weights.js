const Airtable = require('airtable');

// Import weight calculation utilities
const calculateMovingAverage = (data, days) => {
  if (!data || data.length === 0) return [];
  
  const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  return sortedData.map((item, index) => {
    const startIndex = Math.max(0, index - days + 1);
    const relevantData = sortedData.slice(startIndex, index + 1);
    
    const sum = relevantData.reduce((acc, curr) => acc + curr.weight, 0);
    const average = sum / relevantData.length;
    
    return {
      ...item,
      [`ma${days}`]: Number(average.toFixed(1)),
      [`ma${days}Count`]: relevantData.length
    };
  });
};

const calculateAllMovingAverages = (data) => {
  if (!data || data.length === 0) return [];
  
  const dataWith7Day = calculateMovingAverage(data, 7);
  const dataWithBoth = calculateMovingAverage(dataWith7Day, 30);
  
  return dataWithBoth;
};

const calculateWeightTrend = (data, period = 7) => {
  if (!data || data.length < 2) {
    return {
      direction: 'insufficient_data',
      rate: 0,
      confidence: 0
    };
  }
  
  const maKey = `ma${period}`;
  const validData = data.filter(item => item[maKey] !== undefined);
  
  if (validData.length < 2) {
    return {
      direction: 'insufficient_data',
      rate: 0,
      confidence: 0
    };
  }
  
  const recent = validData[validData.length - 1];
  const older = validData[Math.max(0, validData.length - period)];
  
  const recentWeight = recent[maKey];
  const olderWeight = older[maKey];
  const daysDiff = Math.max(1, (new Date(recent.date) - new Date(older.date)) / (1000 * 60 * 60 * 24));
  
  const weightChange = recentWeight - olderWeight;
  const ratePerWeek = (weightChange / daysDiff) * 7;
  
  let direction;
  if (Math.abs(ratePerWeek) < 0.1) {
    direction = 'maintaining';
  } else if (ratePerWeek > 0) {
    direction = 'gaining';
  } else {
    direction = 'losing';
  }
  
  const confidence = Math.min(validData.length / period, 1) * 100;
  
  return {
    direction,
    rate: Number(ratePerWeek.toFixed(2)),
    confidence: Number(confidence.toFixed(1)),
    period,
    dataPoints: validData.length
  };
};

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
      limit = '365',  // Default to 1 year of data
      chartData = 'false'  // Return data formatted for charts
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
    await new Promise((resolve, reject) => {
      base('BodyWeight')
        .select(queryConfig)
        .eachPage(
          (pageRecords, fetchNextPage) => {
            records.push(...pageRecords);
            if (records.length < parseInt(limit)) {
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

    // Format response
    let responseData;
    
    if (chartData === 'true') {
      // Format for chart visualization
      responseData = records.map(record => ({
        date: record.get('Date'),
        weight: record.get('Weight'),
        unit: record.get('Unit') || 'lbs'
      }));

      // Calculate moving averages
      const dataWithTrends = calculateAllMovingAverages(responseData);
      
      // Calculate basic statistics
      const weights = responseData.map(d => d.weight).filter(w => w && !isNaN(w) && w > 0);
      console.log('Calculating stats for weights:', weights);
      
      const stats = weights.length > 0 ? {
        current: weights[weights.length - 1] || 0,
        highest: Math.max(...weights),
        lowest: Math.min(...weights),
        average: weights.reduce((a, b) => a + b, 0) / weights.length,
        change: weights.length > 1 ? weights[weights.length - 1] - weights[0] : 0,
        dataPoints: weights.length
      } : {
        current: 0,
        highest: 0,
        lowest: 0,
        average: 0,
        change: 0,
        dataPoints: 0
      };
      
      console.log('Final calculated stats:', stats);

      // Calculate trend analysis
      const trend7Day = calculateWeightTrend(dataWithTrends, 7);
      const trend30Day = calculateWeightTrend(dataWithTrends, 30);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: dataWithTrends,
          stats: {
            ...stats,
            trends: {
              '7day': trend7Day,
              '30day': trend30Day
            }
          },
          count: responseData.length
        })
      };
    } else {
      // Standard format with all data
      responseData = records.map(record => ({
        id: record.id,
        weight: record.get('Weight'),
        date: record.get('Date'),
        unit: record.get('Unit') || 'lbs',
        notes: record.get('Notes'),
        createdAt: record.get('CreatedAt')
      }));

      // Calculate basic statistics for standard format too
      const weights = responseData.map(d => d.weight).filter(w => w && !isNaN(w) && w > 0);
      console.log('Standard format - calculating stats for weights:', weights);
      
      const stats = weights.length > 0 ? {
        current: weights[weights.length - 1] || 0,
        highest: Math.max(...weights),
        lowest: Math.min(...weights),
        average: weights.reduce((a, b) => a + b, 0) / weights.length,
        change: weights.length > 1 ? weights[weights.length - 1] - weights[0] : 0,
        dataPoints: weights.length
      } : {
        current: 0,
        highest: 0,
        lowest: 0,
        average: 0,
        change: 0,
        dataPoints: 0
      };
      
      console.log('Standard format - final calculated stats:', stats);

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