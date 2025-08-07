import React, { useState, useEffect } from 'react';
import { format, differenceInDays, isWithinInterval } from 'date-fns';
import axios from 'axios';

const ChallengeSystem = ({ onSuccess }) => {
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [workoutData, setWorkoutData] = useState([]);
  const [bodyWeightData, setBodyWeightData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedChallengeType, setSelectedChallengeType] = useState('');

  // Predefined challenge templates
  const challengeTemplates = {
    consecutive_workouts: {
      name: 'Workout Streak',
      description: 'Work out for consecutive days',
      icon: '🔥',
      category: 'Consistency',
      variants: [
        { duration: 7, reward: 'Weekly Warrior', points: 100 },
        { duration: 14, reward: 'Two Week Champion', points: 250 },
        { duration: 30, reward: 'Monthly Master', points: 500 },
        { duration: 60, reward: 'Consistency King', points: 1000 },
        { duration: 100, reward: 'Century Slayer', points: 2000 }
      ]
    },
    weight_moved: {
      name: 'Total Weight Moved',
      description: 'Move a target amount of total weight',
      icon: '🏋️',
      category: 'Strength',
      variants: [
        { target: 10000, reward: 'Weight Warrior', points: 200 },
        { target: 25000, reward: 'Iron Pusher', points: 400 },
        { target: 50000, reward: 'Steel Mover', points: 750 },
        { target: 100000, reward: 'Titanium Lifter', points: 1500 },
        { target: 250000, reward: 'Diamond Crusher', points: 3000 }
      ]
    },
    exercise_milestone: {
      name: 'Exercise Milestone',
      description: 'Reach a specific weight for an exercise',
      icon: '💪',
      category: 'Personal Record',
      variants: [
        { exercise: 'Bench Press', weight: 135, reward: 'Plate Pusher', points: 300 },
        { exercise: 'Bench Press', weight: 225, reward: 'Two Plate Beast', points: 600 },
        { exercise: 'Deadlift', weight: 225, reward: 'Deadlift Destroyer', points: 400 },
        { exercise: 'Deadlift', weight: 405, reward: 'Four Plate Fury', points: 800 },
        { exercise: 'Squat', weight: 185, reward: 'Squat Squad', points: 350 },
        { exercise: 'Squat', weight: 315, reward: 'Triple Threat', points: 700 }
      ]
    },
    workout_frequency: {
      name: 'Workout Frequency',
      description: 'Complete a certain number of workouts in a time period',
      icon: '📅',
      category: 'Volume',
      variants: [
        { workouts: 12, period: 30, reward: 'Monthly Mover', points: 200 },
        { workouts: 20, period: 30, reward: 'High Frequency Hero', points: 350 },
        { workouts: 25, period: 60, reward: 'Bi-Monthly Beast', points: 400 },
        { workouts: 50, period: 90, reward: 'Quarterly Champion', points: 750 }
      ]
    },
    body_transformation: {
      name: 'Body Transformation',
      description: 'Reach body weight goals',
      icon: '⚖️',
      category: 'Health',
      variants: [
        { type: 'lose', amount: 5, reward: 'Scale Shifter', points: 250 },
        { type: 'lose', amount: 10, reward: 'Weight Warrior', points: 500 },
        { type: 'lose', amount: 20, reward: 'Transformation Titan', points: 1000 },
        { type: 'gain', amount: 5, reward: 'Bulk Builder', points: 250 },
        { type: 'gain', amount: 10, reward: 'Mass Master', points: 500 }
      ]
    },
    perfect_week: {
      name: 'Perfect Week',
      description: 'Complete all planned workouts in a week',
      icon: '🎯',
      category: 'Achievement',
      variants: [
        { weeks: 1, workouts: 3, reward: 'Perfect Week', points: 150 },
        { weeks: 2, workouts: 3, reward: 'Two Week Wonder', points: 350 },
        { weeks: 4, workouts: 3, reward: 'Monthly Perfectionist', points: 750 }
      ]
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (workoutData.length > 0 || bodyWeightData.length > 0) {
      updateChallengeProgress();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutData, bodyWeightData, activeChallenges]);

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
        console.log('Weight data not available:', error.message);
      }

      // Load challenges from localStorage for now
      const savedChallenges = JSON.parse(localStorage.getItem('activeChallenges') || '[]');
      const savedCompleted = JSON.parse(localStorage.getItem('completedChallenges') || '[]');
      setActiveChallenges(savedChallenges);
      setCompletedChallenges(savedCompleted);

    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateChallengeProgress = (challenge) => {
    const today = new Date();
    const startDate = new Date(challenge.startDate);
    
    switch (challenge.type) {
      case 'consecutive_workouts':
        return calculateConsecutiveWorkouts(challenge, today);
      
      case 'weight_moved':
        return calculateTotalWeightMoved(challenge, startDate, today);
      
      case 'exercise_milestone':
        return calculateExerciseMilestone(challenge);
      
      case 'workout_frequency':
        return calculateWorkoutFrequency(challenge, startDate, today);
      
      case 'body_transformation':
        return calculateBodyTransformation(challenge, startDate);
      
      case 'perfect_week':
        return calculatePerfectWeek(challenge, startDate, today);
      
      default:
        return { progress: 0, isComplete: false };
    }
  };

  const calculateConsecutiveWorkouts = (challenge, today) => {
    if (workoutData.length === 0) return { progress: 0, isComplete: false };
    
    // Sort workouts by date
    const sortedWorkouts = workoutData
      .map(w => ({
        ...w,
        date: new Date(w.date || w.Date)
      }))
      .sort((a, b) => b.date - a.date);
    
    let streak = 0;
    let currentDate = new Date(today);
    currentDate.setHours(0, 0, 0, 0);
    
    // Check consecutive days backwards from today
    for (let i = 0; i < challenge.target; i++) {
      const dayWorkouts = sortedWorkouts.filter(workout => {
        const workoutDate = new Date(workout.date);
        workoutDate.setHours(0, 0, 0, 0);
        return workoutDate.getTime() === currentDate.getTime();
      });
      
      if (dayWorkouts.length > 0) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return {
      progress: streak,
      isComplete: streak >= challenge.target,
      currentStreak: streak
    };
  };

  const calculateTotalWeightMoved = (challenge, startDate, today) => {
    const relevantWorkouts = workoutData.filter(workout => {
      const workoutDate = new Date(workout.date || workout.Date);
      return workoutDate >= startDate && workoutDate <= today;
    });
    
    const totalWeight = relevantWorkouts.reduce((sum, workout) => {
      const weight = parseFloat(workout.weight || workout.Weight || 0);
      const sets = parseInt(workout.sets || workout.Sets || 1);
      const reps = parseInt(workout.reps || workout.Reps || 1);
      return sum + (weight * sets * reps);
    }, 0);
    
    return {
      progress: totalWeight,
      isComplete: totalWeight >= challenge.target,
      totalMoved: totalWeight
    };
  };

  const calculateExerciseMilestone = (challenge) => {
    const exerciseWorkouts = workoutData.filter(workout => {
      const exerciseName = workout.exercise || workout.Exercise || '';
      return exerciseName.toLowerCase().includes(challenge.exercise.toLowerCase());
    });
    
    const maxWeight = exerciseWorkouts.reduce((max, workout) => {
      const weight = parseFloat(workout.weight || workout.Weight || 0);
      return Math.max(max, weight);
    }, 0);
    
    return {
      progress: maxWeight,
      isComplete: maxWeight >= challenge.target,
      currentMax: maxWeight
    };
  };

  const calculateWorkoutFrequency = (challenge, startDate, today) => {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + challenge.period);
    
    const relevantWorkouts = workoutData.filter(workout => {
      const workoutDate = new Date(workout.date || workout.Date);
      return isWithinInterval(workoutDate, { start: startDate, end: Math.min(endDate, today) });
    });
    
    // Group by date to count unique workout days
    const uniqueDays = new Set(
      relevantWorkouts.map(workout => format(new Date(workout.date || workout.Date), 'yyyy-MM-dd'))
    );
    
    return {
      progress: uniqueDays.size,
      isComplete: uniqueDays.size >= challenge.target,
      daysRemaining: Math.max(0, differenceInDays(endDate, today))
    };
  };

  const calculateBodyTransformation = (challenge, startDate) => {
    if (bodyWeightData.length === 0) return { progress: 0, isComplete: false };
    
    // Find starting weight (closest to start date)
    const startWeight = bodyWeightData
      .filter(entry => new Date(entry.date || entry.Date) <= startDate)
      .sort((a, b) => new Date(b.date || b.Date) - new Date(a.date || a.Date))[0];
    
    // Get current weight (most recent)
    const currentWeight = bodyWeightData
      .sort((a, b) => new Date(b.date || b.Date) - new Date(a.date || a.Date))[0];
    
    if (!startWeight || !currentWeight) return { progress: 0, isComplete: false };
    
    const startValue = parseFloat(startWeight.weight || startWeight.Weight);
    const currentValue = parseFloat(currentWeight.weight || currentWeight.Weight);
    const change = challenge.type === 'lose' ? startValue - currentValue : currentValue - startValue;
    
    return {
      progress: Math.max(0, change),
      isComplete: change >= challenge.target,
      weightChange: change,
      startWeight: startValue,
      currentWeight: currentValue
    };
  };

  const calculatePerfectWeek = (challenge, startDate, today) => {
    const weeksCompleted = Math.floor(differenceInDays(today, startDate) / 7);
    let perfectWeeks = 0;
    
    for (let week = 0; week < Math.min(weeksCompleted, challenge.target); week++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + (week * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const weekWorkouts = workoutData.filter(workout => {
        const workoutDate = new Date(workout.date || workout.Date);
        return isWithinInterval(workoutDate, { start: weekStart, end: weekEnd });
      });
      
      const uniqueDays = new Set(
        weekWorkouts.map(workout => format(new Date(workout.date || workout.Date), 'yyyy-MM-dd'))
      );
      
      if (uniqueDays.size >= challenge.expectedWorkouts) {
        perfectWeeks++;
      }
    }
    
    return {
      progress: perfectWeeks,
      isComplete: perfectWeeks >= challenge.target,
      weeksCompleted: perfectWeeks
    };
  };

  const updateChallengeProgress = () => {
    const updatedChallenges = activeChallenges.map(challenge => {
      const progress = calculateChallengeProgress(challenge);
      return { ...challenge, ...progress };
    });
    
    // Move completed challenges
    const stillActive = updatedChallenges.filter(challenge => !challenge.isComplete);
    const newlyCompleted = updatedChallenges.filter(challenge => challenge.isComplete);
    
    if (newlyCompleted.length > 0) {
      const updatedCompleted = [...completedChallenges, ...newlyCompleted];
      setCompletedChallenges(updatedCompleted);
      localStorage.setItem('completedChallenges', JSON.stringify(updatedCompleted));
      
      // Show completion notification
      newlyCompleted.forEach(challenge => {
        showCompletionNotification(challenge);
      });
    }
    
    setActiveChallenges(stillActive);
    localStorage.setItem('activeChallenges', JSON.stringify(stillActive));
  };

  const showCompletionNotification = (challenge) => {
    // Simple alert for now - could be replaced with a toast notification system
    alert(`🎉 Challenge Completed!\n\n${challenge.name}\n${challenge.description}\n\nReward: ${challenge.reward}\nPoints: ${challenge.points}`);
  };

  const createChallenge = (template, variant) => {
    const newChallenge = {
      id: Date.now().toString(),
      type: selectedChallengeType,
      name: variant.reward,
      description: template.description,
      icon: template.icon,
      category: template.category,
      target: variant.duration || variant.target || variant.workouts || variant.weeks,
      reward: variant.reward,
      points: variant.points,
      startDate: new Date().toISOString(),
      progress: 0,
      isComplete: false,
      // Add specific properties based on type
      ...(selectedChallengeType === 'exercise_milestone' && {
        exercise: variant.exercise,
        target: variant.weight
      }),
      ...(selectedChallengeType === 'workout_frequency' && {
        period: variant.period
      }),
      ...(selectedChallengeType === 'body_transformation' && {
        type: variant.type,
        target: variant.amount
      }),
      ...(selectedChallengeType === 'perfect_week' && {
        expectedWorkouts: variant.workouts
      })
    };
    
    const updatedActive = [...activeChallenges, newChallenge];
    setActiveChallenges(updatedActive);
    localStorage.setItem('activeChallenges', JSON.stringify(updatedActive));
    
    setShowCreateModal(false);
    setSelectedChallengeType('');
  };

  const deleteChallenge = (challengeId) => {
    const updatedActive = activeChallenges.filter(c => c.id !== challengeId);
    setActiveChallenges(updatedActive);
    localStorage.setItem('activeChallenges', JSON.stringify(updatedActive));
  };

  const getProgressPercentage = (challenge) => {
    if (challenge.target === 0) return 0;
    return Math.min(100, (challenge.progress / challenge.target) * 100);
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-yellow-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-gray-400';
  };

  const getTotalPoints = () => {
    return completedChallenges.reduce((sum, challenge) => sum + (challenge.points || 0), 0);
  };

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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl section-header mb-2">Challenge System</h2>
          <div className="flex items-center space-x-4 text-sm text-gray-200">
            <span>🏆 {getTotalPoints()} Total Points</span>
            <span>🎯 {activeChallenges.length} Active</span>
            <span>✅ {completedChallenges.length} Completed</span>
          </div>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
        >
          + New Challenge
        </button>
      </div>

      {/* Active Challenges */}
      {activeChallenges.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <span className="mr-2">🎯</span>
            Active Challenges ({activeChallenges.length})
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeChallenges.map((challenge) => (
              <div key={challenge.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{challenge.icon}</span>
                      <div>
                        <h4 className="font-semibold">{challenge.name}</h4>
                        <p className="text-xs opacity-90">{challenge.category}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteChallenge(challenge.id)}
                      className="text-red-300 hover:text-red-100 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-sm opacity-90">{challenge.description}</p>
                </div>
                
                <div className="p-4">
                  <div className="mb-3">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{challenge.progress} / {challenge.target}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(getProgressPercentage(challenge))}`}
                        style={{ width: `${getProgressPercentage(challenge)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {getProgressPercentage(challenge).toFixed(0)}% complete
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">
                      Reward: <span className="font-medium text-gray-800">{challenge.reward}</span>
                    </span>
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                      {challenge.points} pts
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-2">
                    Started {format(new Date(challenge.startDate), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Challenges */}
      {completedChallenges.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <span className="mr-2">🏅</span>
            Completed Challenges ({completedChallenges.length})
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {completedChallenges.slice(-6).map((challenge) => (
              <div key={challenge.id} className="bg-gradient-to-br from-green-100 to-green-200 rounded-lg p-4 border border-green-300">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">{challenge.icon}</span>
                  <div>
                    <h4 className="font-medium text-green-800">{challenge.name}</h4>
                    <p className="text-xs text-green-600">{challenge.category}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-green-700">{challenge.reward}</span>
                  <span className="bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                    +{challenge.points}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {activeChallenges.length === 0 && completedChallenges.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Challenges Yet</h3>
          <p className="text-gray-200 mb-6">Create your first challenge to start earning rewards!</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors"
          >
            Create First Challenge
          </button>
        </div>
      )}

      {/* Create Challenge Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold">Create New Challenge</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-white hover:text-gray-200 text-3xl"
                >
                  ×
                </button>
              </div>
              <p className="opacity-90 mt-2">Choose a challenge type and difficulty level</p>
            </div>
            
            <div className="p-6">
              {!selectedChallengeType ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(challengeTemplates).map(([key, template]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedChallengeType(key)}
                      className="text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all"
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="text-3xl">{template.icon}</span>
                        <div>
                          <h4 className="font-semibold text-gray-800">{template.name}</h4>
                          <p className="text-sm text-gray-600">{template.category}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{template.description}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => setSelectedChallengeType('')}
                    className="mb-4 text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    ← Back to Challenge Types
                  </button>
                  
                  <div className="mb-6">
                    <h4 className="text-xl font-semibold text-gray-800 mb-2 flex items-center">
                      <span className="mr-2">{challengeTemplates[selectedChallengeType].icon}</span>
                      {challengeTemplates[selectedChallengeType].name}
                    </h4>
                    <p className="text-gray-600">{challengeTemplates[selectedChallengeType].description}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {challengeTemplates[selectedChallengeType].variants.map((variant, index) => (
                      <button
                        key={index}
                        onClick={() => createChallenge(challengeTemplates[selectedChallengeType], variant)}
                        className="text-left p-4 border-2 border-gray-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium text-gray-800">{variant.reward}</h5>
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                            {variant.points} pts
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {selectedChallengeType === 'consecutive_workouts' && `${variant.duration} days in a row`}
                          {selectedChallengeType === 'weight_moved' && `Move ${variant.target.toLocaleString()} lbs total`}
                          {selectedChallengeType === 'exercise_milestone' && `${variant.exercise}: ${variant.weight} lbs`}
                          {selectedChallengeType === 'workout_frequency' && `${variant.workouts} workouts in ${variant.period} days`}
                          {selectedChallengeType === 'body_transformation' && `${variant.type} ${variant.amount} lbs`}
                          {selectedChallengeType === 'perfect_week' && `${variant.weeks} perfect week(s) (${variant.workouts} workouts each)`}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChallengeSystem;