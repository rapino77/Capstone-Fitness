import React, { useState } from 'react';
import WorkoutForm from './WorkoutForm';
import MobileWorkoutInterface from './MobileWorkoutInterface';
import WorkoutTemplates from '../templates/WorkoutTemplates';
import RestDayScheduler from '../scheduler/RestDayScheduler';
import WorkoutSummaries from '../summaries/WorkoutSummaries';
import Sidebar from '../common/Sidebar';

const WorkoutDashboard = ({ onSuccess, initialSection = 'log', onSectionChange }) => {
  const [activeSection, setActiveSection] = useState(initialSection);
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile screen size
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Update section when initialSection changes (from search navigation)
  React.useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);
  
  // Update parent state when section changes internally
  const handleSectionChange = (newSection) => {
    setActiveSection(newSection);
    if (onSectionChange) {
      onSectionChange(newSection);
    }
  };
  
  const sections = [
    {
      id: 'log',
      name: 'Log Workout',
      icon: '📝',
      description: 'Record your workout session'
    },
    {
      id: 'mobile',
      name: 'Mobile Workout',
      icon: '📱',
      description: 'Mobile-first workout interface'
    },
    {
      id: 'templates',
      name: 'Workout Templates',
      icon: '📋',
      description: 'Pre-built workout routines'
    },
    {
      id: 'scheduler',
      name: 'Rest Day Scheduler',
      icon: '📅',
      description: 'Plan your recovery days'
    },
    {
      id: 'summaries',
      name: 'Workout Summaries',
      icon: '📊',
      description: 'Generate and share daily workout summaries'
    },
    {
      id: 'quick-log',
      name: 'Template Quick Log',
      icon: '⚡',
      description: 'Log from templates'
    }
  ];

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'log':
        return <WorkoutForm onSuccess={onSuccess} />;
      case 'mobile':
        return <MobileWorkoutInterface onSuccess={onSuccess} />;
      case 'templates':
        return <WorkoutTemplates />;
      case 'scheduler':
        return <RestDayScheduler />;
      case 'summaries':
        return <WorkoutSummaries />;
      case 'quick-log':
        return <TemplateQuickLog onSuccess={onSuccess} />;
      default:
        return <WorkoutForm onSuccess={onSuccess} />;
    }
  };

  // On mobile, show mobile interface for workout logging by default
  if (isMobile && (activeSection === 'log' || activeSection === 'mobile')) {
    return <MobileWorkoutInterface onSuccess={onSuccess} />;
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <Sidebar 
        sections={sections}
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
      />
      
      {/* Main Content */}
      <div className="flex-1">
        {renderActiveSection()}
      </div>
    </div>
  );
};

// Template Quick Log Component
const TemplateQuickLog = ({ onSuccess }) => {
  const [selectedTemplate, setSelectedTemplate] = useState('pushPullLegs');
  const [selectedWorkout, setSelectedWorkout] = useState('push');
  const [exerciseData, setExerciseData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });

  const { workoutTemplates } = require('../../utils/workoutTemplates');
  
  const currentTemplate = workoutTemplates[selectedTemplate];
  const currentWorkout = currentTemplate?.templates[selectedWorkout];

  const handleExerciseChange = (exerciseIndex, field, value) => {
    setExerciseData(prev => ({
      ...prev,
      [`${exerciseIndex}_${field}`]: value
    }));
  };

  const handleTemplateSubmit = async () => {
    if (!currentWorkout) return;

    setIsSubmitting(true);
    setSubmitMessage({ type: '', text: '' });

    try {
      // Simulate API calls for each exercise
      const exercises = currentWorkout.exercises.filter((_, index) => {
        const weight = exerciseData[`${index}_weight`];
        const sets = exerciseData[`${index}_sets`];
        const reps = exerciseData[`${index}_reps`];
        return weight && sets && reps;
      });

      if (exercises.length === 0) {
        setSubmitMessage({ type: 'error', text: 'Please fill in at least one exercise' });
        return;
      }

      // Here you would make actual API calls to log each exercise
      // For now, we'll simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSubmitMessage({ 
        type: 'success', 
        text: `Successfully logged ${exercises.length} exercises from ${currentWorkout.name}!` 
      });
      
      // Clear form
      setExerciseData({});
      
      if (onSuccess) onSuccess();
      
    } catch (error) {
      setSubmitMessage({ 
        type: 'error', 
        text: 'Failed to log template workout' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-blue-primary rounded-lg shadow-md p-6">
      <h2 className="text-2xl section-header mb-6">Template Quick Log</h2>
      
      {/* Template Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-white mb-2">Workout Template</label>
        <select
          value={selectedTemplate}
          onChange={(e) => {
            setSelectedTemplate(e.target.value);
            setSelectedWorkout(Object.keys(workoutTemplates[e.target.value].templates)[0]);
            setExerciseData({});
          }}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black mr-4"
        >
          {Object.entries(workoutTemplates).map(([key, template]) => (
            <option key={key} value={key}>{template.name}</option>
          ))}
        </select>
        
        <select
          value={selectedWorkout}
          onChange={(e) => {
            setSelectedWorkout(e.target.value);
            setExerciseData({});
          }}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
        >
          {Object.entries(currentTemplate?.templates || {}).map(([key, workout]) => (
            <option key={key} value={key}>{workout.name}</option>
          ))}
        </select>
      </div>

      {/* Exercise Form */}
      {currentWorkout && (
        <div className="bg-white rounded-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">{currentWorkout.name}</h3>
          <p className="text-gray-600 mb-6">{currentWorkout.description}</p>
          
          <div className="space-y-6">
            {currentWorkout.exercises.map((exercise, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded-r-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-800">{exercise.name}</h4>
                    <p className="text-sm text-gray-600">
                      Suggested: {exercise.sets} sets × {exercise.reps} reps
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    exercise.priority === 'primary' ? 'bg-red-100 text-red-800' :
                    exercise.priority === 'secondary' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {exercise.priority}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sets</label>
                    <input
                      type="number"
                      placeholder={exercise.sets}
                      value={exerciseData[`${index}_sets`] || ''}
                      onChange={(e) => handleExerciseChange(index, 'sets', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reps</label>
                    <input
                      type="number"
                      placeholder={exercise.reps.split('-')[0] || '10'}
                      value={exerciseData[`${index}_reps`] || ''}
                      onChange={(e) => handleExerciseChange(index, 'reps', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight (lbs)</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="0"
                      value={exerciseData[`${index}_weight`] || ''}
                      onChange={(e) => handleExerciseChange(index, 'weight', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {submitMessage.text && (
            <div className={`p-4 rounded-md mt-6 ${
              submitMessage.type === 'success' 
                ? 'bg-green-50 text-green-800' 
                : 'bg-red-50 text-red-800'
            }`}>
              {submitMessage.text}
            </div>
          )}
          
          <button
            onClick={handleTemplateSubmit}
            disabled={isSubmitting}
            className="w-full mt-6 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Logging Workout...' : `Log ${currentWorkout.name} Workout`}
          </button>
        </div>
      )}
    </div>
  );
};

export default WorkoutDashboard;