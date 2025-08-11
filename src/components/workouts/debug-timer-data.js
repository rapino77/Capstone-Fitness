// Add this to WorkoutForm.js to debug timer data
console.log('🔍 TIMER DEBUG INFO:');
console.log('Timer enabled:', timerEnabled);
console.log('Workout timer data:', workoutTimerData);
console.log('Submission data will include timer?', !!(workoutTimerData && (workoutTimerData.totalDuration || workoutTimerData.workTime)));

// In the submission section, add this detailed logging:
console.log('💾 DETAILED SUBMISSION DATA:');
console.log('Form data:', data);
console.log('Timer data available:', !!workoutTimerData);
console.log('Timer data contents:', workoutTimerData);
console.log('Final submission object:', submissionData);