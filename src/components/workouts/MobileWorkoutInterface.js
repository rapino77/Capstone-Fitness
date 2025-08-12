import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';

const MobileWorkoutInterface = ({ onSuccess }) => {
  const [currentWorkout, setCurrentWorkout] = useState({
    name: 'Workout A - Legs',
    exercises: [
      {
        id: 1,
        name: 'Bulgarian Split Squat',
        targetSets: 3,
        targetReps: 8,
        targetWeight: 35,
        completedSets: [8, 8, 8],
        isCompleted: false
      },
      {
        id: 2,
        name: 'Squat',
        targetSets: 5,
        targetReps: 5,
        targetWeight: 170,
        completedSets: [5, 5, 5, 5, 5],
        isCompleted: true
      },
      {
        id: 3,
        name: 'Standing Calf Raise',
        targetSets: 3,
        targetReps: 12,
        targetWeight: 195,
        completedSets: [12, 12, 12],
        isCompleted: false
      },
      {
        id: 4,
        name: 'Hanging Knee Raise',
        targetSets: 8,
        targetReps: 8,
        targetWeight: 7,
        isBodyweight: true,
        completedSets: [7, 0, 0],
        isCompleted: false
      },
      {
        id: 5,
        name: 'Dips',
        targetSets: 3,
        targetReps: 8,
        targetWeight: 0,
        isBodyweight: true,
        unit: 'BW',
        completedSets: [8, 8, 8],
        isCompleted: false
      },
      {
        id: 6,
        name: 'Lunges',
        targetSets: 3,
        targetReps: 8,
        targetWeight: 30,
        completedSets: [],
        isCompleted: false
      }
    ]
  });

  const [timer, setTimer] = useState({
    minutes: 2,
    seconds: 33,
    isRunning: false
  });

  const [activeTab, setActiveTab] = useState('workout');
  // Removed unused selectedExercise state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });

  // Timer functionality
  useEffect(() => {
    let interval = null;
    if (timer.isRunning) {
      interval = setInterval(() => {
        setTimer(prev => {
          const totalSeconds = prev.minutes * 60 + prev.seconds + 1;
          return {
            ...prev,
            minutes: Math.floor(totalSeconds / 60),
            seconds: totalSeconds % 60
          };
        });
      }, 1000);
    } else if (!timer.isRunning && timer.seconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timer.isRunning, timer.seconds]);

  const toggleTimer = () => {
    setTimer(prev => ({ ...prev, isRunning: !prev.isRunning }));
  };

  // Timer reset functionality available if needed
  // const resetTimer = () => {
  //   setTimer({ minutes: 0, seconds: 0, isRunning: false });
  // };

  const updateSetReps = (exerciseId, setIndex, reps) => {
    setCurrentWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map(exercise => {
        if (exercise.id === exerciseId) {
          const newCompletedSets = [...exercise.completedSets];
          newCompletedSets[setIndex] = parseInt(reps) || 0;
          return {
            ...exercise,
            completedSets: newCompletedSets
          };
        }
        return exercise;
      })
    }));
  };

  const toggleExerciseComplete = (exerciseId) => {
    setCurrentWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map(exercise => {
        if (exercise.id === exerciseId) {
          return {
            ...exercise,
            isCompleted: !exercise.isCompleted
          };
        }
        return exercise;
      })
    }));
  };

  // Exercise status helper function
  // const getExerciseStatus = (exercise) => {
  //   if (exercise.isCompleted) return 'Done';
  //   const completed = exercise.completedSets.filter(reps => reps > 0).length;
  //   const total = exercise.targetSets;
  //   
  //   if (completed === total) return 'Done';
  //   if (completed > 0) return `${completed}/${total}`;
  //   return '';
  // };

  const SetCircle = ({ reps, targetReps, isActive, onClick, isCompleted }) => (
    <button
      onClick={onClick}
      className={`w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold transition-all ${
        isCompleted 
          ? 'bg-red-500 text-white border-2 border-red-400' 
          : isActive 
            ? 'bg-gray-600 text-white border-2 border-gray-400' 
            : 'bg-gray-800 text-gray-400 border-2 border-gray-600'
      }`}
    >
      {reps || targetReps}
    </button>
  );

  const renderSetCircles = (exercise) => {
    const circles = [];
    
    for (let i = 0; i < exercise.targetSets; i++) {
      const completedReps = exercise.completedSets[i] || 0;
      const isCompleted = completedReps > 0;
      const isActive = i === 0 || exercise.completedSets[i - 1] > 0;
      
      circles.push(
        <SetCircle
          key={i}
          reps={completedReps}
          targetReps={exercise.targetReps}
          isActive={isActive}
          isCompleted={isCompleted}
          onClick={() => {
            if (isActive) {
              const newReps = completedReps === exercise.targetReps ? 0 : exercise.targetReps;
              updateSetReps(exercise.id, i, newReps);
            }
          }}
        />
      );
    }
    
    // Add plus button for additional sets
    circles.push(
      <button
        key="add"
        className="w-16 h-16 rounded-full border-2 border-gray-600 text-gray-400 text-2xl hover:border-gray-400 transition-colors"
        onClick={() => {
          const newIndex = exercise.completedSets.length;
          updateSetReps(exercise.id, newIndex, exercise.targetReps);
        }}
      >
        +
      </button>
    );
    
    return circles;
  };

  const saveWorkout = async () => {
    setIsSubmitting(true);
    setSubmitMessage({ type: '', text: '' });

    try {
      // Save each completed set as a separate workout entry
      const promises = [];
      
      for (const exercise of currentWorkout.exercises) {
        const completedReps = exercise.completedSets.filter(reps => reps > 0);
        
        if (completedReps.length > 0) {
          const avgReps = Math.round(completedReps.reduce((a, b) => a + b, 0) / completedReps.length);
          const completedSets = completedReps.length;
          
          const workoutData = {
            exercise: exercise.name,
            sets: completedSets,
            reps: avgReps,
            weight: exercise.targetWeight || 0,
            date: format(new Date(), 'yyyy-MM-dd'),
            userId: 'default-user',
            notes: `Mobile workout - ${completedSets}/${exercise.targetSets} sets completed`,
            // Timer data
            totalDuration: timer.minutes * 60 + timer.seconds,
            startTime: new Date(Date.now() - (timer.minutes * 60 + timer.seconds) * 1000).toISOString(),
            endTime: new Date().toISOString()
          };

          promises.push(
            axios.post(`${process.env.REACT_APP_API_URL}/log-workout`, workoutData)
          );
        }
      }

      if (promises.length === 0) {
        setSubmitMessage({ 
          type: 'error', 
          text: 'No completed sets to save. Complete at least one set to save your workout.' 
        });
        return;
      }

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.data.success).length;

      if (successCount === promises.length) {
        setSubmitMessage({ 
          type: 'success', 
          text: `🎉 Workout saved! ${successCount} sets logged successfully.` 
        });
        
        // Reset timer
        setTimer({ minutes: 0, seconds: 0, isRunning: false });
        
        if (onSuccess) {
          onSuccess({ success: true, setsLogged: successCount });
        }

        // Reset workout after a delay
        setTimeout(() => {
          setCurrentWorkout(prev => ({
            ...prev,
            exercises: prev.exercises.map(ex => ({
              ...ex,
              completedSets: []
            }))
          }));
          setSubmitMessage({ type: '', text: '' });
        }, 3000);

      } else {
        setSubmitMessage({ 
          type: 'error', 
          text: `Partially saved: ${successCount}/${promises.length} sets saved successfully.` 
        });
      }

    } catch (error) {
      console.error('Failed to save workout:', error);
      setSubmitMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to save workout. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCompletedSetsCount = () => {
    return currentWorkout.exercises.reduce((total, exercise) => {
      return total + exercise.completedSets.filter(reps => reps > 0).length;
    }, 0);
  };

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Status Bar */}
      <div className="flex justify-between items-center px-4 py-2 text-sm">
        <span>8:37 👤</span>
        <div className="flex items-center space-x-1">
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
          </div>
          <span>📶 📶</span>
          <span className="bg-white text-black px-1 rounded-sm text-xs font-bold">96</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-900">
        <button 
          onClick={() => window.history.back()}
          className="text-red-500 text-lg font-medium"
        >
          ← Back
        </button>
        
        <div className="text-center">
          <h1 className="text-xl font-medium text-white">{currentWorkout.name}</h1>
          <button className="text-gray-400 text-sm">
            ▼
          </button>
        </div>
        
        <button 
          onClick={saveWorkout}
          disabled={isSubmitting || getCompletedSetsCount() === 0}
          className="text-red-500 text-lg font-medium disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Finish'}
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex mx-4 mt-4 mb-6">
        <button
          onClick={() => setActiveTab('workout')}
          className={`flex-1 py-3 rounded-l-xl font-medium ${
            activeTab === 'workout' 
              ? 'bg-gray-600 text-white' 
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          Workout
        </button>
        <button
          onClick={() => setActiveTab('warmup')}
          className={`flex-1 py-3 rounded-r-xl font-medium ${
            activeTab === 'warmup' 
              ? 'bg-gray-600 text-white' 
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          Warmup
        </button>
      </div>

      {/* Status Message */}
      {submitMessage.text && (
        <div className={`mx-4 mb-4 p-3 rounded-lg text-sm ${
          submitMessage.type === 'success' 
            ? 'bg-green-900 text-green-100 border border-green-700' 
            : 'bg-red-900 text-red-100 border border-red-700'
        }`}>
          {submitMessage.text}
        </div>
      )}

      {/* Exercise List */}
      <div className="px-4 space-y-4 pb-32">
        {currentWorkout.exercises.map((exercise) => (
          <div key={exercise.id} className="space-y-3">
            {/* Exercise Header */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-white">{exercise.name}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-400">
                  {exercise.targetSets}×{exercise.targetReps}
                </span>
                <div className="text-right">
                  <span className="text-lg font-semibold text-white">
                    {exercise.isBodyweight ? (exercise.unit || 'BW') : `${exercise.targetWeight}lb`}
                  </span>
                </div>
                <button
                  onClick={() => toggleExerciseComplete(exercise.id)}
                  className="text-red-500 text-xl"
                >
                  {exercise.isCompleted ? '✓' : '▶'}
                </button>
              </div>
            </div>

            {/* Set Circles */}
            <div className="flex items-center space-x-3 overflow-x-auto pb-2">
              {renderSetCircles(exercise)}
            </div>

            {/* Weight/Reps Info for completed sets */}
            {exercise.completedSets.length > 0 && (
              <div className="flex justify-between items-center text-sm text-gray-400 ml-4">
                <div className="flex space-x-4">
                  {exercise.completedSets.slice(0, 5).map((reps, index) => (
                    <span key={index} className={reps > 0 ? 'text-white' : ''}>
                      {reps || exercise.targetReps}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Timer/Notes Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-3xl font-bold text-white">
                {timer.minutes}:{timer.seconds.toString().padStart(2, '0')}
              </div>
              <div className="text-sm text-gray-400">
                Well done!<br />
                Set equipment then lift!
              </div>
            </div>
            <button 
              onClick={toggleTimer}
              className="text-gray-400 text-xl"
            >
              {timer.isRunning ? '⏸' : '▶'}
            </button>
          </div>
          
          <div className="mt-3 flex items-center justify-between">
            <div>
              <span className="text-sm text-white font-medium">Note</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">{timer.minutes + 21}min</span>
              <button className="text-red-500 text-sm font-medium">Edit</button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-red-500 transition-all duration-300"
              style={{ 
                width: `${(currentWorkout.exercises.filter(ex => ex.isCompleted).length / currentWorkout.exercises.length) * 100}%` 
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileWorkoutInterface;