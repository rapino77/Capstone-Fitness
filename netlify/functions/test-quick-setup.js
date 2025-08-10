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
    // Check environment variables
    if (!process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN || !process.env.AIRTABLE_BASE_ID) {
      throw new Error('Missing Airtable credentials');
    }

    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    console.log('🧪 Testing Periodization System Setup');

    // Test 1: Check if Periodization table exists
    let tableExists = false;
    try {
      await base('Periodization').select({ maxRecords: 1 }).firstPage();
      tableExists = true;
      console.log('✅ Periodization table exists');
    } catch (error) {
      console.log('❌ Periodization table not found');
      console.log('📝 Please create "Periodization" table in Airtable with these fields:');
      console.log('  - User ID (Single line text)');
      console.log('  - Current Phase (Single select: HYPERTROPHY, STRENGTH, POWER, DELOAD)');
      console.log('  - Phase Start Date (Date)');
      console.log('  - Week in Phase (Number)');
      console.log('  - Total Weeks in Phase (Number)');
      console.log('  - Next Phase (Single select: HYPERTROPHY, STRENGTH, POWER, DELOAD)');
      console.log('  - Rotation Enabled (Checkbox)');
      console.log('  - Auto Progression (Checkbox)');
    }

    // Test 2: Check existing workouts
    const workouts = [];
    await new Promise((resolve, reject) => {
      base('Workouts')
        .select({ 
          filterByFormula: `{User ID} = 'default-user'`,
          maxRecords: 10,
          sort: [{ field: 'Date', direction: 'desc' }]
        })
        .eachPage(
          (records, fetchNextPage) => {
            records.forEach(record => {
              workouts.push({
                exercise: record.get('Exercise'),
                date: record.get('Date'),
                sets: record.get('Sets'),
                reps: record.get('Reps'),
                weight: record.get('Weight')
              });
            });
            fetchNextPage();
          },
          (error) => {
            if (error) reject(error);
            else resolve();
          }
        );
    });

    console.log(`📊 Found ${workouts.length} existing workouts`);

    // Test 3: Test rotation logic without database
    const { generateRotationSuggestions, determineCurrentPhase } = require('./rotation-logic');
    
    if (workouts.length > 0) {
      // Test rotation suggestions for most recent exercise
      const recentExercise = workouts[0].exercise;
      const suggestions = generateRotationSuggestions(recentExercise, workouts, { maxSuggestions: 3 });
      const currentPhase = determineCurrentPhase(workouts);

      console.log(`💡 Rotation test for ${recentExercise}:`);
      console.log(`   - ${suggestions.length} alternative exercises found`);
      console.log(`   - Current phase: ${currentPhase.phase} (Week ${currentPhase.weekInPhase})`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        setupStatus: {
          periodizationTableExists: tableExists,
          workoutCount: workouts.length,
          sampleWorkouts: workouts.slice(0, 3),
          testResults: workouts.length > 0 ? 'Rotation logic tested successfully' : 'Need workout data for full test'
        },
        nextSteps: tableExists ? [
          'Table setup complete',
          'Test the UI by enabling periodization in workout form'
        ] : [
          'Create Periodization table in Airtable',
          'Add the required fields as specified above',
          'Run this test again'
        ]
      })
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Setup test failed',
        message: error.message
      })
    };
  }
};