const Airtable = require('airtable');
const { format, startOfWeek, endOfWeek } = require('date-fns');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('🔍 Debug weekly report data flow...');
    
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    // Get current week boundaries
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    
    console.log(`Week range: ${weekStart.toDateString()} to ${weekEnd.toDateString()}`);

    // Check all weight records
    console.log('📊 Checking ALL weight records...');
    const allWeights = [];
    await new Promise((resolve, reject) => {
      base('BodyWeight')
        .select({
          sort: [{ field: 'Date', direction: 'desc' }],
          maxRecords: 20
        })
        .eachPage(
          (records, fetchNextPage) => {
            records.forEach(record => {
              allWeights.push({
                id: record.id,
                date: record.get('Date'),
                weight: record.get('Weight'),
                userId: record.get('User ID'),
                unit: record.get('Unit'),
                allFields: Object.keys(record.fields)
              });
            });
            fetchNextPage();
          },
          error => error ? reject(error) : resolve()
        );
    });
    
    // Filter for this week
    const thisWeekWeights = allWeights.filter(w => {
      const weightDate = new Date(w.date);
      return weightDate >= weekStart && weightDate <= weekEnd;
    });
    
    // Filter for default user
    const userWeights = allWeights.filter(w => w.userId === 'default-user');
    const userThisWeek = thisWeekWeights.filter(w => w.userId === 'default-user');

    const result = {
      success: true,
      debug: {
        environmentCheck: {
          hasToken: !!process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN,
          hasBaseId: !!process.env.AIRTABLE_BASE_ID,
          baseId: process.env.AIRTABLE_BASE_ID
        },
        weekRange: {
          start: weekStart.toDateString(),
          end: weekEnd.toDateString()
        },
        weightData: {
          totalRecords: allWeights.length,
          thisWeekTotal: thisWeekWeights.length,
          defaultUserTotal: userWeights.length,
          defaultUserThisWeek: userThisWeek.length
        },
        recentWeights: allWeights.slice(0, 5),
        thisWeekWeights: thisWeekWeights,
        userThisWeekWeights: userThisWeek,
        sampleWeightProcessing: allWeights.length > 0 ? {
          originalWeight: allWeights[0],
          processedForWeeklyReport: {
            date: new Date(allWeights[0].date),
            weight: allWeights[0].weight,
            unit: allWeights[0].unit || 'lbs'
          }
        } : null
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result, null, 2)
    };

  } catch (error) {
    console.error('Debug failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Debug failed',
        message: error.message,
        stack: error.stack
      })
    };
  }
};