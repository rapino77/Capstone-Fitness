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
  
  // Sort data by date to ensure chronological order
  const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Use raw weight data instead of moving averages for trend calculation
  const validData = sortedData.filter(item => item.weight && !isNaN(item.weight) && item.weight > 0);
  
  if (validData.length < 2) {
    return {
      direction: 'insufficient_data',
      rate: 0,
      confidence: 0
    };
  }
  
  // Get the most recent data points for the specified period
  const recentData = validData.slice(-Math.min(period, validData.length));
  
  if (recentData.length < 2) {
    return {
      direction: 'insufficient_data',
      rate: 0,
      confidence: 0
    };
  }
  
  const oldest = recentData[0];
  const newest = recentData[recentData.length - 1];
  
  const weightChange = newest.weight - oldest.weight;
  const daysDiff = Math.max(1, (new Date(newest.date) - new Date(oldest.date)) / (1000 * 60 * 60 * 24));
  
  // Calculate rate per week
  const ratePerWeek = (weightChange / daysDiff) * 7;
  
  let direction;
  if (Math.abs(ratePerWeek) < 0.1) {
    direction = 'maintaining';
  } else if (ratePerWeek > 0) {
    direction = 'gaining';
  } else {
    direction = 'losing';
  }
  
  // Confidence based on how much data we have and time span
  const minDaysForConfidence = period;
  const confidenceFromDataPoints = Math.min(recentData.length / Math.max(period / 2, 3), 1);
  const confidenceFromTimespan = Math.min(daysDiff / minDaysForConfidence, 1);
  const confidence = (confidenceFromDataPoints * confidenceFromTimespan) * 100;
  
  return {
    direction,
    rate: Number(ratePerWeek.toFixed(2)),
    confidence: Number(confidence.toFixed(1)),
    period,
    dataPoints: recentData.length,
    daysCovered: Math.round(daysDiff)
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
      console.log('Raw response data for debugging:', responseData.map(d => ({ date: d.date, weight: d.weight, id: d.id || 'no-id' })));
      
      // Calculate period-specific weight changes
      const calculatePeriodChange = (data, days) => {
        if (!data || data.length < 2) return 0;
        
        const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
        const now = new Date();
        const periodStart = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
        
        // Find entries within the period
        const periodData = sortedData.filter(entry => new Date(entry.date) >= periodStart);
        
        if (periodData.length < 2) return 0;
        
        const oldestInPeriod = periodData[0].weight;
        const newestInPeriod = periodData[periodData.length - 1].weight;
        
        return newestInPeriod - oldestInPeriod;
      };
      
      const stats = weights.length > 0 ? {
        current: weights[weights.length - 1] || 0,
        highest: Math.max(...weights),
        lowest: Math.min(...weights),
        average: weights.reduce((a, b) => a + b, 0) / weights.length,
        change7Day: calculatePeriodChange(responseData, 7),
        change30Day: calculatePeriodChange(responseData, 30),
        change90Day: calculatePeriodChange(responseData, 90),
        dataPoints: weights.length
      } : {
        current: 0,
        highest: 0,
        lowest: 0,
        average: 0,
        change7Day: 0,
        change30Day: 0,
        change90Day: 0,
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
      
      // Calculate period-specific weight changes
      const calculatePeriodChange = (data, days) => {
        if (!data || data.length < 2) return 0;
        
        const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
        const now = new Date();
        const periodStart = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
        
        // Find entries within the period
        const periodData = sortedData.filter(entry => new Date(entry.date) >= periodStart);
        
        if (periodData.length < 2) return 0;
        
        const oldestInPeriod = periodData[0].weight;
        const newestInPeriod = periodData[periodData.length - 1].weight;
        
        return newestInPeriod - oldestInPeriod;
      };
      
      const stats = weights.length > 0 ? {
        current: weights[weights.length - 1] || 0,
        highest: Math.max(...weights),
        lowest: Math.min(...weights),
        average: weights.reduce((a, b) => a + b, 0) / weights.length,
        change7Day: calculatePeriodChange(responseData, 7),
        change30Day: calculatePeriodChange(responseData, 30),
        change90Day: calculatePeriodChange(responseData, 90),
        dataPoints: weights.length
      } : {
        current: 0,
        highest: 0,
        lowest: 0,
        average: 0,
        change7Day: 0,
        change30Day: 0,
        change90Day: 0,
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