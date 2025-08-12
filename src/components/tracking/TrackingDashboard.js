import React, { useState } from 'react';
import WeightLogger from '../weight/WeightLogger';
import StrengthProgression from '../strength/StrengthProgression';
import PersonalRecordsSidebar from '../analytics/PersonalRecordsSidebar';
import DurationAnalytics from '../analytics/DurationAnalytics';
import TrendAnalysisAlerts from '../analytics/TrendAnalysisAlerts';
import SummaryInsights from '../summaries/SummaryInsights';
import Sidebar from '../common/Sidebar';

const TrackingDashboard = ({ initialSection = 'weight', onSectionChange, onWeightSuccess }) => {
  const [activeSection, setActiveSection] = useState(initialSection);
  
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
      id: 'weight',
      name: 'Body Weight',
      icon: '⚖️',
      description: 'Track weight changes over time'
    },
    {
      id: 'duration',
      name: 'Workout Duration',
      icon: '⏱️',
      description: 'Duration analytics and trends'
    },
    {
      id: 'strength',
      name: 'Strength Progression',
      icon: '💪',
      description: 'Multi-exercise strength charts'
    },
    {
      id: 'performance',
      name: 'Personal Records',
      icon: '🏆',
      description: 'All-time PRs and achievements'
    },
    {
      id: 'trend-alerts',
      name: 'Trend Analysis',
      icon: '🔍',
      description: 'Plateau & stall detection alerts'
    },
    {
      id: 'summary-insights',
      name: 'Summary Insights',
      icon: '💡',
      description: 'Weekly/monthly key insights'
    }
  ];

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'weight':
        return <WeightLogger onSuccess={onWeightSuccess} />;
      case 'duration':
        return <DurationAnalytics userId="default-user" />;
      case 'strength':
        return <StrengthProgression />;
      case 'performance':
        return <PersonalRecordsSidebar userId="default-user" />;
      case 'trend-alerts':
        return <TrendAnalysisAlerts userId="default-user" />;
      case 'summary-insights':
        return <SummaryInsights />;
      default:
        return <WeightLogger onSuccess={onWeightSuccess} />;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-3 sm:gap-6">
      {/* Sidebar - Mobile optimized */}
      <div className="lg:w-80">
        <Sidebar 
          sections={sections}
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {renderActiveSection()}
      </div>
    </div>
  );
};

export default TrackingDashboard;