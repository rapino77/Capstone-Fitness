// Final comprehensive test
const Airtable = require('airtable');
const { startOfWeek, endOfWeek } = require('date-fns');

const AIRTABLE_PERSONAL_ACCESS_TOKEN = 'patg29eYzmTxzkPBs.3589c09365cc76b4fea9184ada42e0e94bb6908657f8080e3a1bf804d7f96460';
const AIRTABLE_BASE_ID = 'appOIQOvR5PEoKqnx';

async function finalDebug() {
  console.log('🔍 FINAL DEBUG - EXACTLY WHAT WEEKLY REPORT SHOULD SEE...\n');
  
  const base = new Airtable({
    apiKey: AIRTABLE_PERSONAL_ACCESS_TOKEN
  }).base(AIRTABLE_BASE_ID);

  // Step 1: Simulate the get-weights API call exactly as WeeklyReport does
  console.log('=== STEP 1: SIMULATING get-weights API CALL ===');
  
  const allWeights = [];
  try {
    await new Promise((resolve, reject) => {
      base('BodyWeight')
        .select({
          filterByFormula: `{User ID} = 'default-user'`,
          sort: [{ field: 'Date', direction: 'desc' }]
        })
        .eachPage(
          (records, fetchNextPage) => {
            records.forEach(record => {
              allWeights.push({
                id: record.id,
                weight: record.get('Weight'),
                date: record.get('Date'),
                unit: record.get('Unit') || 'lbs',
                userId: record.get('User ID')
              });
            });
            fetchNextPage();
          },
          error => error ? reject(error) : resolve()
        );
    });
    
    console.log('✅ Retrieved weights from database:', allWeights.length);
    console.log('Recent weights:');
    allWeights.slice(0, 3).forEach(w => {
      console.log(`  - ID: ${w.id}, Date: ${w.date}, Weight: ${w.weight}, User: ${w.userId}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to get weights:', error.message);
    return;
  }

  // Step 2: Simulate exactly what WeeklyReport.js does for week filtering
  console.log('\n=== STEP 2: SIMULATING WEEKLY REPORT FILTERING ===');
  
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  
  console.log('Week boundaries:');
  console.log('  Start:', weekStart.toDateString(), weekStart.toISOString());
  console.log('  End:', weekEnd.toDateString(), weekEnd.toISOString());
  
  // Use the FIXED filtering logic from WeeklyReport.js
  const weekWeights = allWeights.filter(weight => {
    const dateStr = weight.date;
    const weightDate = new Date(dateStr + 'T12:00:00'); // Same fix as in WeeklyReport
    const isInRange = weightDate >= weekStart && weightDate <= weekEnd;
    console.log(`  - Weight on ${dateStr} (${weightDate.toDateString()}): ${isInRange ? '✅ INCLUDED' : '❌ EXCLUDED'}`);
    return isInRange;
  });
  
  console.log(`\n📊 Week filtering result: ${weekWeights.length} weights found for this week`);
  
  if (weekWeights.length > 0) {
    console.log('This week\'s weights:');
    weekWeights.forEach(w => {
      console.log(`  - ${w.date}: ${w.weight} ${w.unit}`);
    });
    
    // Simulate the report data structure
    const reportWeightData = {
      startWeight: weekWeights[0].weight,
      endWeight: weekWeights[weekWeights.length - 1].weight,
      change: weekWeights[weekWeights.length - 1].weight - weekWeights[0].weight,
      measurements: weekWeights.map(w => ({
        date: new Date(w.date + 'T12:00:00'),
        weight: w.weight,
        unit: w.unit
      }))
    };
    
    console.log('\n✅ WEEKLY REPORT SHOULD SHOW:');
    console.log(`  Start Weight: ${reportWeightData.startWeight} lbs`);
    console.log(`  End Weight: ${reportWeightData.endWeight} lbs`);
    console.log(`  Change: ${reportWeightData.change > 0 ? '+' : ''}${reportWeightData.change.toFixed(1)} lbs`);
    console.log(`  Measurements: ${reportWeightData.measurements.length}`);
    
    // Check the condition that determines if weight section shows data
    console.log(`\n🔍 Weight section visibility check:`);
    console.log(`  reportData.weight.measurements.length === 0: ${reportWeightData.measurements.length === 0}`);
    console.log(`  Should show data: ${reportWeightData.measurements.length > 0 ? 'YES' : 'NO'}`);
    
  } else {
    console.log('❌ NO WEIGHTS FOUND - Weekly Report will show "No weight measurements this week"');
  }

  // Step 3: Log a fresh weight for RIGHT NOW and test again
  console.log('\n=== STEP 3: LOGGING A FRESH WEIGHT FOR RIGHT NOW ===');
  const rightNow = new Date();
  const todayStr = rightNow.toISOString().split('T')[0];
  
  try {
    const freshWeight = await base('BodyWeight').create({
      Weight: 999, // Unique number so we can spot it
      Date: todayStr,
      'User ID': 'default-user',
      Unit: 'lbs'
    });
    
    console.log(`✅ Logged fresh test weight: ${freshWeight.id}`);
    console.log(`   Weight: 999 lbs on ${todayStr}`);
    
    // Wait a second then re-test the filtering
    console.log('\n🔄 Re-testing filtering with fresh weight...');
    const allWeightsRefresh = [...allWeights, {
      id: freshWeight.id,
      weight: 999,
      date: todayStr,
      unit: 'lbs',
      userId: 'default-user'
    }];
    
    const weekWeightsRefresh = allWeightsRefresh.filter(weight => {
      const dateStr = weight.date;
      const weightDate = new Date(dateStr + 'T12:00:00');
      const isInRange = weightDate >= weekStart && weightDate <= weekEnd;
      if (weight.weight === 999) {
        console.log(`  🆕 FRESH WEIGHT: ${dateStr} (${weightDate.toDateString()}): ${isInRange ? '✅ INCLUDED' : '❌ EXCLUDED'}`);
      }
      return isInRange;
    });
    
    console.log(`📊 After fresh weight: ${weekWeightsRefresh.length} weights found for this week`);
    
    if (weekWeightsRefresh.length > 0) {
      console.log('✅ WEEKLY REPORT SHOULD NOW DEFINITELY SHOW DATA!');
      console.log('Fresh weight should appear in the Weight Tracking section.');
    }
    
  } catch (error) {
    console.error('❌ Failed to log fresh weight:', error.message);
  }
}

finalDebug();