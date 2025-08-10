/**
 * Workout Duration Tracking and Timer Utilities
 * 
 * This module provides comprehensive workout timing functionality including:
 * - Workout session timers
 * - Rest period tracking
 * - Set-level timing
 * - Duration analytics and metrics
 */

// Timer states
export const TIMER_STATES = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed'
};

// Duration format utilities
export function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

export function parseDuration(durationString) {
  if (typeof durationString === 'number') {
    return durationString;
  }
  
  if (!durationString || typeof durationString !== 'string') {
    return 0;
  }

  const parts = durationString.split(':').map(Number);
  
  if (parts.length === 3) {
    // HH:MM:SS format
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS format
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    // SS format
    return parts[0];
  }
  
  return 0;
}

// Workout Timer Class
export class WorkoutTimer {
  constructor(onUpdate, onStateChange) {
    this.startTime = null;
    this.endTime = null;
    this.pausedTime = 0;
    this.totalPausedDuration = 0;
    this.state = TIMER_STATES.IDLE;
    this.intervalId = null;
    this.onUpdate = onUpdate || (() => {});
    this.onStateChange = onStateChange || (() => {});
    
    // Set-level tracking
    this.sets = [];
    this.currentSet = null;
    this.restStartTime = null;
    
    // Exercise tracking
    this.exercises = [];
    this.currentExercise = null;
  }

  start() {
    if (this.state === TIMER_STATES.RUNNING) return;
    
    const now = Date.now();
    
    if (this.state === TIMER_STATES.IDLE) {
      this.startTime = now;
    } else if (this.state === TIMER_STATES.PAUSED) {
      this.totalPausedDuration += now - this.pausedTime;
    }
    
    this.state = TIMER_STATES.RUNNING;
    this.startInterval();
    this.onStateChange(this.state, this.getElapsedTime());
  }

  pause() {
    if (this.state !== TIMER_STATES.RUNNING) return;
    
    this.pausedTime = Date.now();
    this.state = TIMER_STATES.PAUSED;
    this.clearInterval();
    this.onStateChange(this.state, this.getElapsedTime());
  }

  stop() {
    this.endTime = Date.now();
    this.state = TIMER_STATES.COMPLETED;
    this.clearInterval();
    this.onStateChange(this.state, this.getTotalDuration());
    
    return {
      totalDuration: this.getTotalDuration(),
      workoutData: this.getWorkoutSummary()
    };
  }

  reset() {
    this.startTime = null;
    this.endTime = null;
    this.pausedTime = 0;
    this.totalPausedDuration = 0;
    this.state = TIMER_STATES.IDLE;
    this.clearInterval();
    this.sets = [];
    this.exercises = [];
    this.currentSet = null;
    this.currentExercise = null;
    this.onStateChange(this.state, 0);
  }

  getElapsedTime() {
    if (!this.startTime) return 0;
    
    const now = this.state === TIMER_STATES.PAUSED ? this.pausedTime : Date.now();
    return Math.floor((now - this.startTime - this.totalPausedDuration) / 1000);
  }

  getTotalDuration() {
    if (!this.startTime || !this.endTime) return this.getElapsedTime();
    return Math.floor((this.endTime - this.startTime - this.totalPausedDuration) / 1000);
  }

  startInterval() {
    this.clearInterval();
    this.intervalId = setInterval(() => {
      this.onUpdate(this.getElapsedTime());
    }, 1000);
  }

  clearInterval() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Set-level tracking methods
  startSet(exercise, setNumber) {
    const now = Date.now();
    
    // End previous set if exists
    if (this.currentSet) {
      this.endSet();
    }
    
    // Start new exercise tracking if needed
    if (!this.currentExercise || this.currentExercise.name !== exercise) {
      this.startExercise(exercise);
    }
    
    this.currentSet = {
      exercise,
      setNumber,
      startTime: now,
      endTime: null,
      duration: 0,
      restBefore: this.restStartTime ? Math.floor((now - this.restStartTime) / 1000) : 0
    };
    
    this.restStartTime = null; // Clear rest timer
  }

  endSet(reps = null, weight = null) {
    if (!this.currentSet) return;
    
    const now = Date.now();
    this.currentSet.endTime = now;
    this.currentSet.duration = Math.floor((now - this.currentSet.startTime) / 1000);
    this.currentSet.reps = reps;
    this.currentSet.weight = weight;
    
    this.sets.push({ ...this.currentSet });
    
    if (this.currentExercise) {
      this.currentExercise.sets.push({ ...this.currentSet });
    }
    
    this.currentSet = null;
    this.startRest(); // Auto-start rest timer
  }

  startRest() {
    this.restStartTime = Date.now();
  }

