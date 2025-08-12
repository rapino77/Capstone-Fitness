import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import '../../styles/mobile-workout.css';

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
        completedSets: [
          { reps: 8, completed: true },
          { reps: 8, completed: true },
          { reps: 8, completed: false }
        ]
      },
      {
        id: 2,
        name: 'Squat',
        targetSets: 5,
        targetReps: 5,
        targetWeight: 190,
        completedSets: [
          { reps: 5, weight: 190, completed: true },
          { reps: 5, weight: 170, completed: true },
          { reps: 5, weight: 170, completed: true },
          { reps: 5, weight: 170, completed: true },
          { reps: 5, weight: 170, completed: true }
        ]
      },
      {
        id: 3,
        name: 'Standing Calf Raise',
        targetSets: 3,
        targetReps: 12,
        targetWeight: 195,
        completedSets: [
          { reps: 12, completed: true },
          { reps: 12, completed: true },
          { reps: 12, completed: true }
        ]
      },
      {
        id: 4,
        name: 'Hanging Knee Raise',
        targetSets: 8,
        targetReps: 7,
        targetWeight: 0,
        completedSets: [
          { reps: 7, completed: true },
          { reps: 0, completed: false },
          { reps: 0, completed: false }
        ]
      },
      {
        id: 5,
        name: 'Dips',
        targetSets: 3,
        targetReps: 8,
        targetWeight: 0,
        isBodyweight: true,
        completedSets: [
          { reps: 8, completed: false },
          { reps: 8, completed: false },
          { reps: 8, completed: false }
        ]
      },
      {
        id: 6,
        name: 'Lunges',
        targetSets: 3,
        targetReps: 8,
        targetWeight: 30,
        completedSets: []
      }
    ]
  });

  const [timer, setTimer] = useState({
    minutes: 2,
    seconds: 33,
    isRunning: false
  });

  const [activeTab, setActiveTab] = useState('workout');
  const [selectedExercise, setSelectedExercise] = useState(null);
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

  const resetTimer = () => {
    setTimer({ minutes: 0, seconds: 0, isRunning: false });
  };

  const handleSetToggle = (exerciseId, setIndex) => {
    setCurrentWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map(exercise => {
        if (exercise.id === exerciseId) {
          const newCompletedSets = [...exercise.completedSets];
          if (newCompletedSets[setIndex]) {
            newCompletedSets[setIndex] = {
              ...newCompletedSets[setIndex],
              completed: !newCompletedSets[setIndex].completed
            };
          } else {
            newCompletedSets[setIndex] = {
              reps: exercise.targetReps,
              weight: exercise.targetWeight,
              completed: true
            };
          }
          return {
            ...exercise,
            completedSets: newCompletedSets
          };
        }
        return exercise;
      })
    }));
  };

  const getExerciseStatus = (exercise) => {
    const completed = exercise.completedSets.filter(set => set.completed).length;
    const total = exercise.targetSets;
    
    if (completed === total) return 'Done';
    if (completed > 0) return `${completed}/${total}`;
    return '';
  };

  const renderSetCircles = (exercise) => {
    const circles = [];
    
    for (let i = 0; i < exercise.targetSets; i++) {
      const set = exercise.completedSets[i];
      const isCompleted = set?.completed || false;
      const hasData = set?.reps !== undefined;
      
      circles.push(
        <button
          key={i}
          onClick={() => handleSetToggle(exercise.id, i)}
          className={`set-circle ${
            isCompleted 
              ? 'completed' 
              : hasData
                ? 'in-progress'
                : 'pending'
          }`}
        >
          {hasData ? set.reps || exercise.targetReps : exercise.targetReps}
        </button>
      );
    }
    
    // Add plus button for additional sets
    if (exercise.completedSets.length < exercise.targetSets + 2) {
      circles.push(
        <button
          key="add"
          onClick={() => handleSetToggle(exercise.id, exercise.completedSets.length)}
          className="set-circle pending"
        >
          +
        </button>
      );
    }
    
    return circles;
  };

  const saveWorkout = async () => {
    setIsSubmitting(true);
    setSubmitMessage({ type: '', text: '' });

    try {
      // Save each completed set as a separate workout entry
      const promises = [];
      
      for (const exercise of currentWorkout.exercises) {
        const completedSets = exercise.completedSets.filter(set => set.completed);
        
        for (const set of completedSets) {
          const workoutData = {
            exercise: exercise.name,
            sets: 1, // Each set is saved individually
            reps: set.reps || exercise.targetReps,
            weight: set.weight || exercise.targetWeight || 0,
            date: format(new Date(), 'yyyy-MM-dd'),
            userId: 'default-user',
            notes: `Mobile workout - ${currentWorkout.name}`,
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
      return total + exercise.completedSets.filter(set => set.completed).length;
    }, 0);
  };

  return (
    <div className="mobile-workout-interface min-h-screen bg-black text-white">
      {/* Status Bar */}
      <div className="flex justify-between items-center px-4 py-2 text-sm">
        <span>8:37</span>
        <div className="flex items-center space-x-1">
          <div className="flex space-x-1">
            <div className="status-indicator"></div>
            <div className="status-indicator"></div>
            <div className="status-indicator"></div>
            <div className="status-indicator low"></div>
          </div>
          <span>📶</span>
          <span>📶</span>
          <span className="bg-white text-black px-1 rounded-sm text-xs">96</span>
        </div>
      </div>

      {/* Header */}
      <div className="mobile-header">
        <button 
          className="touch-target"
          onClick={() => window.history.back()}
        >
          ← Back
        </button>
        <div className="flex items-center space-x-2">
          <h1 className="text-lg font-medium">{currentWorkout.name}</h1>
          <button className="text-gray-400 touch-target">
            ▼
          </button>
        </div>
        <button 
          className="touch-target"
          onClick={saveWorkout}
          disabled={isSubmitting || getCompletedSetsCount() === 0}
        >
          {isSubmitting ? 'Saving...' : 'Finish'}
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          onClick={() => setActiveTab('workout')}
          className={`tab-button ${activeTab === 'workout' ? 'active' : ''}`}
        >
          Workout
        </button>
        <button
          onClick={() => setActiveTab('warmup')}
          className={`tab-button ${activeTab === 'warmup' ? 'active' : ''}`}
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
      <div className="mobile-container pb-32">
        {currentWorkout.exercises.map((exercise) => (
          <div key={exercise.id} className="exercise-item">
            {/* Exercise Header */}
            <div className="exercise-header">
              <div>
                <h3 className="exercise-title">{exercise.name}</h3>
              </div>
              <div className="exercise-target">
                <span>
                  {exercise.targetSets}×{exercise.targetReps} {exercise.isBodyweight ? 'BW' : `${exercise.targetWeight}lb`}
                </span>
                <div className="exercise-status">
                  <span>{getExerciseStatus(exercise)}</span>
                  <span className="ml-1">→</span>
                </div>
              </div>
            </div>

            {/* Set Circles */}
            <div className="sets-container">
              {renderSetCircles(exercise)}
            </div>

            {/* Weight display for some exercises */}
            {exercise.completedSets.length > 0 && exercise.completedSets[0]?.weight && (
              <div className="weight-display">
                {exercise.completedSets.slice(0, 5).map((set, index) => (
                  set.weight && (
                    <div key={index} className="text-center">
                      {set.weight}
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Timer Display */}
      <div className="bottom-timer">
        <div className="timer-controls">
          <div className="timer-time timer-display">
            {timer.minutes}:{timer.seconds.toString().padStart(2, '0')}
          </div>
          <div className="timer-buttons">
            <button
              onClick={toggleTimer}
              className={`timer-button ${timer.isRunning ? 'pause' : 'start'}`}
            >
              {timer.isRunning ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={resetTimer}
              className="timer-button reset"
            >
              ↻
            </button>
          </div>
        </div>
        <div className="motivation-box">
          <div className="motivation-title">Well done!</div>
          <div className="motivation-text">Set equipment then lift!</div>
        </div>
        <div className="workout-info">
          <div className="workout-info-item">
            <span className="workout-info-label">Completed Sets</span>
            <span className="workout-info-value">{getCompletedSetsCount()}</span>
          </div>
          <div className="workout-info-item">
            <span className="workout-info-label">Duration</span>
            <span className="workout-info-value">
              {timer.minutes}:{timer.seconds.toString().padStart(2, '0')}
            </span>
          </div>
          <button 
            className="edit-button"
            onClick={saveWorkout}
            disabled={isSubmitting || getCompletedSetsCount() === 0}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileWorkoutInterface;