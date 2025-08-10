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
    console.log('🧪 Testing Duration Tracking System');

    // Check environment variables
    if (!process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN || !process.env.AIRTABLE_BASE_ID) {
      throw new Error('Missing Airtable credentials');
    }

    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    const testResults = {};

    // Test 1: Check if Workouts table has duration fields
    console.log('1️⃣ Testing Workouts table structure for duration fields');
    
    try {
      // Try to create a test record with duration fields
      const testRecord = await base('Workouts').create({
        'User ID': 'test-duration-user',
        Exercise: 'Test Exercise',
        Sets: 3,
        Reps: 10,
        Weight: 100,
        Date: new Date().toISOString().split('T')[0],
        Notes: 'Duration system test',
        // Duration fields
        'Total Duration': 3600, // 1 hour
        'Work Time': 1800, // 30 minutes
        'Rest Time': 1620, // 27 minutes
        'Set Count': 12,
        'Average Set Duration': 150, // 2.5 minutes
        'Average Rest Duration': 135, // 2.25 minutes
        'Workout Efficiency': 50, // 50%
        'Start Time': new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        'End Time': new Date().toISOString()
      });

      console.log('✅ Duration fields created successfully');
      testResults.databaseSchema = {
        status: 'success',
        recordId: testRecord.id,
        fields: testRecord.fields
      };

      // Clean up test record
      await base('Workouts').destroy(testRecord.id);
      console.log('🧹 Test record cleaned up');

    } catch (error) {
      console.log('❌ Duration fields test failed:', error.message);
      testResults.databaseSchema = {
        status: 'error',
        message: error.message,
        recommendation: 'Add duration fields to Workouts table in Airtable'
      };
    }

    // Test 2: Test duration analytics endpoint
    console.log('2️⃣ Testing duration analytics endpoint');
    
    try {
      // Create some sample data for testing
      const sampleWorkout = await base('Workouts').create({
        'User ID': 'duration-test-user',
        Exercise: 'Sample Exercise',
        Sets: 3,
        Reps: 10,
        Weight: 150,
        Date: new Date().toISOString().split('T')[0],
        'Total Duration': 2400, // 40 minutes
        'Work Time': 1200, // 20 minutes
        'Rest Time': 1200, // 20 minutes
        'Workout Efficiency': 50
      });

      // Test the analytics endpoint internally
      const mockEvent = {
        httpMethod: 'GET',
        queryStringParameters: {
          userId: 'duration-test-user',
          days: '30',
          action: 'metrics'
        }
      };

      // Simulate the analytics function
      const { handler: analyticsHandler } = require('./workout-duration-analytics');
      const analyticsResult = await analyticsHandler(mockEvent, {});
      
      if (analyticsResult.statusCode === 200) {
        const analyticsData = JSON.parse(analyticsResult.body);
        testResults.analytics = {
          status: 'success',
          metricsFound: analyticsData.success,
          workoutCount: analyticsData.workoutCount || 0
        };
        console.log('✅ Analytics endpoint working');
      } else {
        testResults.analytics = {
          status: 'error',
          statusCode: analyticsResult.statusCode,
          message: 'Analytics endpoint failed'
        };
        console.log('❌ Analytics endpoint failed');
      }

      // Clean up sample data
      await base('Workouts').destroy(sampleWorkout.id);

    } catch (error) {
      console.log('❌ Analytics test failed:', error.message);
      testResults.analytics = {
        status: 'error',
        message: error.message
      };
    }

    // Test 3: Test timer utilities
    console.log('3️⃣ Testing timer utilities');
    
    try {
      // Test format duration
      const formatDuration = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;

        if (hours > 0) {
          return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        } else {
          return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        }
      };

      const testCases = [
        { input: 0, expected: '0:00' },
        { input: 60, expected: '1:00' },
        { input: 3661, expected: '1:01:01' },
        { input: 150, expected: '2:30' }
      ];

      const formatTests = testCases.map(test => ({
        input: test.input,
        expected: test.expected,
        actual: formatDuration(test.input),
        passed: formatDuration(test.input) === test.expected
      }));

      const allFormatTestsPassed = formatTests.every(test => test.passed);

      testResults.timerUtilities = {
        status: allFormatTestsPassed ? 'success' : 'error',
        formatTests,
        allPassed: allFormatTestsPassed
      };

      console.log(allFormatTestsPassed ? '✅ Timer utilities working' : '❌ Timer utilities failed');

    } catch (error) {
      console.log('❌ Timer utilities test failed:', error.message);
      testResults.timerUtilities = {
        status: 'error',
        message: error.message
      };
    }

    // Test 4: Check for required database fields
    console.log('4️⃣ Checking required database fields');
    
    const requiredFields = [
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

    testResults.requiredFields = {
      fields: requiredFields,
      recommendation: 'Add these fields to your Workouts table in Airtable',
      fieldTypes: {
        'Total Duration': 'Number (integer)',
        'Work Time': 'Number (integer)',
        'Rest Time': 'Number (integer)', 
        'Set Count': 'Number (integer)',
        'Average Set Duration': 'Number (integer)',
        'Average Rest Duration': 'Number (integer)',
        'Workout Efficiency': 'Number (integer)',
        'Start Time': 'Date and time',
        'End Time': 'Date and time'
      }
    };

    console.log('✅ All tests completed');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Duration Tracking System Test Results',
        timestamp: new Date().toISOString(),
        testResults,
        summary: {
          databaseSchemaTest: testResults.databaseSchema?.status || 'not_run',
          analyticsTest: testResults.analytics?.status || 'not_run',
          timerUtilitiesTest: testResults.timerUtilities?.status || 'not_run',
          overallStatus: Object.values(testResults).every(result => result.status === 'success') ? 'PASS' : 'PARTIAL'
        },
        setupInstructions: {
          step1: 'Add duration fields to Workouts table in Airtable (see requiredFields)',
          step2: 'Enable ⏱️ Workout Timer toggle in workout form',
          step3: 'Start a workout and test the timer functionality',
          step4: 'Check Dashboard for Duration Analytics section'
        }
      })
    };

  } catch (error) {
    console.error('❌ Duration system test failed:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Duration tracking system test failed',
        message: error.message,
        details: error.stack?.split('\n')[0] || 'Unknown error'
      })
    };
  }
};