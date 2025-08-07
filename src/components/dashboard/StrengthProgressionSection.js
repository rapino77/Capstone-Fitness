import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const StrengthProgressionSection = ({ strengthProgression }) => {
  // State to manage view mode for each exercise
  const [exerciseViewModes, setExerciseViewModes] = useState({});

  const setViewMode = (exercise, mode) => {
    setExerciseViewModes(prev => ({
      ...prev,
      [exercise]: mode
    }));
  };

  const getViewMode = (exercise) => {
    return exerciseViewModes[exercise] || 'chart';
  };

  // Calculate moving averages for chart data
  const calculateMovingAverages = (data, windowSize) => {
    if (!data || data.length === 0) return [];
    
    return data.map((item, index) => {
      const startIndex = Math.max(0, index - windowSize + 1);
      const relevantData = data.slice(startIndex, index + 1);
      const sum = relevantData.reduce((acc, curr) => acc + curr.weight, 0);
      const average = sum / relevantData.length;
      
      return {
        ...item,
        [`ma${windowSize}`]: Number(average.toFixed(1))
      };
    });
  };

  const formatXAxis = (tickItem) => {
    try {
      if (!tickItem) return '';
      return format(new Date(tickItem), 'MM/dd');
    } catch (error) {
      return String(tickItem).substring(0, 10);
    }
  };

  const formatTooltipDate = (value) => {
    try {
      if (!value) return '';
      return format(new Date(value), 'MMM dd, yyyy');
    } catch (error) {
      return String(value);
    }
  };

  // Custom tick components to force black text
  const CustomXAxisTick = (props) => {
    const { x, y, payload } = props;
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={16}
          textAnchor="end"
          fill="black"
          transform="rotate(-45)"
          fontSize="12"
        >
          {formatXAxis(payload.value)}
        </text>
      </g>
    );
  };

  const CustomYAxisTick = (props) => {
    const { x, y, payload } = props;
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={4}
          textAnchor="end"
          fill="black"
          fontSize="12"
        >
          {Math.round(payload.value)}
        </text>
      </g>
    );
  };

  // Create table component for strength data
  const StrengthTable = ({ data, exercise }) => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Weight
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Sets × Reps
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Volume
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Est. 1RM
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.slice().reverse().map((entry, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {format(new Date(entry.date), 'MMM dd, yyyy')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {entry.weight} lbs
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {entry.sets || 1} × {entry.reps || 1}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {Math.round(entry.volume || 0)} lbs
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {Math.round(entry.oneRM || entry.weight)} lbs
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900">Strength Progression</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(strengthProgression)
          .sort(([, a], [, b]) => b.metrics.totalSessions - a.metrics.totalSessions)
          .slice(0, 6)
          .map(([exercise, data]) => {
            // Process and validate chart data
            const validChartData = (data.chartData || [])
              .filter(point => {
                if (!point) return false;
                const weight = Number(point.weight);
                const hasValidWeight = !isNaN(weight) && weight > 0;
                const hasValidDate = point.date && !isNaN(new Date(point.date).getTime());
                return hasValidWeight && hasValidDate;
              })
              .map(point => ({
                date: point.date,
                weight: Number(point.weight),
                oneRM: Number(point.oneRM || 0),
                volume: Number(point.volume || 0),
                workouts: Number(point.workouts || 0),
                sets: point.sets || 1,
                reps: point.reps || 1
              }))
              .sort((a, b) => new Date(a.date) - new Date(b.date));

            // Add moving averages
            const dataWithMA7 = calculateMovingAverages(validChartData, 3); // Use 3-session average instead of 7-day
            const dataWithAllMA = calculateMovingAverages(dataWithMA7, 5); // Use 5-session average instead of 30-day

            const currentViewMode = getViewMode(exercise);

            return (
              <div key={exercise} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold">{exercise} Progress</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode(exercise, 'chart')}
                      className={`px-3 py-1 rounded text-sm ${
                        currentViewMode === 'chart'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Chart View
                    </button>
                    <button
                      onClick={() => setViewMode(exercise, 'table')}
                      className={`px-3 py-1 rounded text-sm ${
                        currentViewMode === 'table'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Table View
                    </button>
                  </div>
                </div>

                {/* Stats Summary */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Current: {data.metrics.currentWeight} lbs</span>
                    <span className={`font-medium ${
                      data.metrics.weightIncrease > 0 ? 'text-green-600' : 
                      data.metrics.weightIncrease < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {data.metrics.weightIncrease > 0 ? '+' : ''}{data.metrics.weightIncrease?.toFixed(1)} lbs
                    </span>
                  </div>
                </div>

                {validChartData.length > 0 ? (
                  currentViewMode === 'chart' ? (
                    <div className="overflow-x-auto overflow-y-hidden border border-gray-200 rounded-lg strength-chart-scroll strength-progression-chart" style={{ color: 'black', backgroundColor: 'white' }}>
                      <div style={{ 
                        minWidth: Math.max(600, validChartData.length * 60) + 'px',
                        color: 'black'
                      }}>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart 
                            data={dataWithAllMA}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                            style={{ color: '#000000' }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                              dataKey="date" 
                              height={60}
                              interval={0}
                              tick={<CustomXAxisTick />}
                              stroke="black"
                              axisLine={{ stroke: 'black' }}
                              tickLine={{ stroke: 'black' }}
                            />
                            <YAxis 
                              domain={validChartData.length === 1 ? [0, 'dataMax + 10'] : ['dataMin - 5', 'dataMax + 5']}
                              tick={<CustomYAxisTick />}
                              stroke="black"
                              axisLine={{ stroke: 'black' }}
                              tickLine={{ stroke: 'black' }}
                              label={{ 
                                value: 'Weight (lbs)', 
                                angle: -90, 
                                position: 'insideLeft',
                                style: { textAnchor: 'middle', fill: 'black', color: 'black' }
                              }}
                            />
                            <Tooltip 
                              labelFormatter={formatTooltipDate}
                              formatter={(value, name) => {
                                if (name === 'Weight') return [`${value} lbs`, name];
                                if (name === '3-Session Average') return [`${value} lbs`, name];
                                if (name === '5-Session Average') return [`${value} lbs`, name];
                                return [value, name];
                              }}
                              contentStyle={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                color: 'black'
                              }}
                              labelStyle={{ 
                                color: 'black',
                                fontWeight: 'bold'
                              }}
                              itemStyle={{ 
                                color: 'black'
                              }}
                            />
                            <Legend wrapperStyle={{ color: 'black' }} />
                            
                            {/* Main weight line */}
                            <Line 
                              type="monotone" 
                              dataKey="weight" 
                              stroke="#3B82F6" 
                              strokeWidth={2}
                              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3 }}
                              activeDot={{ r: 6, fill: '#3B82F6' }}
                              name="Weight"
                            />
                            
                            {/* 3-session moving average */}
                            {dataWithAllMA.length > 2 && (
                              <Line 
                                type="monotone" 
                                dataKey="ma3" 
                                stroke="#10B981" 
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={false}
                                name="3-Session Average"
                              />
                            )}
                            
                            {/* 5-session moving average */}
                            {dataWithAllMA.length > 4 && (
                              <Line 
                                type="monotone" 
                                dataKey="ma5" 
                                stroke="#F59E0B" 
                                strokeWidth={2}
                                strokeDasharray="10 5"
                                dot={false}
                                name="5-Session Average"
                              />
                            )}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Scroll Instructions */}
                      {validChartData.length > 8 && (
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center bg-blue-50 py-2 px-3 rounded-md border border-blue-200">
                          <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4 4-4m6 8l4-4-4-4" />
                          </svg>
                          <span className="text-blue-700 font-medium">Scroll horizontally to see all {validChartData.length} data points</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <StrengthTable data={validChartData} exercise={exercise} />
                  )
                ) : (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <div className="text-gray-400 text-4xl mb-2">📈</div>
                    <div className="text-sm text-gray-600">
                      No data available for progression analysis
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Log workouts to see your {exercise} progression over time!
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default StrengthProgressionSection;