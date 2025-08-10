const { 
  generateRotationSuggestions,
  calculateRotationScore,
  shouldRotateExercise,
  determineCurrentPhase,
  generatePeriodizedWorkout,
  getExerciseCategory,
  PERIODIZATION_PHASES
} = require('./rotation-logic');

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

  try {
    console.log('🧪 Testing Exercise Rotation and Periodization System');

    // Mock workout history for testing
    const mockWorkoutHistory = [
      { exercise: 'Bench Press', sets: 3, reps: 10, weight: 185, date: '2025-01-15' },
      { exercise: 'Bench Press', sets: 3, reps: 8, weight: 190, date: '2025-01-12' },
      { exercise: 'Bench Press', sets: 3, reps: 10, weight: 185, date: '2025-01-08' },
      { exercise: 'Squat', sets: 4, reps: 8, weight: 225, date: '2025-01-10' },
      { exercise: 'Deadlift', sets: 3, reps: 5, weight: 275, date: '2025-01-05' },
      { exercise: 'Overhead Press', sets: 3, reps: 8, weight: 125, date: '2025-01-03' }
    ];

    const testResults = {};

    // Test 1: Exercise Category Detection
    console.log('1️⃣ Testing Exercise Category Detection');
    const benchCategory = getExerciseCategory('Bench Press');
    const squatCategory = getExerciseCategory('Squat');
    const bicepCategory = getExerciseCategory('Bicep Curls');
    
    testResults.categoryDetection = {
      benchPress: benchCategory,
      squat: squatCategory,
      bicepCurls: bicepCategory
    };

    // Test 2: Rotation Score Calculation
    console.log('2️⃣ Testing Rotation Score Calculation');
    const benchScore = calculateRotationScore('Bench Press', mockWorkoutHistory);
    const pullUpsScore = calculateRotationScore('Pull-ups', mockWorkoutHistory); // Never performed
    
    testResults.rotationScores = {
      benchPress: benchScore,
      pullUps: pullUpsScore
    };

    // Test 3: Rotation Recommendations
    console.log('3️⃣ Testing Rotation Recommendations');
    const shouldRotateBench = shouldRotateExercise('Bench Press', mockWorkoutHistory);
    const shouldRotatePullups = shouldRotateExercise('Pull-ups', mockWorkoutHistory);
    
    testResults.rotationRecommendations = {
      benchPress: shouldRotateBench,
      pullUps: shouldRotatePullups
    };

    // Test 4: Rotation Suggestions
    console.log('4️⃣ Testing Rotation Suggestions');
    const benchSuggestions = generateRotationSuggestions('Bench Press', mockWorkoutHistory, {
      maxSuggestions: 3,
      includeAccessoryMovements: true,
      periodizationPhase: 'STRENGTH'
    });
    
    testResults.rotationSuggestions = {
      forBenchPress: benchSuggestions
    };

    // Test 5: Periodization Phase Determination
    console.log('5️⃣ Testing Periodization Phase Determination');
    const currentPhase = determineCurrentPhase(mockWorkoutHistory);
    
    testResults.periodization = {
      currentPhase
    };

    // Test 6: Periodized Workout Generation
    console.log('6️⃣ Testing Periodized Workout Generation');
    const lastBenchWorkout = mockWorkoutHistory.find(w => w.exercise === 'Bench Press');
    const hypertrophyWorkout = generatePeriodizedWorkout('Bench Press', 'HYPERTROPHY', lastBenchWorkout);
    const strengthWorkout = generatePeriodizedWorkout('Bench Press', 'STRENGTH', lastBenchWorkout);
    const deloadWorkout = generatePeriodizedWorkout('Bench Press', 'DELOAD', lastBenchWorkout);
    
    testResults.periodizedWorkouts = {
      hypertrophy: hypertrophyWorkout,
      strength: strengthWorkout,
      deload: deloadWorkout
    };

    // Test 7: Phase Information
    console.log('7️⃣ Testing Phase Information');
    testResults.phaseInfo = {
      availablePhases: Object.keys(PERIODIZATION_PHASES),
      phaseDetails: PERIODIZATION_PHASES
    };

    console.log('✅ All tests completed successfully!');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Exercise Rotation and Periodization System Test Results',
        timestamp: new Date().toISOString(),
        testResults,
        summary: {
          categoriesDetected: Object.keys(testResults.categoryDetection).length,
          scoresCalculated: Object.keys(testResults.rotationScores).length,
          suggestionsGenerated: testResults.rotationSuggestions.forBenchPress?.length || 0,
          periodsSupported: testResults.phaseInfo.availablePhases.length,
          currentPhase: testResults.periodization.currentPhase.phase
        }
      })
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Test failed',
        message: error.message,
        details: error.stack?.split('\n')[0] || 'Unknown error'
      })
    };
  }
};