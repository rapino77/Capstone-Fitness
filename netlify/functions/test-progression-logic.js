// Simple test to verify progression logic works correctly
const getProgressionLogic = () => {
  const PROGRESSION_STRATEGIES = {
    LINEAR: 'linear',
    DOUBLE_PROGRESSION: 'double_progression',
    WAVE: 'wave',
    STEP: 'step'
  };

  function getProgressionParams(exerciseName) {
    const exerciseLower = exerciseName.toLowerCase();
    
    if (exerciseLower.includes('squat') || exerciseLower.includes('deadlift') || 
        exerciseLower.includes('bench') || exerciseLower.includes('press')) {
      return {
        weightIncrement: 5,
        maxRepRange: { low: 5, high: 8 },
        strategy: PROGRESSION_STRATEGIES.LINEAR
      };
    }
    
    return {};
  }

  return { getProgressionParams, PROGRESSION_STRATEGIES };
};

// Test the logic
const logic = getProgressionLogic();

console.log('Testing Bench Press params:', logic.getProgressionParams('Bench Press'));
console.log('Testing Squat params:', logic.getProgressionParams('Squat'));  
console.log('Testing Bicep Curls params:', logic.getProgressionParams('Bicep Curls'));

// Test exercise detection
const exercises = ['Bench Press', 'bench press', 'Overhead Press', 'Deadlift', 'Bicep Curls'];
exercises.forEach(exercise => {
  const params = logic.getProgressionParams(exercise);
  console.log(`${exercise}: Strategy = ${params.strategy || 'default'}, Weight increment = ${params.weightIncrement || 'default'}`);
});