  endRest() {
    this.restStartTime = null;
  }

  getCurrentRestTime() {
    if (!this.restStartTime) return 0;
    return Math.floor((Date.now() - this.restStartTime) / 1000);
  }

  // Exercise-level tracking
  startExercise(exerciseName) {
    // End previous exercise if exists
    if (this.currentExercise) {
      this.endExercise();
    }
    
    this.currentExercise = {
      name: exerciseName,
      startTime: Date.now(),
      endTime: null,
      duration: 0,
      sets: []
    };
  }

  endExercise() {
    if (!this.currentExercise) return;
    
    const now = Date.now();
    this.currentExercise.endTime = now;
    this.currentExercise.duration = Math.floor((now - this.currentExercise.startTime) / 1000);
    
    this.exercises.push({ ...this.currentExercise });
    this.currentExercise = null;
  }

  // Data export methods
  getWorkoutSummary() {
    const totalDuration = this.getTotalDuration();
    const setCount = this.sets.length;
    const exerciseCount = this.exercises.length + (this.currentExercise ? 1 : 0);
    
    // Calculate rest vs work time
    const workTime = this.sets.reduce((total, set) => total + set.duration, 0);
    const restTime = this.sets.reduce((total, set) => total + set.restBefore, 0);
    const otherTime = totalDuration - workTime - restTime;
    
    // Average set duration
    const avgSetDuration = setCount > 0 ? workTime / setCount : 0;
    
    // Average rest time
    const avgRestDuration = setCount > 1 ? restTime / (setCount - 1) : 0;
    
    return {
      totalDuration,
      workTime,
      restTime,
      otherTime,
      setCount,
      exerciseCount,
      avgSetDuration: Math.round(avgSetDuration),
      avgRestDuration: Math.round(avgRestDuration),
      exercises: [...this.exercises],
      sets: [...this.sets],
      efficiency: totalDuration > 0 ? Math.round((workTime / totalDuration) * 100) : 0
    };
  }

  // State persistence
  toJSON() {
    return {
      startTime: this.startTime,
      endTime: this.endTime,
      pausedTime: this.pausedTime,
      totalPausedDuration: this.totalPausedDuration,
      state: this.state,
      sets: this.sets,
      exercises: this.exercises,
      currentSet: this.currentSet,
      currentExercise: this.currentExercise,
      restStartTime: this.restStartTime
    };
  }

  fromJSON(data) {
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.pausedTime = data.pausedTime || 0;
    this.totalPausedDuration = data.totalPausedDuration || 0;
    this.state = data.state || TIMER_STATES.IDLE;
    this.sets = data.sets || [];
    this.exercises = data.exercises || [];
    this.currentSet = data.currentSet;
    this.currentExercise = data.currentExercise;
    this.restStartTime = data.restStartTime;
    
    // Resume interval if was running
    if (this.state === TIMER_STATES.RUNNING) {
      this.startInterval();
    }
  }
}

// Duration analytics functions
export function calculateWorkoutMetrics(workouts) {
  if (!workouts || workouts.length === 0) {
    return {
      totalWorkouts: 0,
      totalDuration: 0,
      averageDuration: 0,
      shortestWorkout: 0,
      longestWorkout: 0,
      totalWorkTime: 0,
      totalRestTime: 0,
      averageRestTime: 0,
      workoutFrequency: 0,
      efficiencyTrend: []
    };
  }

  const durations = workouts.map(w => w.totalDuration || 0).filter(d => d > 0);
  const workTimes = workouts.map(w => w.workTime || 0).filter(d => d > 0);
  const restTimes = workouts.map(w => w.restTime || 0).filter(d => d > 0);
  
  const totalDuration = durations.reduce((sum, d) => sum + d, 0);
  const totalWorkTime = workTimes.reduce((sum, d) => sum + d, 0);
  const totalRestTime = restTimes.reduce((sum, d) => sum + d, 0);
  
  // Calculate workout frequency (workouts per week)
  const sortedWorkouts = workouts.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  const firstWorkout = sortedWorkouts[0];
  const lastWorkout = sortedWorkouts[sortedWorkouts.length - 1];
  const daySpan = Math.max(1, Math.floor((new Date(lastWorkout.date) - new Date(firstWorkout.date)) / (1000 * 60 * 60 * 24)));
  const workoutFrequency = (workouts.length / daySpan) * 7;
  
  // Calculate efficiency trend (last 10 workouts)
  const recentWorkouts = workouts.slice(-10);
  const efficiencyTrend = recentWorkouts.map(w => ({
    date: w.date,
    efficiency: w.efficiency || (w.totalDuration > 0 ? Math.round(((w.workTime || 0) / w.totalDuration) * 100) : 0)
  }));
  
  return {
    totalWorkouts: workouts.length,
    totalDuration,
    averageDuration: durations.length > 0 ? Math.round(totalDuration / durations.length) : 0,
    shortestWorkout: durations.length > 0 ? Math.min(...durations) : 0,
    longestWorkout: durations.length > 0 ? Math.max(...durations) : 0,
    totalWorkTime,
    totalRestTime,
    averageRestTime: restTimes.length > 0 ? Math.round(totalRestTime / restTimes.length) : 0,
    workoutFrequency: Math.round(workoutFrequency * 10) / 10,
    efficiencyTrend,
    averageEfficiency: efficiencyTrend.length > 0 ? Math.round(efficiencyTrend.reduce((sum, e) => sum + e.efficiency, 0) / efficiencyTrend.length) : 0
  };
}

