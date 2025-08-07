// Test the new SIMPLE progression logic
const testSimpleProgression = () => {
  // Mock the simple calculateWeeklyProgression function
  function calculateWeeklyProgression(sortedWorkouts, exerciseName) {
    const lastWorkout = sortedWorkouts[0];
    const lastSets = lastWorkout.sets || lastWorkout.Sets || 3;
    const lastReps = lastWorkout.reps || lastWorkout.Reps || 10;
    const lastWeight = lastWorkout.weight || lastWorkout.Weight || 0;
    
    // SIMPLE RULE: Always add 5 lbs to whatever weight was last lifted
    const nextWeight = lastWeight + 5;
    
    return {
      suggestion: { sets: lastSets, reps: lastReps, weight: nextWeight },
      reason: `Add 5 lbs to your last workout (${lastWeight} → ${nextWeight} lbs)`,
      status: 'progressing'
    };
  }

  // Test the user's example
  console.log('=== SIMPLE PROGRESSION TESTS ===\n');

  console.log('Test 1: You lift 155 lbs');
  const test1 = calculateWeeklyProgression([
    { sets: 3, reps: 8, weight: 155, date: '2024-01-01' }
  ], 'Bench Press');
  console.log('Next suggestion:', test1.suggestion.weight, 'lbs');
  console.log('Expected: 160 lbs\n');

  console.log('Test 2: You lift 160 lbs');
  const test2 = calculateWeeklyProgression([
    { sets: 3, reps: 8, weight: 160, date: '2024-01-08' },
    { sets: 3, reps: 8, weight: 155, date: '2024-01-01' }
  ], 'Bench Press');
  console.log('Next suggestion:', test2.suggestion.weight, 'lbs');
  console.log('Expected: 165 lbs\n');

  console.log('Test 3: You lift 165 lbs');
  const test3 = calculateWeeklyProgression([
    { sets: 3, reps: 8, weight: 165, date: '2024-01-15' },
    { sets: 3, reps: 8, weight: 160, date: '2024-01-08' },
    { sets: 3, reps: 8, weight: 155, date: '2024-01-01' }
  ], 'Bench Press');
  console.log('Next suggestion:', test3.suggestion.weight, 'lbs');
  console.log('Expected: 170 lbs\n');

  console.log('✅ Simple rule: Always add 5 lbs to your last weight lifted');
  console.log('✅ No complex logic, just: Last Weight + 5 = Next Weight');
};

testSimpleProgression();