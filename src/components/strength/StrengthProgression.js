import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart
} from 'recharts';
import { format, subDays } from 'date-fns';

const StrengthProgression = () => {
  const [workoutData, setWorkoutData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [timeRange, setTimeRange] = useState(90); // days
  const [chartType, setChartType] = useState('weight'); // 'weight', 'volume', 'oneRM', 'all'
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchWorkoutData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (workoutData.length > 0) {
      const exercises = [...new Set(workoutData.map(w => w.exercise || w.Exercise))];
      setAvailableExercises(exercises);
      if (selectedExercises.length === 0) {
        // Auto-select top 5 most frequent exercises
        const exerciseFrequency = exercises.reduce((acc, exercise) => {
          acc[exercise] = workoutData.filter(w => (w.exercise || w.Exercise) === exercise).length;
          return acc;
        }, {});
        const topExercises = Object.entries(exerciseFrequency)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([exercise]) => exercise);
        setSelectedExercises(topExercises);
      }
    }
  }, [workoutData]);

  useEffect(() => {
    if (workoutData.length > 0 && selectedExercises.length > 0) {
      calculateProgressionStats(workoutData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExercises, workoutData]);

  const fetchWorkoutData = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/get-workouts`, {
        params: { userId: 'default-user' }
      });
      
      if (response.data.success && (response.data.workouts || response.data.data)) {
        const workouts = response.data.workouts || response.data.data;
        setWorkoutData(workouts);
        calculateProgressionStats(workouts);
      }
    } catch (error) {
      console.error('Failed to fetch workout data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateProgressionStats = (workouts) => {
    const exerciseStats = {};
    
    selectedExercises.forEach(exercise => {
      const exerciseWorkouts = workouts
        .filter(w => (w.exercise || w.Exercise) === exercise)
        .sort((a, b) => new Date(a.date || a.Date) - new Date(b.date || b.Date));
      
      if (exerciseWorkouts.length > 1) {
        const first = exerciseWorkouts[0];
        const latest = exerciseWorkouts[exerciseWorkouts.length - 1];
        const weightGain = (latest.weight || latest.Weight) - (first.weight || first.Weight);
        const volumeFirst = (first.sets || first.Sets) * (first.reps || first.Reps) * (first.weight || first.Weight);
        const volumeLatest = (latest.sets || latest.Sets) * (latest.reps || latest.Reps) * (latest.weight || latest.Weight);
        
        exerciseStats[exercise] = {
          workoutCount: exerciseWorkouts.length,
          weightIncrease: weightGain,
          weightIncreasePercent: ((weightGain / (first.weight || first.Weight)) * 100).toFixed(1),
          volumeIncrease: volumeLatest - volumeFirst,
          currentWeight: latest.weight || latest.Weight,
          currentOneRM: calculateOneRM(latest.weight || latest.Weight, latest.reps || latest.Reps)
        };
      }
    });
    
    setStats(exerciseStats);
  };

  const calculateOneRM = (weight, reps) => {
    // Brzycki formula: 1RM = weight × (36 / (37 - reps))
    return Math.round(weight * (36 / (37 - reps)));
  };

  const prepareChartData = () => {
    const cutoffDate = subDays(new Date(), timeRange);
    const filteredData = workoutData.filter(workout => {
      const workoutDate = new Date(workout.date || workout.Date);
      return workoutDate >= cutoffDate && selectedExercises.includes(workout.exercise || workout.Exercise);
    });

    // Group by date and exercise
    const groupedData = {};
    filteredData.forEach(workout => {
      const date = format(new Date(workout.date || workout.Date), 'yyyy-MM-dd');
      const exercise = workout.exercise || workout.Exercise;
      const weight = workout.weight || workout.Weight;
      const sets = workout.sets || workout.Sets;
      const reps = workout.reps || workout.Reps;
      
      if (!groupedData[date]) {
        groupedData[date] = { date };
      }
      
      // Store max weight for the day for each exercise
      const currentWeight = groupedData[date][`${exercise}_weight`] || 0;
      const currentVolume = groupedData[date][`${exercise}_volume`] || 0;
      const currentOneRM = groupedData[date][`${exercise}_1RM`] || 0;
      
      const volume = sets * reps * weight;
      const oneRM = calculateOneRM(weight, reps);
      
      groupedData[date][`${exercise}_weight`] = Math.max(currentWeight, weight);
      groupedData[date][`${exercise}_volume`] = Math.max(currentVolume, volume);
      groupedData[date][`${exercise}_1RM`] = Math.max(currentOneRM, oneRM);
    });

    return Object.values(groupedData).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const getExerciseColors = () => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];
    const colorMap = {};
    selectedExercises.forEach((exercise, index) => {
      colorMap[exercise] = colors[index % colors.length];
    });
    return colorMap;
  };

  const toggleExercise = (exercise) => {
    setSelectedExercises(prev => 
      prev.includes(exercise) 
        ? prev.filter(e => e !== exercise)
        : [...prev, exercise]
    );
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

  const chartData = prepareChartData();
  const colors = getExerciseColors();

  return (
    <div className="bg-blue-primary rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl section-header mb-4">Strength Progression Analytics</h2>
        
        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-6">
          {/* Time Range Selector */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Time Range</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            >
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
              <option value={180}>Last 6 months</option>
              <option value={365}>Last year</option>
            </select>
          </div>

          {/* Chart Type Selector */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Metric</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            >
              <option value="weight">Max Weight</option>
              <option value="volume">Training Volume</option>
              <option value="oneRM">Estimated 1RM</option>
              <option value="all">All Metrics</option>
            </select>
          </div>
        </div>

        {/* Exercise Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Select Exercises to Track</h3>
          <div className="flex flex-wrap gap-2">
            {availableExercises.map(exercise => (
              <button
                key={exercise}
                onClick={() => toggleExercise(exercise)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedExercises.includes(exercise)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {exercise}
              </button>
            ))}
          </div>
        </div>

        {/* Progression Stats */}
        {Object.keys(stats).length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">Progress Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(stats).map(([exercise, stat]) => (
                <div key={exercise} className="bg-white bg-opacity-10 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-2">{exercise}</h4>
                  <div className="space-y-1 text-sm text-gray-100">
                    <p>Current Weight: {stat.currentWeight} lbs</p>
                    <p>Weight Gain: +{stat.weightIncrease} lbs ({stat.weightIncreasePercent}%)</p>
                    <p>Est. 1RM: {stat.currentOneRM} lbs</p>
                    <p>Workouts: {stat.workoutCount}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg p-4" style={{ height: '500px' }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'all' ? (
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => format(new Date(date), 'MMM dd')}
              />
              <YAxis yAxisId="weight" orientation="left" />
              <YAxis yAxisId="volume" orientation="right" />
              <Tooltip 
                labelFormatter={(date) => format(new Date(date), 'MMM dd, yyyy')}
              />
              <Legend />
              
              {selectedExercises.map(exercise => (
                <React.Fragment key={exercise}>
                  <Line
                    yAxisId="weight"
                    type="monotone"
                    dataKey={`${exercise}_weight`}
                    stroke={colors[exercise]}
                    strokeWidth={2}
                    dot={{ fill: colors[exercise], strokeWidth: 2, r: 4 }}
                    name={`${exercise} (Weight)`}
                  />
                  <Bar
                    yAxisId="volume"
                    dataKey={`${exercise}_volume`}
                    fill={colors[exercise]}
                    fillOpacity={0.3}
                    name={`${exercise} (Volume)`}
                  />
                </React.Fragment>
              ))}
            </ComposedChart>
          ) : (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => format(new Date(date), 'MMM dd')}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(date) => format(new Date(date), 'MMM dd, yyyy')}
              />
              <Legend />
              
              {selectedExercises.map(exercise => (
                <Line
                  key={exercise}
                  type="monotone"
                  dataKey={`${exercise}_${chartType}`}
                  stroke={colors[exercise]}
                  strokeWidth={3}
                  dot={{ fill: colors[exercise], strokeWidth: 2, r: 5 }}
                  name={exercise}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {chartData.length === 0 && (
        <div className="text-center py-8 text-white">
          <p className="text-lg">No workout data found for selected time range.</p>
          <p className="text-sm opacity-75 mt-2">Log some workouts to see your strength progression!</p>
        </div>
      )}
    </div>
  );
};

export default StrengthProgression;