const Airtable = require('airtable');

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
    console.log('🔍 Diagnosing Workout Logging Issues');
    
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    const diagnosis = {
      timestamp: new Date().toISOString(),
      tests: {}
    };

    // Test 1: Check if we can access the Workouts table
    console.log('Test 1: Checking Workouts table access...');
    try {
      const records = await base('Workouts').select({ maxRecords: 1 }).firstPage();
      diagnosis.tests.tableAccess = {
        success: true,
        message: 'Workouts table is accessible',
        recordCount: records.length
      };
      
      if (records.length > 0) {
        diagnosis.tests.tableAccess.existingFields = Object.keys(records[0].fields);
      }
    } catch (error) {
      diagnosis.tests.tableAccess = {
        success: false,
        error: error.message,
        suggestion: 'Check if "Workouts" table exists in your Airtable base'
      };
    }

    // Test 2: Try creating a minimal workout record
    console.log('Test 2: Testing minimal workout creation...');
    try {
      const testRecord = await base('Workouts').create({
        'Exercise': 'Diagnostic Test',
        'Sets': 1,
        'Reps': 1,
        'Weight': 0,
        'Date': new Date().toISOString().split('T')[0]
      });
      
      diagnosis.tests.minimalRecord = {
        success: true,
        message: 'Basic workout fields are working',
        recordId: testRecord.id
      };
      
      // Clean up
      await base('Workouts').destroy(testRecord.id);
      
    } catch (error) {
      diagnosis.tests.minimalRecord = {
        success: false,
        error: error.message,
        missingFields: [],
        suggestion: 'Check field names and types in Airtable'
      };
      
      // Try to identify which fields are missing
      const requiredFields = ['Exercise', 'Sets', 'Reps', 'Weight', 'Date'];
      for (const field of requiredFields) {
        try {
          await base('Workouts').create({ [field]: 'test' });
        } catch (fieldError) {
          if (fieldError.message.includes('Field')) {
            diagnosis.tests.minimalRecord.missingFields.push(field);
          }
        }
      }
    }

    // Test 3: Check duration fields
    console.log('Test 3: Checking duration fields...');
    const durationFields = [
      'Total Duration',
      'Work Time',
      'Rest Time',
      'Set Count',
      'Average Set Duration',
      'Average Rest Duration',
      'Workout Efficiency',
      'Start Time',
      'End Time'
    ];
    
    diagnosis.tests.durationFields = {
      fields: {},
      allPresent: false
    };

    // If we have access to existing fields, check which duration fields exist
    if (diagnosis.tests.tableAccess.success && diagnosis.tests.tableAccess.existingFields) {
      const existingFields = diagnosis.tests.tableAccess.existingFields;
      durationFields.forEach(field => {
        diagnosis.tests.durationFields.fields[field] = existingFields.includes(field);
      });
      
      diagnosis.tests.durationFields.allPresent = 
        durationFields.every(field => diagnosis.tests.durationFields.fields[field]);
    }

    // Generate recommendations
    diagnosis.recommendations = [];
    
    if (!diagnosis.tests.tableAccess.success) {
      diagnosis.recommendations.push({
        priority: 'HIGH',
        action: 'Verify that your Airtable base has a table named "Workouts" (case-sensitive)'
      });
    }
    
    if (!diagnosis.tests.minimalRecord.success) {
      diagnosis.recommendations.push({
        priority: 'HIGH',
        action: 'Ensure these fields exist in your Workouts table: Exercise (text), Sets (number), Reps (number), Weight (number), Date (date)'
      });
    }
    
    if (!diagnosis.tests.durationFields.allPresent) {
      const missingDurationFields = durationFields.filter(
        field => !diagnosis.tests.durationFields.fields[field]
      );
      
      if (missingDurationFields.length > 0) {
        diagnosis.recommendations.push({
          priority: 'MEDIUM',
          action: 'To enable workout duration tracking, add these fields to your Workouts table:',
          missingFields: missingDurationFields,
          note: 'Without these fields, the workout timer feature will not save duration data'
        });
      }
    }

    // Add solution steps
    diagnosis.solution = {
      steps: [
        '1. Go to your Airtable base',
        '2. Open the Workouts table',
        '3. Ensure these basic fields exist: Exercise, Sets, Reps, Weight, Date',
        '4. For duration tracking, add the missing duration fields listed above',
        '5. Field types: Numbers for durations (in seconds), Date with time for Start/End Time',
        '6. After adding fields, workouts should log successfully'
      ]
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        diagnosis,
        quickFix: 'To log workouts without duration tracking, disable the workout timer in the form'
      })
    };

  } catch (error) {
    console.error('Diagnosis error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to diagnose issue',
        message: error.message,
        suggestion: 'Check console logs in Netlify dashboard for more details'
      })
    };
  }
};