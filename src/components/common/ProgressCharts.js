import React from 'react';
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
  ComposedChart
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

export default ProgressCharts;