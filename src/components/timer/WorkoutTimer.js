import React, { useState, useEffect, useCallback, useImperativeHandle } from 'react';
import { WorkoutTimer as Timer, formatDuration, saveTimerState, loadTimerState, clearTimerState, TIMER_STATES } from '../../utils/workoutTimer';

const WorkoutTimer = React.forwardRef(({ onWorkoutComplete, currentExercise, onTimerData }, ref) => {
  const [timer, setTimer] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerState, setTimerState] = useState(TIMER_STATES.IDLE);
  const [restTime, setRestTime] = useState(0);
  const [workoutSummary, setWorkoutSummary] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    getCurrentTimerData: () => {
      if (timer) {
        const data = timer.getWorkoutSummary();
        console.log('📥 getCurrentTimerData called, returning:', data);
        return data;
      }
      return null;
    }
  }), [timer]);

  // Initialize timer
  useEffect(() => {
    const timerInstance = new Timer(
      (elapsed) => {
        setElapsedTime(elapsed);
        // Update rest time if in rest mode
        if (timerInstance.restStartTime) {
          setRestTime(timerInstance.getCurrentRestTime());
        }
      },
      (state, duration) => {
        setTimerState(state);
        if (state === TIMER_STATES.COMPLETED) {
          const summary = timerInstance.getWorkoutSummary();
          setWorkoutSummary(summary);
          setShowSummary(true);
          
          // Pass timer data to parent
          if (onTimerData) {
            onTimerData(summary);
          }
          
          // Don't clear timer state yet - wait for user to save/discard
          saveTimerState(timerInstance);
        } else {
          // Save state to localStorage
          saveTimerState(timerInstance);
        }
      }
    );

    // Load previous timer state if exists
    const savedState = loadTimerState();
    if (savedState) {
      timerInstance.fromJSON(savedState);
      setElapsedTime(timerInstance.getElapsedTime());
      setTimerState(timerInstance.state);
      if (timerInstance.restStartTime) {
        setRestTime(timerInstance.getCurrentRestTime());
      }
    }

    setTimer(timerInstance);

    // Cleanup interval on unmount
    return () => {
      if (timerInstance) {
        timerInstance.clearInterval();
      }
    };
  }, [onTimerData]);

  // Update rest timer and pass current timer data to parent
  useEffect(() => {
    let restInterval;
    if (timer && timer.restStartTime && timerState === TIMER_STATES.RUNNING) {
      restInterval = setInterval(() => {
        setRestTime(timer.getCurrentRestTime());
        
        // Pass current timer data to parent in real-time
        if (onTimerData) {
          const currentSummary = timer.getWorkoutSummary();
          onTimerData(currentSummary);
        }
      }, 1000);
    }
    return () => {
      if (restInterval) clearInterval(restInterval);
    };
  }, [timer, timerState, onTimerData]);

  // Handle exercise changes
  useEffect(() => {
    if (timer && currentExercise && timerState === TIMER_STATES.RUNNING) {
      // Auto-start new exercise if not already tracking it
      if (!timer.currentExercise || timer.currentExercise.name !== currentExercise) {
        timer.startExercise(currentExercise);
      }
    }
  }, [timer, currentExercise, timerState]);

  const handleStart = useCallback(() => {
    if (timer) {
      timer.start();
      // Pass current timer data when starting
      if (onTimerData && timer.getElapsedTime() > 0) {
        const currentSummary = timer.getWorkoutSummary();
        onTimerData(currentSummary);
      }
    }
  }, [timer, onTimerData]);

  const handlePause = useCallback(() => {
    if (timer) {
      timer.pause();
      // Pass current timer data when pausing
      if (onTimerData) {
        const currentSummary = timer.getWorkoutSummary();
        onTimerData(currentSummary);
      }
    }
  }, [timer, onTimerData]);

  const handleStop = useCallback(() => {
    if (timer) {
      timer.stop();
      // Pass current timer data when stopping
      if (onTimerData) {
        const currentSummary = timer.getWorkoutSummary();
        onTimerData(currentSummary);
      }
    }
  }, [timer, onTimerData]);

  const handleReset = useCallback(() => {
    if (timer) {
      timer.reset();
      setElapsedTime(0);
      setRestTime(0);
      setWorkoutSummary(null);
      setShowSummary(false);
      clearTimerState();
    }
  }, [timer]);

  const handleStartSet = useCallback((exercise, setNumber = 1) => {
    if (timer) {
      timer.startSet(exercise, setNumber);
      // Pass current timer data when starting a set
      if (onTimerData) {
        const currentSummary = timer.getWorkoutSummary();
        onTimerData(currentSummary);
      }
    }
  }, [timer, onTimerData]);

  const handleEndSet = useCallback((reps = null, weight = null) => {
    if (timer) {
      timer.endSet(reps, weight);
      // Pass current timer data when ending a set
      if (onTimerData) {
        const currentSummary = timer.getWorkoutSummary();
        onTimerData(currentSummary);
      }
    }
  }, [timer, onTimerData]);

  const handleEndRest = useCallback(() => {
    if (timer) {
      timer.endRest();
      setRestTime(0);
    }
  }, [timer]);

  const handleCompleteSummary = useCallback(() => {
    setShowSummary(false);
    if (onWorkoutComplete && workoutSummary) {
      onWorkoutComplete(workoutSummary);
    }
    // Clear timer state after saving workout
    clearTimerState();
  }, [onWorkoutComplete, workoutSummary]);

  const handleDiscardWorkout = useCallback(() => {
    setShowSummary(false);
    handleReset();
  }, [handleReset]);

  if (showSummary && workoutSummary) {
    return <WorkoutSummaryModal 
      summary={workoutSummary}
      onComplete={handleCompleteSummary}
      onDiscard={handleDiscardWorkout}
    />;
  }

  // Minimized view
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 bg-blue-600 text-white rounded-lg shadow-lg p-3 z-50">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              timerState === TIMER_STATES.RUNNING ? 'bg-green-400 animate-pulse' :
              timerState === TIMER_STATES.PAUSED ? 'bg-yellow-400' :
              'bg-gray-400'
            }`} />
            <span className="text-sm font-mono">{formatDuration(elapsedTime)}</span>
          </div>
          {restTime > 0 && (
            <span className="text-xs bg-blue-500 px-2 py-1 rounded">
              Rest: {formatDuration(restTime)}
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="text-xs hover:text-blue-200 transition-colors"
          >
            ▲
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-md p-6 text-white">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold">Workout Timer</h3>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="text-sm text-blue-200 hover:text-white transition-colors"
          >
            ▼
          </button>
        </div>
      </div>

      {/* Main Timer Display */}
      <div className="text-center mb-6">
        <div className="text-4xl font-mono font-bold mb-2">
          {formatDuration(elapsedTime)}
        </div>
        <div className="flex items-center justify-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            timerState === TIMER_STATES.RUNNING ? 'bg-green-400 animate-pulse' :
            timerState === TIMER_STATES.PAUSED ? 'bg-yellow-400' :
            timerState === TIMER_STATES.COMPLETED ? 'bg-blue-400' :
            'bg-gray-400'
          }`} />
          <span className="text-sm capitalize">{timerState.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex justify-center space-x-3 mb-4">
        {timerState === TIMER_STATES.IDLE && (
          <button
            type="button"
            onClick={handleStart}
            className="bg-green-500 hover:bg-green-600 px-6 py-2 rounded-lg font-medium transition-colors"
          >
            ▶ Start Workout
          </button>
        )}

        {timerState === TIMER_STATES.RUNNING && (
          <button
            type="button"
            onClick={handlePause}
            className="bg-yellow-500 hover:bg-yellow-600 px-6 py-2 rounded-lg font-medium transition-colors"
          >
            ⏸ Pause
          </button>
        )}

        {timerState === TIMER_STATES.PAUSED && (
          <button
            type="button"
            onClick={handleStart}
            className="bg-green-500 hover:bg-green-600 px-6 py-2 rounded-lg font-medium transition-colors"
          >
            ▶ Resume
          </button>
        )}

        {(timerState === TIMER_STATES.RUNNING || timerState === TIMER_STATES.PAUSED) && (
          <button
            type="button"
            onClick={handleStop}
            className="bg-red-500 hover:bg-red-600 px-6 py-2 rounded-lg font-medium transition-colors"
          >
            ⏹ Finish
          </button>
        )}

        {timerState !== TIMER_STATES.IDLE && (
          <button
            type="button"
            onClick={handleReset}
            className="bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            🔄 Reset
          </button>
        )}
      </div>

      {/* Rest Timer */}
      {restTime > 0 && (
        <div className="bg-blue-500 bg-opacity-50 rounded-lg p-3 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm">Rest Time:</span>
            <div className="flex items-center space-x-3">
              <span className="font-mono text-lg">{formatDuration(restTime)}</span>
              <button
                type="button"
                onClick={handleEndRest}
                className="bg-blue-400 hover:bg-blue-300 text-blue-900 px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                End Rest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Tracking Controls */}
      {timerState === TIMER_STATES.RUNNING && currentExercise && (
        <div className="bg-purple-500 bg-opacity-50 rounded-lg p-3">
          <div className="text-sm mb-2">Current: {currentExercise}</div>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => handleStartSet(currentExercise)}
              className="bg-purple-400 hover:bg-purple-300 text-purple-900 px-3 py-1 rounded text-sm font-medium transition-colors"
            >
              Start Set
            </button>
            <button
              type="button"
              onClick={() => handleEndSet()}
              className="bg-purple-400 hover:bg-purple-300 text-purple-900 px-3 py-1 rounded text-sm font-medium transition-colors"
            >
              End Set
            </button>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {timer && timer.sets.length > 0 && (
        <div className="mt-4 pt-4 border-t border-blue-400">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold">{timer.sets.length}</div>
              <div className="text-blue-200">Sets</div>
            </div>
            <div className="text-center">
              <div className="font-semibold">{timer.exercises.length + (timer.currentExercise ? 1 : 0)}</div>
              <div className="text-blue-200">Exercises</div>
            </div>
            <div className="text-center">
              <div className="font-semibold">
                {timer.getWorkoutSummary().efficiency}%
              </div>
              <div className="text-blue-200">Efficiency</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// Workout Summary Modal Component
const WorkoutSummaryModal = ({ summary, onComplete, onDiscard }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full m-4">
        <h3 className="text-xl font-bold text-gray-900 mb-4">🎉 Workout Complete!</h3>
        
        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-semibold text-gray-900">Total Time</div>
                <div className="text-gray-600">{formatDuration(summary.totalDuration)}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Work Time</div>
                <div className="text-gray-600">{formatDuration(summary.workTime)}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Sets</div>
                <div className="text-gray-600">{summary.setCount}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Exercises</div>
                <div className="text-gray-600">{summary.exerciseCount}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Efficiency</div>
                <div className="text-gray-600">{summary.efficiency}%</div>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Avg Rest</div>
                <div className="text-gray-600">{formatDuration(summary.avgRestDuration)}</div>
              </div>
            </div>
          </div>

          {summary.exercises.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Exercises:</h4>
              <div className="space-y-1">
                {summary.exercises.map((exercise, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-700">{exercise.name}</span>
                    <span className="text-gray-500">
                      {exercise.sets.length} sets • {formatDuration(exercise.duration)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onComplete}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Save Workout
          </button>
          <button
            onClick={onDiscard}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkoutTimer;