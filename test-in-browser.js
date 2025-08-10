// Copy and paste this into your browser console (F12 > Console tab)
// This tests the rotation logic without needing the full API

console.log('🧪 Testing Exercise Rotation Logic');

// Mock workout data for testing
const mockWorkouts = [
  { exercise: 'Bench Press', sets: 3, reps: 10, weight: 185, date: '2025-01-15' },
  { exercise: 'Bench Press', sets: 3, reps: 8, weight: 190, date: '2025-01-10' },
  { exercise: 'Squat', sets: 4, reps: 8, weight: 225, date: '2025-01-08' },
  { exercise: 'Deadlift', sets: 3, reps: 5, weight: 275, date: '2025-01-05' }
];

// Test exercise categories
const exerciseCategories = {
  'Bench Press': { category: 'CHEST', tier: 'primary' },
  'Squat': { category: 'LEGS', tier: 'primary' },
  'Bicep Curls': { category: 'ARMS', tier: 'secondary' }
};

// Test rotation scoring
function calculateRotationScore(exercise, workouts) {
  const exerciseWorkouts = workouts.filter(w => w.exercise === exercise);
  if (exerciseWorkouts.length === 0) return { score: 100, reason: 'Never performed' };
  
  const daysSince = Math.floor((new Date() - new Date(exerciseWorkouts[0].date)) / (1000 * 60 * 60 * 24));
  const staleness = Math.min(daysSince * 2, 100);
  const recentCount = exerciseWorkouts.filter(w => {
    const workoutDate = new Date(w.date);
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    return workoutDate >= fourWeeksAgo;
  }).length;
  
  const overusePenalty = Math.max(0, (recentCount - 4) * 15);
  const finalScore = Math.max(0, staleness - overusePenalty);
  
  return { score: Math.round(finalScore), reason: `${daysSince}d ago, ${recentCount} recent workouts` };
}

// Run tests
console.log('1️⃣ Exercise Categories:');
Object.entries(exerciseCategories).forEach(([exercise, category]) => {
  console.log(`   ${exercise}: ${category.category} - ${category.tier}`);
});

console.log('\n2️⃣ Rotation Scores:');
['Bench Press', 'Squat', 'Pull-ups'].forEach(exercise => {
  const score = calculateRotationScore(exercise, mockWorkouts);
  console.log(`   ${exercise}: Score ${score.score} (${score.reason})`);
});

console.log('\n3️⃣ Expected API Response Format:');
console.log({
  success: true,
  analysis: {
    currentPhase: {
      phase: 'HYPERTROPHY',
      weekInPhase: 1,
      totalWeeksInPhase: 4,
      recommendation: 'Focus on muscle building with 8-15 reps'
    },
    rotationSuggestions: [
      { exercise: 'Incline Bench Press', score: 85, recommendation: 'Highly Recommended', category: 'CHEST', tier: 'primary' },
      { exercise: 'Dumbbell Press', score: 75, recommendation: 'Good Alternative', category: 'CHEST', tier: 'secondary' }
    ],
    periodizedWorkout: {
      sets: 4,
      reps: 12,
      weight: 180,
      reasoning: 'Hypertrophy phase: 4 sets x 12 reps @ 180lbs'
    }
  }
});

console.log('\n✅ Logic test complete! If you see this structure in the UI, the system is working.');