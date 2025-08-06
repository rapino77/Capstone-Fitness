import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  ScatterChart,
  Scatter,
  ReferenceLine
} from 'recharts';
import { format } from 'date-fns';

const ProgressCharts = ({ data, type = 'line', height = 300, ...props }) => {
  const formatXAxis = (tickItem) => {
    return format(new Date(tickItem), 'MM/dd');
  };

  const formatTooltipDate = (value) => {
    return format(new Date(value), 'MMM dd, yyyy');
  };

  const commonProps = {
    width: "100%",
    height,
    data
  };

  const renderChart = () => {
    switch (type) {
      case 'weight-progress':
        return (
          <ResponsiveContainer {...commonProps}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={formatXAxis} />
              <YAxis yAxisId="weight" orientation="left" domain={['dataMin - 5', 'dataMax + 5']} />
              <YAxis yAxisId="volume" orientation="right" />
              <Tooltip 
                labelFormatter={formatTooltipDate}
                formatter={(value, name) => {
                  if (name === 'weight') return [`${value} lbs`, 'Weight'];
                  if (name === 'volume') return [`${(value / 1000).toFixed(1)}k lbs`, 'Volume'];
                  return [value, name];
                }}
              />
              <Legend />
              <Area
                yAxisId="volume"
                type="monotone"
                dataKey="volume"
                fill="#93C5FD"
                stroke="#3B82F6"
                fillOpacity={0.3}
                name="Training Volume"
              />
              <Line
                yAxisId="weight"
                type="monotone"
                dataKey="weight"
                stroke="#EF4444"
                strokeWidth={3}
                dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                name="Body Weight"
              />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'strength-progress':
        return (
          <ResponsiveContainer {...commonProps}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={formatXAxis} />
              <YAxis />
              <Tooltip 
                labelFormatter={formatTooltipDate}
                formatter={(value, name) => [`${value} lbs`, name]}
              />
              <Legend />
              {Object.keys(data[0] || {}).filter(key => key !== 'date').map((exercise, index) => {
                const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
                return (
                  <Line
                    key={exercise}
                    type="monotone"
                    dataKey={exercise}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                    dot={{ strokeWidth: 2, r: 3 }}
                    connectNulls={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'goal-progress':
        return (
          <ResponsiveContainer {...commonProps}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={formatXAxis} />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                labelFormatter={formatTooltipDate}
                formatter={(value) => [`${value.toFixed(1)}%`, 'Progress']}
              />
              <Area
                type="monotone"
                dataKey="progress"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.6}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'volume-trend':
        return (
          <ResponsiveContainer {...commonProps}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={formatXAxis} />
              <YAxis />
              <Tooltip 
                labelFormatter={formatTooltipDate}
                formatter={(value) => [`${(value / 1000).toFixed(1)}k lbs`, 'Volume']}
              />
              <Bar dataKey="volume" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'frequency-heatmap':
        return (
          <ResponsiveContainer {...commonProps}>
            <BarChart data={data} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="day" type="category" />
              <Tooltip formatter={(value) => [`${value} workouts`, 'Frequency']} />
              <Bar dataKey="workouts" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'progressive-overload':
        return (
          <ResponsiveContainer {...commonProps}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={formatXAxis} />
              <YAxis yAxisId="weight" orientation="left" />
              <YAxis yAxisId="volume" orientation="right" />
              <Tooltip 
                labelFormatter={formatTooltipDate}
                formatter={(value, name) => {
                  if (name === 'maxWeight') return [`${value} lbs`, 'Max Weight'];
                  if (name === 'volume') return [`${(value / 1000).toFixed(1)}k lbs`, 'Volume'];
                  if (name === 'estimated1RM') return [`${value.toFixed(1)} lbs`, 'Est. 1RM'];
                  return [value, name];
                }}
              />
              <Legend />
              <Area
                yAxisId="volume"
                type="monotone"
                dataKey="volume"
                fill="#E5E7EB"
                stroke="#9CA3AF"
                fillOpacity={0.3}
                name="Training Volume"
              />
              <Line
                yAxisId="weight"
                type="monotone"
                dataKey="maxWeight"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                name="Max Weight"
              />
              <Line
                yAxisId="weight"
                type="monotone"
                dataKey="estimated1RM"
                stroke="#10B981"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
                name="Estimated 1RM"
              />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'strength-heatmap':
        return (
          <ResponsiveContainer {...commonProps}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="exercise" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'maxWeight') return [`${value} lbs`, 'Max Weight'];
                  if (name === 'improvement') return [`+${value} lbs`, 'Improvement'];
                  if (name === 'frequency') return [`${value} sessions`, 'Frequency'];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar dataKey="maxWeight" fill="#3B82F6" name="Current Max" />
              <Bar dataKey="improvement" fill="#10B981" name="Recent Improvement" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'volume-vs-strength':
        return (
          <ResponsiveContainer {...commonProps}>
            <ScatterChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="volume" name="Volume" unit="k lbs" />
              <YAxis dataKey="maxWeight" name="Max Weight" unit="lbs" />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value, name) => {
                  if (name === 'maxWeight') return [`${value} lbs`, 'Max Weight'];
                  if (name === 'volume') return [`${(value / 1000).toFixed(1)}k lbs`, 'Volume'];
                  return [value, name];
                }}
                labelFormatter={(label) => `Exercise: ${label}`}
              />
              <Scatter dataKey="maxWeight" fill="#3B82F6" />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'pr-timeline':
        return (
          <ResponsiveContainer {...commonProps}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={formatXAxis} />
              <YAxis />
              <Tooltip 
                labelFormatter={formatTooltipDate}
                formatter={(value, name, props) => {
                  const improvement = props.payload.improvement;
                  return [
                    `${value} lbs${improvement ? ` (+${improvement} lbs)` : ''}`, 
                    name
                  ];
                }}
              />
              <Legend />
              {/* Add reference lines for strength standards */}
              <ReferenceLine y={135} stroke="#FED7AA" strokeDasharray="2 2" label="Intermediate" />
              <ReferenceLine y={225} stroke="#FDE68A" strokeDasharray="2 2" label="Advanced" />
              <ReferenceLine y={315} stroke="#FCA5A5" strokeDasharray="2 2" label="Elite" />
              {Object.keys(data[0] || {}).filter(key => !['date', 'improvement'].includes(key)).map((exercise, index) => {
                const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
                return (
                  <Line
                    key={exercise}
                    type="monotone"
                    dataKey={exercise}
                    stroke={colors[index % colors.length]}
                    strokeWidth={3}
                    dot={{ strokeWidth: 2, r: 5 }}
                    connectNulls={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'multi-metric-dashboard':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Volume Progression</h4>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.volumeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatXAxis} />
                  <YAxis />
                  <Tooltip labelFormatter={formatTooltipDate} />
                  <Area
                    type="monotone"
                    dataKey="volume"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Strength Progress</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.strengthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatXAxis} />
                  <YAxis />
                  <Tooltip labelFormatter={formatTooltipDate} />
                  <Legend />
                  {Object.keys(data.strengthData[0] || {}).filter(key => key !== 'date').slice(0, 3).map((exercise, index) => {
                    const colors = ['#3B82F6', '#10B981', '#F59E0B'];
                    return (
                      <Line
                        key={exercise}
                        type="monotone"
                        dataKey={exercise}
                        stroke={colors[index]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Training Frequency</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.frequencyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="workouts" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <h4 className="text-sm font-medium text-gray-700 mb-2">PR Distribution</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.prData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="exercise" angle={-45} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      default:
        return (
          <ResponsiveContainer {...commonProps}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={formatXAxis} />
              <YAxis />
              <Tooltip labelFormatter={formatTooltipDate} />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="w-full">
      {renderChart()}
    </div>
  );
};

// Predefined chart configurations for common use cases
export const WeightProgressChart = ({ data, height = 300 }) => (
  <ProgressCharts data={data} type="weight-progress" height={height} />
);

export const StrengthProgressChart = ({ data, height = 300 }) => (
  <ProgressCharts data={data} type="strength-progress" height={height} />
);

export const GoalProgressChart = ({ data, height = 300 }) => (
  <ProgressCharts data={data} type="goal-progress" height={height} />
);

export const VolumeTrendChart = ({ data, height = 300 }) => (
  <ProgressCharts data={data} type="volume-trend" height={height} />
);

export const FrequencyHeatmap = ({ data, height = 300 }) => (
  <ProgressCharts data={data} type="frequency-heatmap" height={height} />
);

export const ProgressiveOverloadChart = ({ data, height = 400 }) => (
  <ProgressCharts data={data} type="progressive-overload" height={height} />
);

export const StrengthHeatmap = ({ data, height = 300 }) => (
  <ProgressCharts data={data} type="strength-heatmap" height={height} />
);

export const VolumeVsStrengthChart = ({ data, height = 400 }) => (
  <ProgressCharts data={data} type="volume-vs-strength" height={height} />
);

export const PRTimelineChart = ({ data, height = 400 }) => (
  <ProgressCharts data={data} type="pr-timeline" height={height} />
);

export const MultiMetricDashboard = ({ data, height = 600 }) => (
  <ProgressCharts data={data} type="multi-metric-dashboard" height={height} />
);

// Advanced Chart Component with Interactive Features
export const AdvancedStrengthChart = ({ data, title = "Strength Progression Analysis" }) => {
  const [selectedMetric, setSelectedMetric] = useState('maxWeight');
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [timeRange, setTimeRange] = useState('90'); // days
  
  useEffect(() => {
    if (data && data.length > 0) {
      // Auto-select up to 3 exercises with most data points
      const exerciseFrequency = {};
      data.forEach(item => {
        Object.keys(item).filter(key => key !== 'date').forEach(exercise => {
          if (item[exercise] !== null && item[exercise] !== undefined) {
            exerciseFrequency[exercise] = (exerciseFrequency[exercise] || 0) + 1;
          }
        });
      });
      
      const topExercises = Object.entries(exerciseFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([exercise]) => exercise);
      
      setSelectedExercises(topExercises);
    }
  }, [data]);

  const availableExercises = data && data.length > 0 
    ? Object.keys(data[0]).filter(key => key !== 'date')
    : [];

  const filteredData = data?.filter(item => {
    const itemDate = new Date(item.date);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(timeRange));
    return itemDate >= cutoffDate;
  }) || [];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 lg:mb-0">{title}</h3>
        
        <div className="flex flex-wrap gap-4">
          {/* Time Range Selector */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Time Range:</label>
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
            >
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="180">6 months</option>
              <option value="365">1 year</option>
            </select>
          </div>

          {/* Metric Selector */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Metric:</label>
            <select 
              value={selectedMetric} 
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
            >
              <option value="maxWeight">Max Weight</option>
              <option value="volume">Volume</option>
              <option value="estimated1RM">Estimated 1RM</option>
            </select>
          </div>
        </div>
      </div>

      {/* Exercise Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Selected Exercises ({selectedExercises.length}/5):
        </label>
        <div className="flex flex-wrap gap-2">
          {availableExercises.map(exercise => (
            <button
              key={exercise}
              onClick={() => {
                if (selectedExercises.includes(exercise)) {
                  setSelectedExercises(prev => prev.filter(e => e !== exercise));
                } else if (selectedExercises.length < 5) {
                  setSelectedExercises(prev => [...prev, exercise]);
                }
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedExercises.includes(exercise)
                  ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                  : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
              } ${selectedExercises.length >= 5 && !selectedExercises.includes(exercise) 
                  ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              disabled={selectedExercises.length >= 5 && !selectedExercises.includes(exercise)}
            >
              {exercise}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => format(new Date(date), 'MM/dd')}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(date) => format(new Date(date), 'MMM dd, yyyy')}
              formatter={(value, name) => {
                if (selectedMetric === 'volume') {
                  return [`${(value / 1000).toFixed(1)}k lbs`, name];
                }
                return [`${value} lbs`, name];
              }}
            />
            <Legend />
            {selectedExercises.map((exercise, index) => {
              const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
              return (
                <Line
                  key={exercise}
                  type="monotone"
                  dataKey={exercise}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                  dot={{ strokeWidth: 2, r: 4 }}
                  connectNulls={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Summary */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {selectedExercises.slice(0, 3).map(exercise => {
          const exerciseData = filteredData
            .filter(item => item[exercise] !== null && item[exercise] !== undefined)
            .map(item => item[exercise]);
          
          if (exerciseData.length === 0) return null;
          
          const current = exerciseData[exerciseData.length - 1];
          const previous = exerciseData[0];
          const improvement = current - previous;
          const improvementPercent = previous > 0 ? (improvement / previous) * 100 : 0;
          
          return (
            <div key={exercise} className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 truncate">{exercise}</h4>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {selectedMetric === 'volume' ? `${(current / 1000).toFixed(1)}k` : current} lbs
              </div>
              <div className={`text-sm ${improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {improvement >= 0 ? '+' : ''}{improvement.toFixed(1)} lbs ({improvementPercent.toFixed(1)}%)
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressCharts;