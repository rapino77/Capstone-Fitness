const Airtable = require('airtable');

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

    // Fetch ALL records to debug
    const records = [];
    await new Promise((resolve, reject) => {
      base('BodyWeight')
        .select({
          sort: [{ field: 'Date', direction: 'asc' }]
        })
        .eachPage(
          (pageRecords, fetchNextPage) => {
            records.push(...pageRecords);
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

    // Debug all entries
    const debugData = records.map(record => ({
      id: record.id,
      weight: record.get('Weight'),
      date: record.get('Date'),
      unit: record.get('Unit') || 'lbs',
      notes: record.get('Notes'),
      createdAt: record.get('CreatedAt'),
      // Additional debugging info
      weightType: typeof record.get('Weight'),
      weightRaw: record.get('Weight'),
      isValidWeight: record.get('Weight') && !isNaN(record.get('Weight')) && record.get('Weight') > 0
    }));

    // Find potential issues
    const issues = debugData.filter(entry => 
      !entry.isValidWeight || 
      entry.weight > 300 || 
      entry.weight < 50
    );

    const validWeights = debugData
      .filter(entry => entry.isValidWeight)
      .map(entry => entry.weight);

    const stats = {
      totalRecords: debugData.length,
      validRecords: validWeights.length,
      invalidRecords: debugData.length - validWeights.length,
      highestWeight: validWeights.length > 0 ? Math.max(...validWeights) : 0,
      lowestWeight: validWeights.length > 0 ? Math.min(...validWeights) : 0,
      suspiciousEntries: issues.length
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        stats,
        allEntries: debugData,
        suspiciousEntries: issues,
        validWeights: validWeights.sort((a, b) => b - a) // Sorted highest to lowest
      })
    };

  } catch (error) {
    console.error('Error debugging weights:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to debug weights',
        message: error.message
      })
    };
  }
};