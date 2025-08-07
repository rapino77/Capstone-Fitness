import React, { useState } from 'react';
import WeightLogger from '../weight/WeightLogger';
import StrengthProgression from '../strength/StrengthProgression';
import Sidebar from '../common/Sidebar';

const TrackingDashboard = () => {
  const [activeSection, setActiveSection] = useState('weight');
  
  const sections = [
    {
      id: 'weight',
      name: 'Body Weight',
      icon: '⚖️',
      description: 'Track weight changes over time'
    },
    {
      id: 'strength',
      name: 'Strength Progression',
      icon: '💪',
      description: 'Multi-exercise strength charts'
    },
    {
      id: 'volume',
      name: 'Training Volume',
      icon: '📈',
      description: 'Weekly volume analysis'
    },
    {
      id: 'performance',
      name: 'Performance Metrics',
      icon: '🎯',
      description: 'PRs and improvements'
    },
    {
      id: 'body-composition',
      name: 'Body Composition',
      icon: '📊',
      description: 'Measurements & ratios'
    }
  ];

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'weight':
        return <WeightLogger />;
      case 'strength':
        return <StrengthProgression />;
      case 'volume':
        return <ComingSoonPlaceholder title="Training Volume Analysis" />;
      case 'performance':
        return <ComingSoonPlaceholder title="Performance Metrics Dashboard" />;
      case 'body-composition':
        return <ComingSoonPlaceholder title="Body Composition Tracker" />;
      default:
        return <WeightLogger />;
    }
  };

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <Sidebar 
        sections={sections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      
      {/* Main Content */}
      <div className="flex-1">
        {renderActiveSection()}
      </div>
    </div>
  );
};

const ComingSoonPlaceholder = ({ title }) => {
  return (
    <div className="bg-blue-primary rounded-lg shadow-md p-6">
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🚧</div>
        <h2 className="text-2xl section-header mb-4">{title}</h2>
        <p className="text-white text-lg mb-6">This feature is coming soon!</p>
        <div className="bg-blue-600 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-lg font-semibold text-white mb-3">What to Expect:</h3>
          <ul className="text-blue-100 text-sm space-y-2 text-left">
            {title.includes('Volume') && (
              <>
                <li>• Weekly and monthly volume tracking</li>
                <li>• Exercise-specific volume trends</li>
                <li>• Progressive overload analysis</li>
                <li>• Recovery and adaptation insights</li>
              </>
            )}
            {title.includes('Performance') && (
              <>
                <li>• Personal record tracking</li>
                <li>• Strength ratio analysis</li>
                <li>• Performance prediction models</li>
                <li>• Comparative benchmarking</li>
              </>
            )}
            {title.includes('Composition') && (
              <>
                <li>• Body measurements tracking</li>
                <li>• Body fat percentage estimates</li>
                <li>• Muscle mass calculations</li>
                <li>• Progress photos integration</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TrackingDashboard;