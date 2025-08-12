const Airtable = require('airtable');
const { subDays, format } = require('date-fns');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
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
    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    const params = event.queryStringParameters || {};
    const {
      goalId,
      days = '30',
      limit = '100'
    } = params;

    // Calculate date range
    const endDate = new Date();
    const startDate = subDays(endDate, parseInt(days));
    const startDateStr = format(startDate, 'yyyy-MM-dd');

    // Build filter formula
    let filterFormulas = [
      `IS_AFTER({Date Recorded}, '${startDateStr}')`
    ];

    // If specific goalId is provided, filter by it
    if (goalId && goalId !== 'undefined') {
      filterFormulas.push(`{Goal ID} = '${goalId}'`);
    }

    const filterFormula = filterFormulas.length > 1 
      ? `AND(${filterFormulas.join(', ')})`
      : filterFormulas[0];

    console.log('Fetching goal progress with filter:', filterFormula);

    // Fetch progress records
    const progressRecords = [];
    
    try {
      await base('Goal Progress')
        .select({
          pageSize: Math.min(parseInt(limit), 100),
          sort: [{ field: 'Date Recorded', direction: 'desc' }],
          filterByFormula: filterFormula
        })
        .eachPage((pageRecords, fetchNextPage) => {
          progressRecords.push(...pageRecords);
          if (progressRecords.length < parseInt(limit)) {
            fetchNextPage();
          }
        });
    } catch (tableError) {
      console.log('Goal Progress table not found or no records, creating sample data');
      // If table doesn't exist or has no records, return empty data
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: [],
          count: 0,
          message: 'No progress records found'
        })
      };
    }

    // Fetch goals to get additional context
    const goals = [];
    try {
      await base('Goals')
        .select({
          pageSize: 100,
          filterByFormula: "{Status} = 'Active'"
        })
        .eachPage((pageRecords, fetchNextPage) => {
          goals.push(...pageRecords);
          fetchNextPage();
        });
    } catch (error) {
      console.log('Goals table error:', error.message);
    }

    // Create a map of goals for quick lookup
    const goalsMap = {};
    goals.forEach(goal => {
      goalsMap[goal.id] = {
        goalTitle: goal.get('Goal Title'),
        goalType: goal.get('Goal Type'),
        targetValue: goal.get('Target Value'),
        currentValue: goal.get('Current Value')
      };
    });

    // Format progress records with goal information
    const formattedRecords = progressRecords.map(record => {
      const goalIds = record.get('Goal ID') || [];
      const goalId = Array.isArray(goalIds) ? goalIds[0] : goalIds;
      const goalInfo = goalsMap[goalId] || {};
      
      const progressValue = record.get('Progress Value') || 0;
      const targetValue = goalInfo.targetValue || 1;
      const progressPercentage = (progressValue / targetValue) * 100;

      return {
        id: record.id,
        goalId: goalId,
        goalTitle: goalInfo.goalTitle,
        goalType: goalInfo.goalType,
        progressValue: progressValue,
        progressPercentage: Math.min(progressPercentage, 100),
        date: record.get('Date Recorded'),
        dateRecorded: record.get('Date Recorded'),
        progressType: record.get('Progress Type'),
        notes: record.get('Notes'),
        milestoneAchieved: record.get('Milestone Achieved'),
        createdAt: record.get('Created At')
      };
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: formattedRecords,
        count: formattedRecords.length,
        dateRange: {
          startDate: startDateStr,
          endDate: format(endDate, 'yyyy-MM-dd'),
          days: parseInt(days)
        }
      })
    };

  } catch (error) {
    console.error('Get Goal Progress API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        success: false
      })
    };
  }
};