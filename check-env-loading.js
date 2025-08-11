// Check how environment variables are loaded
require('dotenv').config();
const fs = require('fs');

console.log('🔍 ENVIRONMENT VARIABLE DEBUG...\n');

console.log('=== READING .env FILE DIRECTLY ===');
try {
  const envContent = fs.readFileSync('.env', 'utf8');
  console.log('Raw .env content:');
  console.log(envContent);
} catch (error) {
  console.log('Could not read .env file:', error.message);
}

console.log('\n=== PROCESS.ENV VALUES ===');
console.log('AIRTABLE_PERSONAL_ACCESS_TOKEN:', process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN ? 
  `${process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN.substring(0, 20)}...` : 'UNDEFINED');
console.log('AIRTABLE_BASE_ID:', process.env.AIRTABLE_BASE_ID || 'UNDEFINED');
console.log('AIRTABLE_API_KEY:', process.env.AIRTABLE_API_KEY ? 
  `${process.env.AIRTABLE_API_KEY.substring(0, 20)}...` : 'UNDEFINED');

console.log('\n=== ALL AIRTABLE-RELATED ENV VARS ===');
Object.keys(process.env)
  .filter(key => key.includes('AIRTABLE'))
  .forEach(key => {
    console.log(`${key}: ${process.env[key]}`);
  });

// Try the actual base connection with the loaded values
console.log('\n=== TESTING CONNECTION WITH LOADED VALUES ===');
const Airtable = require('airtable');
try {
  const base = new Airtable({
    apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
  }).base(process.env.AIRTABLE_BASE_ID);
  
  console.log('✅ Base object created with:');
  console.log('- Token:', process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN?.substring(0, 20) + '...');
  console.log('- Base ID:', process.env.AIRTABLE_BASE_ID);
  
} catch (error) {
  console.log('❌ Failed to create base object:', error.message);
}