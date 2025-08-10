import React, { useState } from 'react';
import { format } from 'date-fns';
import { workoutTemplates, getWorkoutSchedule } from '../../utils/workoutTemplates';

const WorkoutTemplates = () => {
  const [selectedTemplate, setSelectedTemplate] = useState('pushPullLegs');
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customTemplates, setCustomTemplates] = useState({});

  // Load custom templates from localStorage on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('customWorkoutTemplates');
    if (saved) {
      setCustomTemplates(JSON.parse(saved));
    }
  }, []);

  // Combine default and custom templates
  const allTemplates = { ...workoutTemplates, ...customTemplates };
  const currentTemplate = allTemplates[selectedTemplate];
  const schedule = selectedTemplate in workoutTemplates ? getWorkoutSchedule(selectedTemplate) : null;

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
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Available Templates</h3>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
            >
              + Create Custom Template
            </button>
          </div>
          <div className="flex flex-wrap gap-4">
            {Object.entries(allTemplates).map(([key, template]) => (
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
                  {key.startsWith('custom_') && (
                    <div className="text-xs text-blue-600 font-medium mt-1">Custom</div>
                  )}
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

      {/* Custom Template Creation Modal */}
      {showCreateModal && (
        <CustomTemplateCreator
          onClose={() => setShowCreateModal(false)}
          onSave={(template) => {
            const customKey = `custom_${Date.now()}`;
            const updatedCustom = { ...customTemplates, [customKey]: template };
            setCustomTemplates(updatedCustom);
            localStorage.setItem('customWorkoutTemplates', JSON.stringify(updatedCustom));
            setSelectedTemplate(customKey);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
};

// Custom Template Creator Component
const CustomTemplateCreator = ({ onClose, onSave }) => {
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState(3);
  const [workouts, setWorkouts] = useState([]);
  const [currentWorkout, setCurrentWorkout] = useState({
    name: '',
    description: '',
    primaryMuscles: [],
    exercises: []
  });
  const [showWorkoutEditor, setShowWorkoutEditor] = useState(false);

  const muscleGroups = [
    'Chest', 'Back', 'Shoulders', 'Arms', 'Biceps', 'Triceps',
    'Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Full Body'
  ];

  const exerciseCategories = ['compound', 'isolation', 'core'];
  const exercisePriorities = ['primary', 'secondary', 'accessory'];

  const addExercise = () => {
    const newExercise = {
      name: '',
      sets: 3,
      reps: '8-12',
      category: 'compound',
      priority: 'primary'
    };
    setCurrentWorkout({
      ...currentWorkout,
      exercises: [...currentWorkout.exercises, newExercise]
    });
  };

  const updateExercise = (index, field, value) => {
    const updatedExercises = [...currentWorkout.exercises];
    updatedExercises[index][field] = value;
    setCurrentWorkout({
      ...currentWorkout,
      exercises: updatedExercises
    });
  };

  const removeExercise = (index) => {
    const updatedExercises = currentWorkout.exercises.filter((_, i) => i !== index);
    setCurrentWorkout({
      ...currentWorkout,
      exercises: updatedExercises
    });
  };

  const saveWorkout = () => {
    if (currentWorkout.name && currentWorkout.exercises.length > 0) {
      const workoutKey = currentWorkout.name.toLowerCase().replace(/\s+/g, '');
      setWorkouts([...workouts, { key: workoutKey, ...currentWorkout }]);
      setCurrentWorkout({
        name: '',
        description: '',
        primaryMuscles: [],
        exercises: []
      });
      setShowWorkoutEditor(false);
    }
  };

  const saveTemplate = () => {
    if (templateName && workouts.length > 0) {
      const templatesObject = {};
      workouts.forEach(workout => {
        templatesObject[workout.key] = {
          name: workout.name,
          description: workout.description,
          primaryMuscles: workout.primaryMuscles,
          exercises: workout.exercises
        };
      });

      const template = {
        name: templateName,
        description: description,
        frequency: frequency,
        restDays: 1,
        templates: templatesObject
      };

      onSave(template);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold">Create Custom Workout Template</h3>
            <button onClick={onClose} className="text-white hover:text-gray-200 text-3xl">×</button>
          </div>
        </div>

        <div className="p-6">
          {!showWorkoutEditor ? (
            <>
              {/* Template Info */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-4">Template Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Template Name</label>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., My Custom Split"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Frequency (workouts/week)</label>
                    <input
                      type="number"
                      min="1"
                      max="7"
                      value={frequency}
                      onChange={(e) => setFrequency(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                    placeholder="Describe your workout template..."
                  />
                </div>
              </div>

              {/* Workouts List */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold">Workouts ({workouts.length})</h4>
                  <button
                    onClick={() => setShowWorkoutEditor(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    + Add Workout
                  </button>
                </div>

                {workouts.length > 0 ? (
                  <div className="space-y-3">
                    {workouts.map((workout, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-medium">{workout.name}</h5>
                            <p className="text-sm text-gray-600">{workout.description}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {workout.primaryMuscles.map((muscle, i) => (
                                <span key={i} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                  {muscle}
                                </span>
                              ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{workout.exercises.length} exercises</p>
                          </div>
                          <button
                            onClick={() => setWorkouts(workouts.filter((_, i) => i !== index))}
                            className="text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500">No workouts added yet. Click "Add Workout" to get started.</p>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTemplate}
                  disabled={!templateName || workouts.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Template
                </button>
              </div>
            </>
          ) : (
            /* Workout Editor */
            <div>
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-lg font-semibold">Add Workout</h4>
                <button
                  onClick={() => setShowWorkoutEditor(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ← Back to Template
                </button>
              </div>

              {/* Workout Info */}
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Workout Name</label>
                    <input
                      type="text"
                      value={currentWorkout.name}
                      onChange={(e) => setCurrentWorkout({...currentWorkout, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Push Day, Upper Body"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <input
                    type="text"
                    value={currentWorkout.description}
                    onChange={(e) => setCurrentWorkout({...currentWorkout, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Chest, Shoulders, Triceps"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Primary Muscle Groups</label>
                  <div className="flex flex-wrap gap-2">
                    {muscleGroups.map(muscle => (
                      <button
                        key={muscle}
                        onClick={() => {
                          const muscles = currentWorkout.primaryMuscles.includes(muscle)
                            ? currentWorkout.primaryMuscles.filter(m => m !== muscle)
                            : [...currentWorkout.primaryMuscles, muscle];
                          setCurrentWorkout({...currentWorkout, primaryMuscles: muscles});
                        }}
                        className={`px-3 py-1 text-sm rounded-full transition-colors ${
                          currentWorkout.primaryMuscles.includes(muscle)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {muscle}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Exercises */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h5 className="font-medium">Exercises ({currentWorkout.exercises.length})</h5>
                  <button
                    onClick={addExercise}
                    className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
                  >
                    + Add Exercise
                  </button>
                </div>

                <div className="space-y-4">
                  {currentWorkout.exercises.map((exercise, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                        <input
                          type="text"
                          placeholder="Exercise name"
                          value={exercise.name}
                          onChange={(e) => updateExercise(index, 'name', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            placeholder="Sets"
                            min="1"
                            value={exercise.sets}
                            onChange={(e) => updateExercise(index, 'sets', Number(e.target.value))}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            placeholder="Reps"
                            value={exercise.reps}
                            onChange={(e) => updateExercise(index, 'reps', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <button
                          onClick={() => removeExercise(index)}
                          className="text-red-500 hover:text-red-700 justify-self-end"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <select
                          value={exercise.category}
                          onChange={(e) => updateExercise(index, 'category', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {exerciseCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <select
                          value={exercise.priority}
                          onChange={(e) => updateExercise(index, 'priority', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {exercisePriorities.map(pri => (
                            <option key={pri} value={pri}>{pri}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save Workout */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowWorkoutEditor(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveWorkout}
                  disabled={!currentWorkout.name || currentWorkout.exercises.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Workout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkoutTemplates;