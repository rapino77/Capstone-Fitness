// Debug the date logic issue
const { format, startOfWeek, endOfWeek } = require('date-fns');

const today = new Date();
const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday

console.log('Date debugging:');
console.log('Today:', today);
console.log('Today ISO:', today.toISOString());
console.log('Today date string:', today.toISOString().split('T')[0]);

console.log('\nWeek boundaries:');
console.log('Week Start:', weekStart);
console.log('Week Start ISO:', weekStart.toISOString());
console.log('Week End:', weekEnd);
console.log('Week End ISO:', weekEnd.toISOString());

// Test the weight date
const weightDateStr = '2025-08-11';
const weightDate = new Date(weightDateStr);
console.log('\nWeight date:');
console.log('Weight date string:', weightDateStr);
console.log('Weight date object:', weightDate);
console.log('Weight date ISO:', weightDate.toISOString());

// Test the comparison
console.log('\nComparisons:');
console.log('weightDate >= weekStart:', weightDate >= weekStart);
console.log('weightDate <= weekEnd:', weightDate <= weekEnd);
console.log('Is in range:', weightDate >= weekStart && weightDate <= weekEnd);

// Check milliseconds
console.log('\nMilliseconds:');
console.log('WeekStart ms:', weekStart.getTime());
console.log('WeightDate ms:', weightDate.getTime());
console.log('WeekEnd ms:', weekEnd.getTime());

// Try different date parsing
console.log('\nTrying different date parsing:');
const weightDate2 = new Date(weightDateStr + 'T00:00:00');
console.log('With T00:00:00:', weightDate2);
console.log('Is in range with T00:00:00:', weightDate2 >= weekStart && weightDate2 <= weekEnd);