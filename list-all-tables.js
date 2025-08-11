// Try to find what tables actually exist
const Airtable = require('airtable');
require('dotenv').config();

async function findTables() {
  console.log('🔍 SEARCHING FOR EXISTING TABLES...\n');
  
  const base = new Airtable({
    apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
  }).base(process.env.AIRTABLE_BASE_ID);
  
  // Common table name variations to try
  const possibleNames = [
    'Table 1', 'Table 2', 'Table 3',
    'tblWorkouts', 'tblBodyWeight', 'tblGoals',
    'Workout', 'Weight', 'Goal',
    'WorkoutData', 'WeightData', 'GoalData',
    'Exercise', 'Exercises', 'Training',
    'Data', 'Records', 'Entries',
    'Main', 'Primary', 'Sheet1'
  ];
  
  const foundTables = [];
  
  for (const tableName of possibleNames) {
    try {
      await new Promise((resolve, reject) => {
        base(tableName)
          .select({ maxRecords: 1 })
          .eachPage(
            (records, fetchNextPage) => {
              foundTables.push({
                name: tableName,
                hasData: records.length > 0,
                fields: records.length > 0 ? Object.keys(records[0].fields) : []
              });
              resolve();
            },
            error => error ? reject(error) : resolve()
          );
      });
      console.log(`✅ Found table: '${tableName}'`);
    } catch (error) {
      // Table doesn't exist, continue
    }
  }
  
  console.log('\n=== SUMMARY ===');
  if (foundTables.length === 0) {
    console.log('❌ NO TABLES FOUND! Your Airtable base might be empty or have different table names.');
    console.log('\nPlease check your Airtable base and create these tables:');
    console.log('1. Workouts (with fields: Exercise, Sets, Reps, Weight, Date, User ID, Notes)');
    console.log('2. BodyWeight (with fields: Weight, Date, User ID, Unit, Notes)');
    console.log('3. Goals (with fields: Title, Type, Target Value, Current Value, Status, User ID)');
  } else {
    console.log('Found tables:');
    foundTables.forEach(table => {
      console.log(`- ${table.name}: ${table.hasData ? 'HAS DATA' : 'EMPTY'}`);
      if (table.fields.length > 0) {
        console.log(`  Fields: ${table.fields.join(', ')}`);
      }
    });
  }
}

findTables();