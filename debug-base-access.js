// Debug base access with detailed error info
const Airtable = require('airtable');
require('dotenv').config();

async function debugBaseAccess() {
  console.log('🔍 DEBUGGING BASE ACCESS...\n');
  
  console.log('Environment variables:');
  console.log('- AIRTABLE_PERSONAL_ACCESS_TOKEN:', process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN ? 
    `${process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN.substring(0, 20)}...` : 'MISSING');
  console.log('- AIRTABLE_BASE_ID:', process.env.AIRTABLE_BASE_ID || 'MISSING');
  
  try {
    console.log('\n=== TESTING BASE CONNECTION ===');
    const airtable = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    });
    console.log('✅ Airtable client created');
    
    const base = airtable.base(process.env.AIRTABLE_BASE_ID);
    console.log('✅ Base reference created');
    
    // Try to list tables using the API (this might give us better error info)
    console.log('\n=== TRYING TO ACCESS ANY TABLE ===');
    
    // Let's try the most generic approach - try to get schema info
    try {
      // This is a hack - try to create a record with minimal data to see what error we get
      const testResult = await base('Test').select({ maxRecords: 1 }).firstPage();
      console.log('Unexpected: Test table exists');
    } catch (testError) {
      console.log('Test table error (expected):', testError.message);
      console.log('Error type:', testError.constructor.name);
      console.log('Status code:', testError.statusCode);
      
      if (testError.message.includes('Could not find table')) {
        console.log('\n📋 The base exists but we need to find the correct table names.');
        console.log('Please go to your Airtable base and tell me the exact table names you see.');
        console.log('Base URL: https://airtable.com/' + process.env.AIRTABLE_BASE_ID);
      } else if (testError.statusCode === 401) {
        console.log('\n❌ AUTHENTICATION ERROR: API key is invalid or doesn\'t have access to this base');
      } else if (testError.statusCode === 404) {
        console.log('\n❌ BASE NOT FOUND: Base ID is wrong or base doesn\'t exist');
      }
    }
    
  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error.message);
    console.error('Error type:', error.constructor.name);
    console.error('Full error:', error);
    
    if (error.message.includes('Invalid API key')) {
      console.log('\n🔑 Your API key is invalid. Please check:');
      console.log('1. Go to https://airtable.com/create/tokens');
      console.log('2. Create a new personal access token');
      console.log('3. Give it access to your base');
      console.log('4. Update your .env file');
    }
  }
}

debugBaseAccess();