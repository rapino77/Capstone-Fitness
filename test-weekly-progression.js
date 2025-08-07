// Test the new weekly progression logic
const testWeeklyProgression = () => {
  // Mock the calculateWeeklyProgression function
  function calculateWeeklyProgression(sortedWorkouts, exerciseName) {
    const lastWorkout = sortedWorkouts[0];
    const lastSets = lastWorkout.sets || lastWorkout.Sets || 3;
    const lastReps = lastWorkout.reps || lastWorkout.Reps || 10;
    const lastWeight = lastWorkout.weight || lastWorkout.Weight || 0;
    
    // 1. If only 1 workout, add 5 lbs
    if (sortedWorkouts.length === 1) {
      const nextWeight = lastWeight + 5;
      return {
        suggestion: { sets: lastSets, reps: lastReps, weight: nextWeight },
        reason: `Weekly progression: Add 5 lbs (${lastWeight} → ${nextWeight} lbs)`,
        status: 'progressing'
      };
    }

    // 2. Check if we made the previous weight target
    const secondLastWorkout = sortedWorkouts[1];
    const previousWeight = secondLastWorkout.weight || secondLastWorkout.Weight || 0;
    
    // 3. If we made the weight, add 5 lbs
    if (lastWeight >= previousWeight) {
      const nextWeight = lastWeight + 5;
      return {
        suggestion: { sets: lastSets, reps: lastReps, weight: nextWeight },
        reason: `You hit ${lastWeight} lbs! Time to progress to ${nextWeight} lbs`,
        status: 'progressing'
      };
    }

    // 4. If we missed the weight, check for consecutive misses
    if (lastWeight < previousWeight) {
      let consecutiveMisses = 1;
      
      for (let i = 2; i < sortedWorkouts.length; i++) {
        const currentWorkout = sortedWorkouts[i-1];
        const prevWorkout = sortedWorkouts[i];
        
        const currentWeight = currentWorkout.weight || currentWorkout.Weight || 0;
        const prevWeight = prevWorkout.weight || prevWorkout.Weight || 0;
        
        if (currentWeight < prevWeight) {
          consecutiveMisses++;
        } else {
          break;
        }
      }

      // 5. If 2+ consecutive misses, deload by 25%
      if (consecutiveMisses >= 2) {
        const deloadWeight = Math.round(lastWeight * 0.75);
        return {
          suggestion: { sets: lastSets, reps: lastReps, weight: deloadWeight },
          reason: `Deload time! ${consecutiveMisses} misses in a row. Reset to ${deloadWeight} lbs (-25%)`,
          status: 'deloading'
        };
      }

      // 6. If 1 miss, retry the same weight
      return {
        suggestion: { sets: lastSets, reps: lastReps, weight: previousWeight },
        reason: `You missed ${previousWeight} lbs last time. Let's try it again!`,
        status: 'retry'
      };
    }
  }

  // Test scenarios
  console.log('=== WEEKLY PROGRESSION TESTS ===\n');

  // Test 1: First workout
  console.log('Test 1: First workout (50 lbs)');
  const test1 = calculateWeeklyProgression([
    { sets: 3, reps: 8, weight: 50, date: '2024-01-01' }
  ], 'Bench Press');
  console.log('Result:', test1.suggestion, '- Status:', test1.status);
  console.log('Expected: 55 lbs (progression)\n');

  // Test 2: Successful progression
  console.log('Test 2: Hit target weight (55 lbs after 50 lbs)');
  const test2 = calculateWeeklyProgression([
    { sets: 3, reps: 8, weight: 55, date: '2024-01-08' },
    { sets: 3, reps: 8, weight: 50, date: '2024-01-01' }
  ], 'Bench Press');
  console.log('Result:', test2.suggestion, '- Status:', test2.status);
  console.log('Expected: 60 lbs (progression)\n');

  // Test 3: First miss
  console.log('Test 3: First miss (45 lbs instead of 55 lbs)');
  const test3 = calculateWeeklyProgression([
    { sets: 3, reps: 8, weight: 45, date: '2024-01-08' },
    { sets: 3, reps: 8, weight: 50, date: '2024-01-01' }
  ], 'Bench Press');
  console.log('Result:', test3.suggestion, '- Status:', test3.status);
  console.log('Expected: 50 lbs (retry)\n');

  // Test 4: Two consecutive misses (deload)
  console.log('Test 4: Two consecutive misses - deload time');
  const test4 = calculateWeeklyProgression([
    { sets: 3, reps: 8, weight: 45, date: '2024-01-15' }, // Miss #2
    { sets: 3, reps: 8, weight: 47, date: '2024-01-08' }, // Miss #1 
    { sets: 3, reps: 8, weight: 50, date: '2024-01-01' }  // Target
  ], 'Bench Press');
  console.log('Result:', test4.suggestion, '- Status:', test4.status);
  console.log('Expected: ~34 lbs (75% of 45 = deload)\n');

  console.log('=== TESTS COMPLETE ===');
};

testWeeklyProgression();