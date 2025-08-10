import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const WorkoutStreak = ({ userId = 'default-user', refreshTrigger = 0 }) => {
  const [streakData, setStreakData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Calculate workout streaks from workout data
  const calculateStreaks = (workouts) => {
    if (!workouts || workouts.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastWorkoutDate: null,
        streakDetails: [],
        isActiveToday: false
      };
    }

    // Sort workouts by date (most recent first)
    const sortedWorkouts = workouts
      .filter(w => w.date) // Only include workouts with valid dates
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortedWorkouts.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastWorkoutDate: null,
        streakDetails: [],
        isActiveToday: false
      };
    }

    // Get unique workout dates (in case of multiple workouts per day)
    const uniqueDates = [...new Set(sortedWorkouts.map(w => w.date))].sort((a, b) => new Date(b) - new Date(a));
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Check if user worked out today
    const isActiveToday = uniqueDates.includes(todayStr);
    
    // Calculate current streak
    let currentStreak = 0;
    let currentDate = new Date(isActiveToday ? todayStr : yesterdayStr);
    
    for (const dateStr of uniqueDates) {
      const expectedDateStr = currentDate.toISOString().split('T')[0];
      
      if (dateStr === expectedDateStr) {
        currentStreak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    // If user hasn't worked out today but did yesterday, don't break the streak yet
    // (give them until end of day)
    if (!isActiveToday && uniqueDates.includes(yesterdayStr)) {
      // Streak is still active but at risk
    } else if (!isActiveToday && currentStreak === 0) {
      // No recent workouts
      currentStreak = 0;
    }

    // Calculate longest streak ever
    let longestStreak = 0;
    let tempStreak = 0;
    let previousDate = null;

    for (let i = uniqueDates.length - 1; i >= 0; i--) {
      const currentWorkoutDate = new Date(uniqueDates[i]);
      
      if (previousDate === null) {
        tempStreak = 1;
      } else {
        const daysDiff = Math.floor((currentWorkoutDate - previousDate) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      
      previousDate = new Date(currentWorkoutDate);
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Generate streak details for the last 7 days
    const streakDetails = [];
    const checkDate = new Date();
    
    for (let i = 0; i < 7; i++) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const hasWorkout = uniqueDates.includes(dateStr);
      const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'short' });
      
      streakDetails.unshift({
        date: dateStr,
        dayName,
        hasWorkout,
        isToday: dateStr === todayStr,
        workoutCount: hasWorkout ? sortedWorkouts.filter(w => w.date === dateStr).length : 0
      });
      
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return {
      currentStreak,
      longestStreak,
      lastWorkoutDate: uniqueDates[0],
      streakDetails,
      isActiveToday,
      totalWorkoutDays: uniqueDates.length,
      averagePerWeek: (uniqueDates.length / Math.max(1, Math.floor((new Date() - new Date(uniqueDates[uniqueDates.length - 1])) / (1000 * 60 * 60 * 24 * 7)))).toFixed(1)
    };
  };

  const fetchStreakData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch recent workouts (last 90 days for streak calculation)
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/get-workouts`, {
        params: {
          userId,
          limit: 200, // Get more workouts to calculate accurate streaks
          _t: Date.now()
        }
      });

      if (response.data.success && response.data.data) {
        const workouts = response.data.data;
        const calculatedStreaks = calculateStreaks(workouts);
        setStreakData(calculatedStreaks);
      } else {
        setError('Failed to fetch workout data');
      }
    } catch (err) {
      console.error('Error fetching streak data:', err);
      setError('Error loading workout streaks');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStreakData();
  }, [fetchStreakData, refreshTrigger]);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
        <div className="animate-pulse">
          <div className="h-6 bg-white bg-opacity-30 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-white bg-opacity-30 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-white bg-opacity-30 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-100 rounded-lg shadow-md p-6">
        <div className="text-center text-red-500">
          <div className="mb-2">⚠️ {error}</div>
          <button
            onClick={fetchStreakData}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!streakData) {
    return null;
  }

  const getStreakEmoji = (streak) => {
    if (streak === 0) return '💤';
    if (streak < 3) return '🔥';
    if (streak < 7) return '💪';
    if (streak < 14) return '⚡';
    if (streak < 30) return '🏆';
    return '👑';
  };

  const getMotivationalMessage = (streak, isActiveToday) => {
    if (streak === 0) {
      return "Start your streak today! Every expert was once a beginner.";
    }
    if (streak === 1) {
      return isActiveToday ? "Great start! Keep the momentum going tomorrow." : "One day down! Don't break the chain.";
    }
    if (streak < 7) {
      return `${streak} days strong! You're building a healthy habit.`;
    }
    if (streak < 14) {
      return `${streak} days in a row! You're on fire! 🔥`;
    }
    if (streak < 30) {
      return `${streak} day streak! You're a fitness machine! ⚡`;
    }
    return `${streak} days! You're absolutely crushing it! 👑`;
  };

  return (
    <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <span className="mr-2">🔥</span>
          Workout Streak
        </h3>
        <button
          onClick={fetchStreakData}
          className="text-white hover:text-green-200 transition-colors opacity-75 hover:opacity-100"
          title="Refresh streak data"
        >
          🔄
        </button>
      </div>

      {/* Main Streak Display */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center mb-2">
          <span className="text-4xl mr-3">{getStreakEmoji(streakData.currentStreak)}</span>
          <div>
            <div className="text-3xl font-bold">{streakData.currentStreak}</div>
            <div className="text-sm opacity-90">
              {streakData.currentStreak === 1 ? 'day' : 'days'}
            </div>
          </div>
        </div>
        <div className="text-sm opacity-90 max-w-xs mx-auto">
          {getMotivationalMessage(streakData.currentStreak, streakData.isActiveToday)}
        </div>
      </div>

      {/* 7-Day Visual */}
      <div className="mb-4">
        <div className="text-sm opacity-90 mb-2 text-center">Last 7 Days</div>
        <div className="flex justify-between">
          {streakData.streakDetails.map((day, index) => (
            <div key={day.date} className="text-center">
              <div className="text-xs opacity-75 mb-1">{day.dayName}</div>
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  day.hasWorkout 
                    ? 'bg-white text-green-600 shadow-lg' 
                    : day.isToday 
                      ? 'bg-white bg-opacity-30 border-2 border-white text-white'
                      : 'bg-white bg-opacity-20 text-white'
                }`}
                title={day.hasWorkout ? `${day.workoutCount} workout${day.workoutCount !== 1 ? 's' : ''}` : 'No workout'}
              >
                {day.hasWorkout ? '✓' : day.isToday ? '?' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-lg font-semibold">{streakData.longestStreak}</div>
          <div className="text-xs opacity-90">Longest</div>
        </div>
        <div>
          <div className="text-lg font-semibold">{streakData.totalWorkoutDays}</div>
          <div className="text-xs opacity-90">Total Days</div>
        </div>
        <div>
          <div className="text-lg font-semibold">{streakData.averagePerWeek}</div>
          <div className="text-xs opacity-90">Per Week</div>
        </div>
      </div>

      {/* Status Message */}
      {streakData.currentStreak > 0 && !streakData.isActiveToday && (
        <div className="mt-4 bg-white bg-opacity-20 rounded-lg p-3 text-center">
          <div className="text-sm">
            ⏰ Your {streakData.currentStreak}-day streak is at risk!
          </div>
          <div className="text-xs opacity-90 mt-1">
            Work out today to keep it going
          </div>
        </div>
      )}

      {streakData.isActiveToday && (
        <div className="mt-4 bg-white bg-opacity-20 rounded-lg p-3 text-center">
          <div className="text-sm">
            ✅ Great job working out today!
          </div>
          <div className="text-xs opacity-90 mt-1">
            Keep the momentum going tomorrow
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutStreak;