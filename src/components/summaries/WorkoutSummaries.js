import React, { useState, useEffect } from 'react';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import axios from 'axios';

const WorkoutSummaries = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workoutData, setWorkoutData] = useState([]);
  const [bodyWeightData, setBodyWeightData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);
  const [sharedPlatforms, setSharedPlatforms] = useState([]);
  const [summaryStyle, setSummaryStyle] = useState('detailed');

  useEffect(() => {
    fetchWorkoutData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  useEffect(() => {
    if (workoutData.length >= 0) {
      generateSummary();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutData, bodyWeightData, selectedDate]);

  const fetchWorkoutData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch workout data
      const workoutResponse = await axios.get(`${process.env.REACT_APP_API_URL}/get-workouts`, {
        params: { userId: 'default-user' }
      });
      
      if (workoutResponse.data.success && (workoutResponse.data.workouts || workoutResponse.data.data)) {
        const workouts = workoutResponse.data.workouts || workoutResponse.data.data;
        
        // Filter workouts for selected date
        
        console.log('🔍 Filtering workouts for date:', format(selectedDate, 'yyyy-MM-dd'));
        console.log('📊 Total workouts available:', workouts.length);
        
        // Log first few workouts to see the data structure
        if (workouts.length > 0) {
          console.log('🔍 Sample workout data:', workouts.slice(0, 3));
          console.log('🔍 Available date fields:', Object.keys(workouts[0]));
        }
        
        const dayWorkouts = workouts.filter(workout => {
          // Try multiple date field variations
          const workoutDateRaw = workout.date || workout.Date || workout.created_time || workout.createdTime;
          
          if (!workoutDateRaw) {
            console.log('⚠️ No date field found in workout:', workout);
            return false;
          }
          
          try {
            const workoutDate = new Date(workoutDateRaw);
            if (isNaN(workoutDate.getTime())) {
              console.log('⚠️ Invalid date in workout:', workoutDateRaw, workout);
              return false;
            }
            
            // Compare date strings to avoid timezone issues
            const workoutDateStr = format(workoutDate, 'yyyy-MM-dd');
            const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
            
            const isMatch = workoutDateStr === selectedDateStr;
            
            console.log('🔍 Date comparison:', {
              workout: workout.exercise || workout.Exercise || 'Unknown',
              workoutDateRaw,
              workoutDateStr,
              selectedDateStr,
              isMatch
            });
            
            if (isMatch) {
              console.log('✅ Found matching workout:', workout);
            }
            
            return isMatch;
          } catch (error) {
            console.error('❌ Error processing workout date:', error, workout);
            return false;
          }
        });
        
        console.log('📊 Filtered workouts for selected date:', dayWorkouts.length);
        console.log('📊 Matching workouts:', dayWorkouts);
        setWorkoutData(dayWorkouts);
      } else {
        setWorkoutData([]);
      }

      // Fetch body weight data
      try {
        const weightResponse = await axios.get(`${process.env.REACT_APP_API_URL}/get-weights`, {
          params: { userId: 'default-user' }
        });
        
        if (weightResponse.data.success && weightResponse.data.data) {
          setBodyWeightData(weightResponse.data.data);
        }
      } catch (error) {
        console.log('Weight data not available');
      }

    } catch (error) {
      console.error('Failed to fetch workout data:', error);
      setWorkoutData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSummary = () => {
    if (workoutData.length === 0) {
      setSummaryData({
        hasWorkouts: false,
        date: selectedDate,
        message: format(selectedDate, 'EEEE, MMMM d, yyyy'),
        totalExercises: 0,
        totalSets: 0,
        totalReps: 0,
        totalWeight: 0,
        workoutDuration: 0,
        exercises: [],
        insights: ['No workouts logged for this day', 'Consider adding a workout to track your progress!']
      });
      return;
    }

    // Calculate summary metrics
    const totalWeight = workoutData.reduce((sum, workout) => {
      const weight = parseFloat(workout.weight || workout.Weight || 0);
      const sets = parseInt(workout.sets || workout.Sets || 1);
      const reps = parseInt(workout.reps || workout.Reps || 1);
      return sum + (weight * sets * reps);
    }, 0);

    const totalSets = workoutData.reduce((sum, workout) => {
      return sum + parseInt(workout.sets || workout.Sets || 1);
    }, 0);

    const totalReps = workoutData.reduce((sum, workout) => {
      const sets = parseInt(workout.sets || workout.Sets || 1);
      const reps = parseInt(workout.reps || workout.Reps || 1);
      return sum + (sets * reps);
    }, 0);

    // Group exercises
    const exerciseGroups = {};
    workoutData.forEach(workout => {
      const exerciseName = workout.exercise || workout.Exercise || 'Unknown';
      if (!exerciseGroups[exerciseName]) {
        exerciseGroups[exerciseName] = [];
      }
      exerciseGroups[exerciseName].push(workout);
    });

    // Calculate exercise summaries
    const exercises = Object.entries(exerciseGroups).map(([name, workouts]) => {
      const maxWeight = Math.max(...workouts.map(w => parseFloat(w.weight || w.Weight || 0)));
      const totalVolume = workouts.reduce((sum, w) => {
        const weight = parseFloat(w.weight || w.Weight || 0);
        const sets = parseInt(w.sets || w.Sets || 1);
        const reps = parseInt(w.reps || w.Reps || 1);
        return sum + (weight * sets * reps);
      }, 0);
      
      return {
        name,
        sets: workouts.length,
        maxWeight,
        totalVolume,
        workouts: workouts.length
      };
    });

    // Generate insights
    const insights = generateInsights(exercises, totalWeight, workoutData.length);

    // Get body weight for the day
    const dayWeight = getBodyWeightForDay(selectedDate);

    setSummaryData({
      hasWorkouts: true,
      date: selectedDate,
      totalExercises: Object.keys(exerciseGroups).length,
      totalSets: totalSets,
      totalReps: totalReps,
      totalWeight: totalWeight,
      workoutDuration: estimateWorkoutDuration(workoutData.length),
      exercises: exercises.sort((a, b) => b.totalVolume - a.totalVolume),
      insights: insights,
      bodyWeight: dayWeight,
      workoutCount: workoutData.length
    });
  };

  const generateInsights = (exercises, totalWeight, workoutCount) => {
    const insights = [];
    
    if (totalWeight > 10000) {
      insights.push(`💪 Impressive volume! You moved ${totalWeight.toLocaleString()} lbs total`);
    } else if (totalWeight > 5000) {
      insights.push(`🔥 Solid workout! ${totalWeight.toLocaleString()} lbs moved`);
    } else if (totalWeight > 0) {
      insights.push(`✅ Good effort! ${totalWeight.toLocaleString()} lbs moved`);
    }

    if (exercises.length >= 5) {
      insights.push(`🎯 Well-rounded session with ${exercises.length} different exercises`);
    } else if (exercises.length >= 3) {
      insights.push(`💯 Focused workout hitting ${exercises.length} key exercises`);
    }

    // Find heaviest lift
    const heaviestExercise = exercises.reduce((max, ex) => ex.maxWeight > max.maxWeight ? ex : max, exercises[0] || {maxWeight: 0});
    if (heaviestExercise.maxWeight > 0) {
      insights.push(`🏋️ Heaviest lift: ${heaviestExercise.name} at ${heaviestExercise.maxWeight} lbs`);
    }

    // Workout frequency insight
    if (workoutCount >= 2) {
      insights.push(`⚡ Multiple training sessions: ${workoutCount} workouts logged`);
    }

    return insights.length > 0 ? insights : ['Great job completing your workout!'];
  };

  const getBodyWeightForDay = (date) => {
    if (!bodyWeightData.length) return null;
    
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    const dayWeight = bodyWeightData.find(entry => {
      const entryDate = new Date(entry.date || entry.Date);
      return entryDate >= dayStart && entryDate <= dayEnd;
    });
    
    return dayWeight ? parseFloat(dayWeight.weight || dayWeight.Weight) : null;
  };

  const estimateWorkoutDuration = (exerciseCount) => {
    // Rough estimate: 3-5 minutes per exercise
    return exerciseCount * 4;
  };

  const generateShareText = (platform, style = 'detailed') => {
    if (!summaryData || !summaryData.hasWorkouts) {
      return "Took a well-deserved rest day today! 😴 #RestDay #Fitness #Recovery";
    }

    const date = format(summaryData.date, 'MMMM d, yyyy');
    const isToday = format(summaryData.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    const dayText = isToday ? "Today's" : `${format(summaryData.date, 'EEE')}'s`;
    
    if (style === 'simple') {
      const text = `💪 ${dayText} workout: ${summaryData.totalExercises} exercises, ${summaryData.totalWeight.toLocaleString()} lbs moved! #Fitness #Workout #Strength`;
      
      switch (platform) {
        case 'twitter':
          return text;
        case 'instagram':
          return `${text}\n.\n.\n.\n#Gym #Training #PersonalRecord #FitnessMotivation`;
        default:
          return text;
      }
    }

    // Detailed style
    let text = `🔥 ${dayText} Workout Summary (${date})\n\n`;
    text += `📊 Stats:\n`;
    text += `• ${summaryData.totalExercises} exercises\n`;
    text += `• ${summaryData.totalSets} total sets\n`;
    text += `• ${summaryData.totalWeight.toLocaleString()} lbs moved\n`;
    text += `• ~${summaryData.workoutDuration} minutes\n\n`;
    
    if (summaryData.exercises.length > 0) {
      text += `🏋️ Top Exercise: ${summaryData.exercises[0].name} (${summaryData.exercises[0].maxWeight} lbs)\n\n`;
    }
    
    if (summaryData.insights.length > 0) {
      text += `✨ ${summaryData.insights[0]}\n\n`;
    }

    const hashtags = platform === 'linkedin' 
      ? '#Fitness #Strength #Workout #Health #PersonalDevelopment'
      : '#Workout #Fitness #Gym #Strength #Training #PersonalRecord';

    switch (platform) {
      case 'twitter':
        // Twitter has character limits, so use shorter version
        return `💪 ${dayText} workout: ${summaryData.totalExercises} exercises, ${summaryData.totalWeight.toLocaleString()} lbs total!\n\n${summaryData.insights[0] || ''}\n\n${hashtags}`;
      
      case 'facebook':
        return `${text}${hashtags}`;
      
      case 'instagram':
        return `${text}${hashtags.replace(/#/g, '#')}`;
      
      case 'linkedin':
        return `Another successful training session in the books! 💪\n\n${text}Consistency and dedication are paying off. Every workout is a step closer to my fitness goals.\n\n${hashtags}`;
      
      default:
        return text + hashtags;
    }
  };

  const shareToSocialMedia = (platform) => {
    const text = generateShareText(platform, summaryStyle);
    const encodedText = encodeURIComponent(text);
    let shareUrl = '';
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodedText}`;
        break;
      case 'instagram':
        navigator.clipboard.writeText(text);
        alert('Workout summary copied to clipboard! Open Instagram to share your achievement.');
        setSharedPlatforms([...sharedPlatforms, platform]);
        return;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent('Workout Summary')}&summary=${encodedText}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(text);
        alert('Workout summary copied to clipboard!');
        setSharedPlatforms([...sharedPlatforms, platform]);
        return;
      default:
        console.log('Unknown platform:', platform);
        return;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes');
      setSharedPlatforms([...sharedPlatforms, platform]);
    }
  };

  const socialPlatforms = [
    { id: 'twitter', name: 'Twitter', icon: '🐦', color: 'bg-blue-400 hover:bg-blue-500' },
    { id: 'facebook', name: 'Facebook', icon: '📘', color: 'bg-blue-600 hover:bg-blue-700' },
    { id: 'instagram', name: 'Instagram', icon: '📸', color: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600' },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'bg-blue-700 hover:bg-blue-800' },
    { id: 'copy', name: 'Copy Text', icon: '📋', color: 'bg-gray-600 hover:bg-gray-700' }
  ];

  if (isLoading) {
    return (
      <div className="bg-blue-primary rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-primary rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl section-header">Workout Summaries</h2>
        
        <div className="flex items-center space-x-4">
          {/* Date Selector */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
              className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
            >
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            />
            
            <button
              onClick={() => setSelectedDate(new Date(Math.min(new Date(selectedDate).getTime() + 86400000, Date.now())))}
              disabled={format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')}
              className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Today Button */}
          <button
            onClick={() => setSelectedDate(new Date())}
            className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
          >
            Today
          </button>
          
          {/* Refresh Button */}
          <button
            onClick={fetchWorkoutData}
            className="px-3 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors text-sm flex items-center space-x-1"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
          
          {/* Debug Button */}
          <button
            onClick={() => {
              console.log('🔍 Debug Info:');
              console.log('Selected Date:', selectedDate);
              console.log('Formatted Date:', format(selectedDate, 'yyyy-MM-dd'));
              console.log('Workout Data Count:', workoutData.length);
              console.log('Workout Data:', workoutData);
              console.log('Summary Data:', summaryData);
              // Force a refresh to get latest data
              fetchWorkoutData();
            }}
            className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
          >
            🐛 Debug & Refresh
          </button>
        </div>
      </div>

      {summaryData && (
        <>
          {/* Date Header */}
          <div className="bg-white bg-opacity-10 rounded-lg p-4 mb-6">
            <h3 className="text-xl font-semibold text-white mb-2">
              {format(summaryData.date, 'EEEE, MMMM d, yyyy')}
            </h3>
            {format(summaryData.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && (
              <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">Today</span>
            )}
          </div>

          {summaryData.hasWorkouts ? (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{summaryData.totalExercises}</div>
                  <div className="text-sm text-gray-600">Exercises</div>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{summaryData.totalSets}</div>
                  <div className="text-sm text-gray-600">Total Sets</div>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{summaryData.totalWeight.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Pounds Moved</div>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">~{summaryData.workoutDuration}</div>
                  <div className="text-sm text-gray-600">Minutes</div>
                </div>
              </div>

              {/* Exercise Breakdown */}
              <div className="bg-white rounded-lg p-6 mb-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Exercise Breakdown</h4>
                <div className="space-y-3">
                  {summaryData.exercises.map((exercise, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-800">{exercise.name}</div>
                        <div className="text-sm text-gray-600">{exercise.sets} sets</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-800">{exercise.maxWeight} lbs</div>
                        <div className="text-sm text-gray-600">{exercise.totalVolume.toLocaleString()} lbs volume</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Insights */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">💡</span>
                  Workout Insights
                </h4>
                <div className="space-y-2">
                  {summaryData.insights.map((insight, index) => (
                    <div key={index} className="text-gray-700">• {insight}</div>
                  ))}
                </div>
              </div>

              {/* Share Options */}
              <div className="bg-white rounded-lg p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-800">Share Your Achievement</h4>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600">Style:</label>
                    <select
                      value={summaryStyle}
                      onChange={(e) => setSummaryStyle(e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-black text-sm"
                    >
                      <option value="detailed">Detailed</option>
                      <option value="simple">Simple</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {socialPlatforms.map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => shareToSocialMedia(platform.id)}
                      className={`${platform.color} text-white p-3 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                        sharedPlatforms.includes(platform.id) ? 'ring-4 ring-green-400' : ''
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-xl mb-1">{platform.icon}</div>
                        <div className="text-sm font-medium">{platform.name}</div>
                        {sharedPlatforms.includes(platform.id) && (
                          <div className="text-xs mt-1 bg-green-500 bg-opacity-20 rounded px-2 py-1">
                            ✅ Shared
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Share Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-800 mb-2">📝 Share Preview ({summaryStyle}):</h5>
                <div className="bg-white border rounded p-3 text-sm text-gray-700 whitespace-pre-line">
                  {generateShareText('default', summaryStyle)}
                </div>
              </div>
            </>
          ) : (
            /* No Workout State */
            <div className="text-center py-12">
              <div className="text-6xl mb-4">😴</div>
              <h3 className="text-xl font-semibold text-white mb-2">Rest Day</h3>
              <p className="text-gray-200 mb-6">
                No workouts logged for {format(summaryData.date, 'EEEE, MMMM d, yyyy')}
              </p>
              
              {/* Share Rest Day */}
              <div className="max-w-md mx-auto">
                <h4 className="text-white font-medium mb-3">Share Your Rest Day</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {socialPlatforms.slice(0, 3).map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => shareToSocialMedia(platform.id)}
                      className={`${platform.color} text-white p-2 rounded-lg transition-all text-sm`}
                    >
                      {platform.icon} {platform.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WorkoutSummaries;