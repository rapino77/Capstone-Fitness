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

  try {
    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    // Try to read existing records to see the structure
    const records = [];
    await new Promise((resolve, reject) => {
      base('BodyWeight')
        .select({
          maxRecords: 3
        })
        .eachPage(
          (pageRecords, fetchNextPage) => {
            records.push(...pageRecords);
            resolve();
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

    const debugInfo = {
      recordCount: records.length,
      sampleRecords: records.map(record => ({
        id: record.id,
        fields: record.fields,
        fieldNames: Object.keys(record.fields)
      }))
    };

    // Try creating a minimal record
    let createResult = null;
    try {
      const newRecord = await base('BodyWeight').create({
        Weight: 175
      });
      createResult = {
        success: true,
        recordId: newRecord.id,
        fields: newRecord.fields
      };
    } catch (createError) {
      createResult = {
        success: false,
        error: createError.message
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'BodyWeight table debug info',
        debugInfo,
        createTest: createResult,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Debug BodyWeight error:', error);
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