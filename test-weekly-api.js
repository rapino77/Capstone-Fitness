const Airtable = require('airtable');
const { startOfWeek, endOfWeek } = require('date-fns');

const baseId = 'appOIQOvR5PEoKqnx';
const token = 'patg29eYzmTxzkPBs.3589c09365cc76b4fea9184ada42e0e94bb6908657f8080e3a1bf804d7f96460';

async function testWeeklyLogic() {
  console.log('🔍 Testing Weekly Report logic...');
  
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  
  console.log('Week range:', weekStart.toISOString().split('T')[0], 'to', weekEnd.toISOString().split('T')[0]);
  
  try {
    const base = new Airtable({ apiKey: token }).base(baseId);
    
    // Get all workouts
    const allWorkouts = [];
    await new Promise((resolve, reject) => {
      base('Workouts')
        .select({})
        .eachPage(
          (records, fetchNextPage) => {
            allWorkouts.push(...records.map(r => r.fields));
            fetchNextPage();
          },
          (error) => {
            if (error) reject(error);
            else resolve();
          }
        );
    });
    
    console.log('\n📊 All workouts:');
    allWorkouts.forEach((w, i) => {
      console.log(`${i+1}. ${w.Date} - ${w.Exercise} (${w.Sets}x${w.Reps} @ ${w.Weight}lbs)`);
    });
    
    // Filter for this week
    const weekWorkouts = allWorkouts.filter(workout => {
      const workoutDate = new Date(workout.Date);
      const inRange = workoutDate >= weekStart && workoutDate <= weekEnd;
      console.log(`Checking ${workout.Date}: ${workoutDate.toISOString()} >= ${weekStart.toISOString()} && <= ${weekEnd.toISOString()} = ${inRange}`);
      return inRange;
    });
    
    console.log('\n🗓️ This week\'s workouts:');
    console.log(weekWorkouts);
    
    // Group by date
    const workoutsByDate = {};
    weekWorkouts.forEach(workout => {
      const date = workout.Date;
      if (!workoutsByDate[date]) {
        workoutsByDate[date] = {
          date: new Date(date),
          exercises: []
        };
      }
      
      workoutsByDate[date].exercises.push({
        name: workout.Exercise,
        sets: workout.Sets || 0,
        reps: workout.Reps || 0,
        weight: workout.Weight || 0
      });
    });

    const workoutsArray = Object.values(workoutsByDate).sort((a, b) => a.date - b.date);
    
    console.log('\n📋 Grouped workout sessions:');
    console.log(JSON.stringify(workoutsArray, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testWeeklyLogic();