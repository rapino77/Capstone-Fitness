import React, { useState, useEffect } from 'react';
import { format, startOfWeek } from 'date-fns';
import axios from 'axios';

const BadgeDisplay = () => {
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [workoutData, setWorkoutData] = useState([]);
  const [bodyWeightData, setBodyWeightData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showProgress, setShowProgress] = useState(false);

  // Comprehensive badge definitions with rarity levels
  const badgeDefinitions = {
    // Streak Badges (Common to Legendary)
    streak_7: {
      id: 'streak_7',
      name: 'Week Warrior',
      description: 'Work out 7 days in a row',
      icon: '🔥',
      rarity: 'common',
      category: 'consistency',
      requirement: { type: 'consecutive_days', value: 7 }
    },
    streak_14: {
      id: 'streak_14',
      name: 'Fortnight Fighter',
      description: 'Work out 14 days in a row',
      icon: '🔥🔥',
      rarity: 'uncommon',
      category: 'consistency',
      requirement: { type: 'consecutive_days', value: 14 }
    },
    streak_30: {
      id: 'streak_30',
      name: 'Monthly Master',
      description: 'Work out 30 days in a row',
      icon: '🔥🔥🔥',
      rarity: 'rare',
      category: 'consistency',
      requirement: { type: 'consecutive_days', value: 30 }
    },
    streak_60: {
      id: 'streak_60',
      name: 'Dedication Demon',
      description: 'Work out 60 days in a row',
      icon: '🔥👹',
      rarity: 'epic',
      category: 'consistency',
      requirement: { type: 'consecutive_days', value: 60 }
    },
    streak_100: {
      id: 'streak_100',
      name: 'Century Slayer',
      description: 'Work out 100 days in a row',
      icon: '🔥💯',
      rarity: 'legendary',
      category: 'consistency',
      requirement: { type: 'consecutive_days', value: 100 }
    },

    // Total Workout Badges
    workouts_10: {
      id: 'workouts_10',
      name: 'Getting Started',
      description: 'Complete 10 total workouts',
      icon: '💪',
      rarity: 'common',
      category: 'volume',
      requirement: { type: 'total_workouts', value: 10 }
    },
    workouts_50: {
      id: 'workouts_50',
      name: 'Fitness Enthusiast',
      description: 'Complete 50 total workouts',
      icon: '💪💪',
      rarity: 'uncommon',
      category: 'volume',
      requirement: { type: 'total_workouts', value: 50 }
    },
    workouts_100: {
      id: 'workouts_100',
      name: 'Gym Regular',
      description: 'Complete 100 total workouts',
      icon: '💪💪💪',
      rarity: 'rare',
      category: 'volume',
      requirement: { type: 'total_workouts', value: 100 }
    },
    workouts_250: {
      id: 'workouts_250',
      name: 'Fitness Fanatic',
      description: 'Complete 250 total workouts',
      icon: '🏋️‍♂️',
      rarity: 'epic',
      category: 'volume',
      requirement: { type: 'total_workouts', value: 250 }
    },
    workouts_500: {
      id: 'workouts_500',
      name: 'Iron Warrior',
      description: 'Complete 500 total workouts',
      icon: '⚔️💪',
      rarity: 'legendary',
      category: 'volume',
      requirement: { type: 'total_workouts', value: 500 }
    },

    // Strength Badges
    weight_10k: {
      id: 'weight_10k',
      name: 'Weight Mover',
      description: 'Move 10,000 lbs total',
      icon: '🏋️',
      rarity: 'common',
      category: 'strength',
      requirement: { type: 'total_weight', value: 10000 }
    },
    weight_50k: {
      id: 'weight_50k',
      name: 'Iron Pusher',
      description: 'Move 50,000 lbs total',
      icon: '🏋️‍♂️',
      rarity: 'uncommon',
      category: 'strength',
      requirement: { type: 'total_weight', value: 50000 }
    },
    weight_100k: {
      id: 'weight_100k',
      name: 'Steel Mover',
      description: 'Move 100,000 lbs total',
      icon: '⚡🏋️',
      rarity: 'rare',
      category: 'strength',
      requirement: { type: 'total_weight', value: 100000 }
    },
    weight_250k: {
      id: 'weight_250k',
      name: 'Titan Lifter',
      description: 'Move 250,000 lbs total',
      icon: '🌟🏋️',
      rarity: 'epic',
      category: 'strength',
      requirement: { type: 'total_weight', value: 250000 }
    },
    weight_500k: {
      id: 'weight_500k',
      name: 'Olympian Force',
      description: 'Move 500,000 lbs total',
      icon: '👑🏋️',
      rarity: 'legendary',
      category: 'strength',
      requirement: { type: 'total_weight', value: 500000 }
    },

    // Milestone Badges
    bench_135: {
      id: 'bench_135',
      name: 'Plate Pusher',
      description: 'Bench press 135 lbs',
      icon: '🏋️‍♂️',
      rarity: 'uncommon',
      category: 'milestones',
      requirement: { type: 'exercise_max', exercise: 'Bench Press', value: 135 }
    },
    bench_225: {
      id: 'bench_225',
      name: 'Two Plate Beast',
      description: 'Bench press 225 lbs',
      icon: '🦁🏋️',
      rarity: 'epic',
      category: 'milestones',
      requirement: { type: 'exercise_max', exercise: 'Bench Press', value: 225 }
    },
    deadlift_225: {
      id: 'deadlift_225',
      name: 'Deadlift Destroyer',
      description: 'Deadlift 225 lbs',
      icon: '💀🏋️',
      rarity: 'rare',
      category: 'milestones',
      requirement: { type: 'exercise_max', exercise: 'Deadlift', value: 225 }
    },
    deadlift_405: {
      id: 'deadlift_405',
      name: 'Four Plate Fury',
      description: 'Deadlift 405 lbs',
      icon: '🔥💀',
      rarity: 'legendary',
      category: 'milestones',
      requirement: { type: 'exercise_max', exercise: 'Deadlift', value: 405 }
    },
    squat_225: {
      id: 'squat_225',
      name: 'Squat Squad',
      description: 'Squat 225 lbs',
      icon: '🍑💪',
      rarity: 'rare',
      category: 'milestones',
      requirement: { type: 'exercise_max', exercise: 'Squat', value: 225 }
    },

    // Frequency Badges
    weekly_5: {
      id: 'weekly_5',
      name: 'Workout Maniac',
      description: 'Work out 5+ times in a week',
      icon: '🤯',
      rarity: 'uncommon',
      category: 'frequency',
      requirement: { type: 'weekly_frequency', value: 5 }
    },
    weekly_7: {
      id: 'weekly_7',
      name: 'Every Day Hero',
      description: 'Work out 7 days in one week',
      icon: '🦸‍♂️',
      rarity: 'rare',
      category: 'frequency',
      requirement: { type: 'weekly_frequency', value: 7 }
    },

    // Special Achievement Badges
    early_bird: {
      id: 'early_bird',
      name: 'Early Bird',
      description: 'Work out before 6 AM (10 times)',
      icon: '🌅',
      rarity: 'rare',
      category: 'special',
      requirement: { type: 'early_workouts', value: 10 }
    },
    night_owl: {
      id: 'night_owl',
      name: 'Night Owl',
      description: 'Work out after 10 PM (10 times)',
      icon: '🦉',
      rarity: 'rare',
      category: 'special',
      requirement: { type: 'late_workouts', value: 10 }
    },
    weekend_warrior: {
      id: 'weekend_warrior',
      name: 'Weekend Warrior',
      description: 'Work out 20 weekends in a row',
      icon: '⚔️📅',
      rarity: 'epic',
      category: 'special',
      requirement: { type: 'weekend_consistency', value: 20 }
    },

    // Body Transformation Badges
    weight_loss_5: {
      id: 'weight_loss_5',
      name: 'Scale Shifter',
      description: 'Lose 5 pounds',
      icon: '📉⚖️',
      rarity: 'uncommon',
      category: 'transformation',
      requirement: { type: 'weight_loss', value: 5 }
    },
    weight_loss_15: {
      id: 'weight_loss_15',
      name: 'Transformation Titan',
      description: 'Lose 15 pounds',
      icon: '🔥⚖️',
      rarity: 'epic',
      category: 'transformation',
      requirement: { type: 'weight_loss', value: 15 }
    },
    weight_gain_10: {
      id: 'weight_gain_10',
      name: 'Bulk Builder',
      description: 'Gain 10 pounds (muscle building)',
      icon: '💪⚖️',
      rarity: 'rare',
      category: 'transformation',
      requirement: { type: 'weight_gain', value: 10 }
    }
  };

  const rarityColors = {
    common: {
      bg: 'from-gray-400 to-gray-500',
      border: 'border-gray-400',
      text: 'text-gray-700',
      glow: 'shadow-gray-400/50'
    },
    uncommon: {
      bg: 'from-green-400 to-green-500',
      border: 'border-green-400',
      text: 'text-green-700',
      glow: 'shadow-green-400/50'
    },
    rare: {
      bg: 'from-blue-400 to-blue-600',
      border: 'border-blue-400',
      text: 'text-blue-700',
      glow: 'shadow-blue-400/50'
    },
    epic: {
      bg: 'from-purple-400 to-purple-600',
      border: 'border-purple-400',
      text: 'text-purple-700',
      glow: 'shadow-purple-400/50'
    },
    legendary: {
      bg: 'from-yellow-400 via-orange-500 to-red-500',
      border: 'border-yellow-400',
      text: 'text-yellow-700',
      glow: 'shadow-yellow-400/50'
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (workoutData.length > 0) {
      calculateEarnedBadges();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutData, bodyWeightData]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch workout data
      const workoutResponse = await axios.get(`${process.env.REACT_APP_API_URL}/get-workouts`, {
        params: { userId: 'default-user' }
      });
      
      if (workoutResponse.data.success && (workoutResponse.data.workouts || workoutResponse.data.data)) {
        const workouts = workoutResponse.data.workouts || workoutResponse.data.data;
        setWorkoutData(workouts);
      }

      // Fetch body weight data
      try {
        const weightResponse = await axios.get(`${process.env.REACT_APP_API_URL}/get-weight-data`, {
          params: { userId: 'default-user' }
        });
        
        if (weightResponse.data.success && weightResponse.data.data) {
          setBodyWeightData(weightResponse.data.data);
        }
      } catch (error) {
        console.log('Weight data not available');
      }

    } catch (error) {
      console.error('Failed to fetch data:', error);
      setWorkoutData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateEarnedBadges = () => {
    const earned = [];
    
    Object.values(badgeDefinitions).forEach(badge => {
      const progress = calculateBadgeProgress(badge);
      if (progress.earned) {
        earned.push({
          ...badge,
          earnedDate: progress.earnedDate || new Date().toISOString(),
          progress: progress.value
        });
      }
    });
    
    // Sort by rarity and earned date
    const rarityOrder = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
    earned.sort((a, b) => {
      const rarityDiff = rarityOrder[b.rarity] - rarityOrder[a.rarity];
      if (rarityDiff !== 0) return rarityDiff;
      return new Date(b.earnedDate) - new Date(a.earnedDate);
    });
    
    setEarnedBadges(earned);
  };

  const calculateBadgeProgress = (badge) => {
    const req = badge.requirement;
    
    switch (req.type) {
      case 'consecutive_days':
        return calculateConsecutiveDays(req.value);
      
      case 'total_workouts':
        return { earned: workoutData.length >= req.value, value: workoutData.length };
      
      case 'total_weight':
        const totalWeight = workoutData.reduce((sum, workout) => {
          const weight = parseFloat(workout.weight || workout.Weight || 0);
          const sets = parseInt(workout.sets || workout.Sets || 1);
          const reps = parseInt(workout.reps || workout.Reps || 1);
          return sum + (weight * sets * reps);
        }, 0);
        return { earned: totalWeight >= req.value, value: totalWeight };
      
      case 'exercise_max':
        const exerciseWorkouts = workoutData.filter(w => 
          (w.exercise || w.Exercise || '').toLowerCase().includes(req.exercise.toLowerCase())
        );
        const maxWeight = exerciseWorkouts.reduce((max, w) => 
          Math.max(max, parseFloat(w.weight || w.Weight || 0)), 0
        );
        return { earned: maxWeight >= req.value, value: maxWeight };
      
      case 'weekly_frequency':
        return calculateMaxWeeklyFrequency(req.value);
      
      case 'early_workouts':
      case 'late_workouts':
      case 'weekend_consistency':
      case 'weight_loss':
      case 'weight_gain':
        // Simplified for now - would need more complex logic
        return { earned: false, value: 0 };
      
      default:
        return { earned: false, value: 0 };
    }
  };

  const calculateConsecutiveDays = (target) => {
    if (workoutData.length === 0) return { earned: false, value: 0 };
    
    const sortedWorkouts = workoutData
      .map(w => ({
        ...w,
        date: new Date(w.date || w.Date)
      }))
      .sort((a, b) => b.date - a.date);
    
    let maxStreak = 0;
    let currentStreak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    // Check consecutive days backwards from today
    for (let i = 0; i < 365; i++) { // Check up to a year back
      const dayWorkouts = sortedWorkouts.filter(workout => {
        const workoutDate = new Date(workout.date);
        workoutDate.setHours(0, 0, 0, 0);
        return workoutDate.getTime() === currentDate.getTime();
      });
      
      if (dayWorkouts.length > 0) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        if (currentStreak > 0) {
          // Only break if we've started counting and hit a gap
          break;
        }
      }
      
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return { earned: maxStreak >= target, value: maxStreak };
  };

  const calculateMaxWeeklyFrequency = (target) => {
    if (workoutData.length === 0) return { earned: false, value: 0 };
    
    const weeklyWorkouts = {};
    
    workoutData.forEach(workout => {
      const date = new Date(workout.date || workout.Date);
      const weekStart = startOfWeek(date);
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      
      if (!weeklyWorkouts[weekKey]) {
        weeklyWorkouts[weekKey] = new Set();
      }
      
      weeklyWorkouts[weekKey].add(format(date, 'yyyy-MM-dd'));
    });
    
    const maxWeeklyDays = Math.max(...Object.values(weeklyWorkouts).map(days => days.size), 0);
    
    return { earned: maxWeeklyDays >= target, value: maxWeeklyDays };
  };

  const getProgressForBadge = (badge) => {
    return calculateBadgeProgress(badge);
  };

  const filterBadges = (badges) => {
    if (selectedCategory === 'all') return badges;
    return badges.filter(badge => badge.category === selectedCategory);
  };

  const getUnearnedBadges = () => {
    return Object.values(badgeDefinitions).filter(badge => {
      return !earnedBadges.some(earned => earned.id === badge.id);
    });
  };

  const getRarityCount = (rarity) => {
    return earnedBadges.filter(badge => badge.rarity === rarity).length;
  };

  const categories = [
    { id: 'all', name: 'All', icon: '🏆' },
    { id: 'consistency', name: 'Consistency', icon: '🔥' },
    { id: 'volume', name: 'Volume', icon: '💪' },
    { id: 'strength', name: 'Strength', icon: '🏋️' },
    { id: 'milestones', name: 'Milestones', icon: '🎯' },
    { id: 'frequency', name: 'Frequency', icon: '📅' },
    { id: 'special', name: 'Special', icon: '⭐' },
    { id: 'transformation', name: 'Transform', icon: '⚖️' }
  ];

  if (isLoading) {
    return (
      <div className="bg-blue-primary rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-primary rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl section-header mb-2">Badge Collection</h2>
          <div className="flex items-center space-x-4 text-sm text-gray-200">
            <span>🏆 {earnedBadges.length} Earned</span>
            <span>📊 {Object.keys(badgeDefinitions).length} Total</span>
            <span>⭐ {getRarityCount('legendary')} Legendary</span>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setShowProgress(!showProgress)}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors text-sm"
          >
            {showProgress ? 'Hide Progress' : 'Show Progress'}
          </button>
        </div>
      </div>

      {/* Rarity Summary */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {Object.entries(rarityColors).map(([rarity, colors]) => (
          <div key={rarity} className={`bg-gradient-to-r ${colors.bg} rounded-lg p-3 text-center`}>
            <div className="text-white font-bold text-lg">{getRarityCount(rarity)}</div>
            <div className="text-white text-xs capitalize">{rarity}</div>
          </div>
        ))}
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedCategory === category.id
                ? 'bg-blue-600 text-white'
                : 'bg-white bg-opacity-20 text-gray-200 hover:bg-opacity-30'
            }`}
          >
            {category.icon} {category.name}
          </button>
        ))}
      </div>

      {/* Earned Badges */}
      {filterBadges(earnedBadges).length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <span className="mr-2">🏅</span>
            Earned Badges ({filterBadges(earnedBadges).length})
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filterBadges(earnedBadges).map((badge) => (
              <div key={badge.id} className="group relative">
                <div className={`bg-gradient-to-br ${rarityColors[badge.rarity].bg} rounded-xl p-4 text-center border-2 ${rarityColors[badge.rarity].border} shadow-lg ${rarityColors[badge.rarity].glow} transform hover:scale-105 transition-all duration-200`}>
                  <div className="text-3xl mb-2">{badge.icon}</div>
                  <div className="text-white font-semibold text-sm">{badge.name}</div>
                  <div className="text-white text-xs opacity-90 capitalize mt-1">{badge.rarity}</div>
                </div>
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                  <div className="bg-black text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap">
                    <div className="font-semibold">{badge.name}</div>
                    <div className="opacity-75">{badge.description}</div>
                    <div className="text-xs opacity-60 mt-1">
                      Earned: {format(new Date(badge.earnedDate), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Section */}
      {showProgress && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <span className="mr-2">📊</span>
            Badge Progress ({filterBadges(getUnearnedBadges()).length} remaining)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filterBadges(getUnearnedBadges()).slice(0, 8).map((badge) => {
              const progress = getProgressForBadge(badge);
              const percentage = Math.min(100, (progress.value / badge.requirement.value) * 100);
              
              return (
                <div key={badge.id} className="bg-white bg-opacity-10 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-2xl opacity-50">{badge.icon}</span>
                    <div>
                      <h4 className="text-white font-medium">{badge.name}</h4>
                      <p className="text-gray-300 text-xs">{badge.description}</p>
                      <span className={`text-xs px-2 py-1 rounded-full capitalize ${rarityColors[badge.rarity].text} bg-white bg-opacity-20 mt-1 inline-block`}>
                        {badge.rarity}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <div className="flex justify-between text-sm text-gray-300 mb-1">
                      <span>Progress</span>
                      <span>{Math.floor(progress.value)} / {badge.requirement.value}</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          percentage >= 75 ? 'bg-green-500' :
                          percentage >= 50 ? 'bg-yellow-500' :
                          percentage >= 25 ? 'bg-blue-500' : 'bg-gray-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {percentage.toFixed(0)}% complete
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {earnedBadges.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4 opacity-50">🏆</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Badges Yet</h3>
          <p className="text-gray-200 mb-6">Start working out to earn your first badge!</p>
          <div className="text-sm text-gray-300">
            <p>💡 Tip: Work out 7 days in a row to earn your first "Week Warrior" badge!</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BadgeDisplay;