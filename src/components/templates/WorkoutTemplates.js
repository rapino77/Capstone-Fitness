import React, { useState } from 'react';
import { format } from 'date-fns';
import { workoutTemplates, getWorkoutSchedule } from '../../utils/workoutTemplates';

const WorkoutTemplates = () => {
  const [selectedTemplate, setSelectedTemplate] = useState('pushPullLegs');
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [showSchedule, setShowSchedule] = useState(false);

  const currentTemplate = workoutTemplates[selectedTemplate];
  const schedule = getWorkoutSchedule(selectedTemplate);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'primary': return 'border-l-red-500 bg-red-50';
      case 'secondary': return 'border-l-yellow-500 bg-yellow-50';
      case 'accessory': return 'border-l-blue-500 bg-blue-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'compound': return '🏋️';
      case 'isolation': return '💪';
      case 'core': return '🔥';
      default: return '⚡';
    }
  };

  return (
    <div className="bg-blue-primary rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl section-header mb-4">Workout Templates</h2>
        
        {/* Template Selection */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-4">
            {Object.entries(workoutTemplates).map(([key, template]) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedTemplate(key);
                  setSelectedWorkout(null);
                }}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  selectedTemplate === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="text-left">
                  <div className="font-semibold">{template.name}</div>
                  <div className="text-xs opacity-75">{template.frequency}x per week</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Template Description */}
        <div className="bg-white bg-opacity-10 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">{currentTemplate.name}</h3>
          <p className="text-gray-200 mb-3">{currentTemplate.description}</p>
          <div className="flex items-center space-x-4 text-sm text-gray-300">
            <span>📅 {currentTemplate.frequency} workouts/week</span>
            <span>😴 {currentTemplate.restDays} rest day between sessions</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setShowSchedule(!showSchedule)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            {showSchedule ? 'Hide Schedule' : 'View 4-Week Schedule'}
          </button>
        </div>
      </div>

      {/* Workout Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {Object.entries(currentTemplate.templates).map(([key, workout]) => (
          <div key={key} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-blue-600 text-white p-4">
              <h4 className="text-lg font-semibold">{workout.name}</h4>
              <p className="text-blue-100 text-sm">{workout.description}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {workout.primaryMuscles.map((muscle, index) => (
                  <span key={index} className="bg-blue-500 text-xs px-2 py-1 rounded-full">
                    {muscle}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="p-4">
              <div className="space-y-3">
                {workout.exercises.map((exercise, index) => (
                  <div
                    key={index}
                    className={`border-l-4 pl-3 py-2 ${getPriorityColor(exercise.priority)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span>{getCategoryIcon(exercise.category)}</span>
                        <span className="font-medium text-gray-800">{exercise.name}</span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {exercise.sets} × {exercise.reps}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => setSelectedWorkout(selectedWorkout === key ? null : key)}
                className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                {selectedWorkout === key ? 'Hide Details' : 'View Exercise Details'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Exercise Details Modal */}
      {selectedWorkout && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">
              {currentTemplate.templates[selectedWorkout].name} - Exercise Guide
            </h3>
            <button
              onClick={() => setSelectedWorkout(null)}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
          
          <div className="grid gap-4">
            {currentTemplate.templates[selectedWorkout].exercises.map((exercise, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getCategoryIcon(exercise.category)}</span>
                    <h4 className="font-semibold text-gray-800">{exercise.name}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      exercise.priority === 'primary' ? 'bg-red-100 text-red-800' :
                      exercise.priority === 'secondary' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {exercise.priority}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>{exercise.sets} sets × {exercise.reps} reps</strong>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  <p><strong>Category:</strong> {exercise.category}</p>
                  <p><strong>Focus:</strong> {
                    exercise.priority === 'primary' ? 'Main movement - heavy weight, lower reps' :
                    exercise.priority === 'secondary' ? 'Supporting movement - moderate weight' :
                    'Accessory movement - higher reps, muscle isolation'
                  }</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4-Week Schedule */}
      {showSchedule && schedule && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            4-Week {currentTemplate.name} Schedule
          </h3>
          
          <div className="space-y-6">
            {schedule.schedule.map((week) => (
              <div key={week.week} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-4 py-2">
                  <h4 className="font-semibold text-gray-800">Week {week.week}</h4>
                </div>
                
                <div className="p-4">
                  <div className="grid grid-cols-7 gap-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                      <div key={day} className="text-center text-xs font-medium text-gray-600 mb-2">
                        {day}
                      </div>
                    ))}
                    
                    {week.days.map((day, index) => (
                      <div key={index} className={`p-2 rounded text-center text-xs ${
                        day.type === 'rest' 
                          ? 'bg-gray-100 text-gray-600' 
                          : 'bg-blue-100 text-blue-800 font-medium'
                      }`}>
                        <div className="font-medium">{format(day.date, 'MMM d')}</div>
                        <div className="mt-1">
                          {day.type === 'rest' ? '😴 Rest' : day.template?.name || day.type}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">💡 Schedule Tips:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Rest days are crucial for muscle recovery and growth</li>
              <li>• Listen to your body - add extra rest if needed</li>
              <li>• Consistency over time beats perfect execution occasionally</li>
              <li>• Track your workouts to monitor progress and adjust weights</li>
            </ul>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-white bg-opacity-10 rounded-lg p-4">
        <h4 className="text-white font-medium mb-3">Exercise Priority Legend:</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-gray-200"><strong>Primary:</strong> Main compound movements</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-gray-200"><strong>Secondary:</strong> Supporting exercises</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-gray-200"><strong>Accessory:</strong> Isolation movements</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkoutTemplates;