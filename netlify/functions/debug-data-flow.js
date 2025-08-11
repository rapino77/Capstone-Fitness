const Airtable = require('airtable');
const { format, startOfWeek, endOfWeek } = require('date-fns');

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
    console.log('🔍 Starting comprehensive data debug...');

    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    // Get current week boundaries
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday
    
    console.log(`Week range: ${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}`);

    // 1. Check all recent workouts (last 10)
    console.log('\n1️⃣ CHECKING RECENT WORKOUTS...');
    const allWorkouts = [];
    await new Promise((resolve, reject) => {
      base('Workouts')
        .select({
          sort: [{ field: 'Date', direction: 'desc' }],
          maxRecords: 10
        })
        .eachPage(
          (records, fetchNextPage) => {
            records.forEach(record => {
              const workout = {
                id: record.id,
                date: record.get('Date'),
                exercise: record.get('Exercise'),
                sets: record.get('Sets'),
                reps: record.get('Reps'),
                weight: record.get('Weight'),
                notes: record.get('Notes'),
                userId: record.get('User ID'),
                totalDuration: record.get('Total Duration'),
                workTime: record.get('Work Time'),
                efficiency: record.get('Workout Efficiency'),
                allFields: Object.keys(record.fields)
              };
              
              console.log(`📋 Workout ${record.id}:`, {
                date: workout.date,
                exercise: workout.exercise,
                sets: workout.sets,
                reps: workout.reps,
                weight: workout.weight,
                userId: workout.userId,
                hasDuration: !!(workout.totalDuration),
                totalDuration: workout.totalDuration
              });
              
              allWorkouts.push(workout);
            });
            fetchNextPage();
          },
          error => {
            if (error) reject(error);
            else resolve();
          }
        );
    });

    // 2. Filter for current week
    console.log('\n2️⃣ FILTERING FOR CURRENT WEEK...');
    const currentWeekWorkouts = allWorkouts.filter(workout => {
      const workoutDate = new Date(workout.date);
      const isInRange = workoutDate >= weekStart && workoutDate <= weekEnd;
      console.log(`  - ${workout.date} (${workout.exercise}): ${isInRange ? '✅ INCLUDED' : '❌ EXCLUDED'}`);
      return isInRange;
    });

    console.log(`Found ${currentWeekWorkouts.length} workouts this week`);

    // 3. Check what the weekly report would calculate
    console.log('\n3️⃣ WEEKLY REPORT CALCULATIONS...');
    const reportData = {
      totalWorkouts: 0,
      totalSets: 0,
      totalReps: 0,
      totalWeight: 0,
      totalExercises: 0,
      workoutsWithDuration: 0
    };

    const workoutsByDate = {};
    currentWeekWorkouts.forEach(w => {
      const date = w.date;
      if (!workoutsByDate[date]) {
        workoutsByDate[date] = { date: new Date(date), exercises: [] };
      }
      workoutsByDate[date].exercises.push({
        name: w.exercise,
        sets: w.sets,
        reps: w.reps,
        weight: w.weight
      });
      
      reportData.totalSets += parseInt(w.sets || 0);
      reportData.totalReps += parseInt(w.reps || 0);
      reportData.totalWeight += parseFloat(w.weight || 0);
      reportData.totalExercises += 1;
      
      if (w.totalDuration) {
        reportData.workoutsWithDuration += 1;
      }
    });

    reportData.totalWorkouts = Object.keys(workoutsByDate).length;

    console.log('Weekly report would show:', reportData);

    // 4. Check duration analytics data
    console.log('\n4️⃣ DURATION ANALYTICS CHECK...');
    const workoutsWithDuration = allWorkouts.filter(w => w.totalDuration || w.workTime);
    console.log(`Found ${workoutsWithDuration.length} workouts with duration data out of ${allWorkouts.length} total`);

    workoutsWithDuration.forEach(w => {
      console.log(`  - ${w.exercise} on ${w.date}: ${w.totalDuration}s total, ${w.workTime}s work, ${w.efficiency}% efficiency`);
    });

    // 5. Test the get-workouts endpoint directly
    console.log('\n5️⃣ TESTING GET-WORKOUTS ENDPOINT...');
    try {
      // Simulate the same call that the weekly report makes
      const testWorkouts = [];
      await new Promise((resolve, reject) => {
        base('Workouts')
          .select({
            filterByFormula: `{User ID} = 'default-user'`,
            sort: [{ field: 'Date', direction: 'desc' }],
            maxRecords: 20
          })
          .eachPage(
            (records, fetchNextPage) => {
              records.forEach(record => {
                testWorkouts.push({
                  id: record.id,
                  date: record.get('Date'),
                  exercise: record.get('Exercise'),
                  sets: record.get('Sets'),
                  reps: record.get('Reps'),
                  weight: record.get('Weight')
                });
              });
              fetchNextPage();
            },
            error => {
              if (error) reject(error);
              else resolve();
            }
          );
      });

      console.log(`GET-WORKOUTS simulation found ${testWorkouts.length} workouts for default-user`);

    } catch (error) {
      console.error('GET-WORKOUTS simulation failed:', error);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        debug: {
          weekRange: {
            start: weekStart.toISOString().split('T')[0],
            end: weekEnd.toISOString().split('T')[0]
          },
          allWorkouts: allWorkouts.length,
          currentWeekWorkouts: currentWeekWorkouts.length,
          workoutsWithDuration: workoutsWithDuration.length,
          weeklyReportData: reportData,
          recentWorkouts: allWorkouts.slice(0, 3).map(w => ({
            id: w.id,
            date: w.date,
            exercise: w.exercise,
            sets: w.sets,
            reps: w.reps,
            weight: w.weight,
            hasDuration: !!(w.totalDuration),
            allFieldsAvailable: w.allFields
          }))
        }
      }, null, 2)
    };

  } catch (error) {
    console.error('Debug failed:', error);
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