// Duration-based recommendations
export function generateDurationRecommendations(metrics, currentWorkout = null) {
  const recommendations = [];
  
  if (metrics.totalWorkouts === 0) {
    return [{
      type: 'info',
      title: 'Welcome to Workout Tracking!',
      message: 'Start timing your workouts to get personalized insights and recommendations.',
      priority: 'low'
    }];
  }
  
  // Workout duration recommendations
  if (metrics.averageDuration > 0) {
    if (metrics.averageDuration > 5400) { // > 90 minutes
      recommendations.push({
        type: 'warning',
        title: 'Long Workout Duration',
        message: `Your average workout is ${formatDuration(metrics.averageDuration)}. Consider shortening sessions to maintain intensity.`,
        priority: 'medium'
      });
    } else if (metrics.averageDuration < 1800) { // < 30 minutes
      recommendations.push({
        type: 'info',
        title: 'Short Workout Duration',
        message: `Your average workout is ${formatDuration(metrics.averageDuration)}. You might benefit from longer sessions.`,
        priority: 'low'
      });
    }
  }
  
  // Efficiency recommendations
  if (metrics.averageEfficiency > 0) {
    if (metrics.averageEfficiency < 30) {
      recommendations.push({
        type: 'tip',
        title: 'Improve Workout Efficiency',
        message: `Your workouts are ${metrics.averageEfficiency}% efficient. Try reducing rest times or eliminating distractions.`,
        priority: 'medium'
      });
    } else if (metrics.averageEfficiency > 70) {
      recommendations.push({
        type: 'success',
        title: 'Great Workout Efficiency!',
        message: `Your workouts are ${metrics.averageEfficiency}% efficient. You're making great use of your time.`,
        priority: 'low'
      });
    }
  }
  
  // Frequency recommendations
  if (metrics.workoutFrequency > 0) {
    if (metrics.workoutFrequency < 2) {
      recommendations.push({
        type: 'info',
        title: 'Increase Workout Frequency',
        message: `You're averaging ${metrics.workoutFrequency} workouts per week. Aim for 3-4 sessions for optimal results.`,
        priority: 'medium'
      });
    } else if (metrics.workoutFrequency > 6) {
      recommendations.push({
        type: 'warning',
        title: 'High Workout Frequency',
        message: `You're averaging ${metrics.workoutFrequency} workouts per week. Make sure to include rest days for recovery.`,
        priority: 'high'
      });
    }
  }
  
  // Current workout recommendations
  if (currentWorkout) {
    const currentDuration = currentWorkout.totalDuration || currentWorkout.elapsedTime || 0;
    
    if (currentDuration > 5400) { // > 90 minutes
      recommendations.push({
        type: 'warning',
        title: 'Long Current Session',
        message: `Current workout: ${formatDuration(currentDuration)}. Consider wrapping up to maintain quality.`,
        priority: 'high'
      });
    }
    
    if (currentWorkout.efficiency && currentWorkout.efficiency < 40) {
      recommendations.push({
        type: 'tip',
        title: 'Focus on Efficiency',
        message: `Current efficiency: ${currentWorkout.efficiency}%. Try to minimize rest times between sets.`,
        priority: 'medium'
      });
    }
  }
  
  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

// Local storage utilities for timer persistence
export function saveTimerState(timer) {
  try {
    localStorage.setItem('workoutTimer', JSON.stringify(timer.toJSON()));
  } catch (error) {
    console.warn('Failed to save timer state:', error);
  }
}

export function loadTimerState() {
  try {
    const saved = localStorage.getItem('workoutTimer');
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn('Failed to load timer state:', error);
    return null;
  }
}

export function clearTimerState() {
  try {
    localStorage.removeItem('workoutTimer');
  } catch (error) {
    console.warn('Failed to clear timer state:', error);
  }
}