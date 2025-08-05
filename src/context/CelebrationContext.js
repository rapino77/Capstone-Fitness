import React, { createContext, useContext, useState } from 'react';
import CelebrationSystem, { celebrateMilestone, celebrateGoalCompletion } from '../components/common/CelebrationSystem';

const CelebrationContext = createContext();

export const useCelebration = () => {
  const context = useContext(CelebrationContext);
  if (!context) {
    throw new Error('useCelebration must be used within a CelebrationProvider');
  }
  return context;
};

export const CelebrationProvider = ({ children }) => {
  const [celebration, setCelebration] = useState(null);

  const celebrate = (type, data, duration = 5000) => {
    console.log('🎉 Global celebration triggered:', { type, data });
    setCelebration({ type, data, duration, show: true });
  };

  const closeCelebration = () => {
    setCelebration(null);
  };

  // Helper functions for easy milestone celebrations
  const celebrateMilestoneGlobal = (goalTitle, milestone, progress) => {
    const celebrationData = celebrateMilestone(goalTitle, milestone, progress);
    celebrate(celebrationData.type, celebrationData.data);
  };

  const celebrateGoalCompletionGlobal = (goalTitle, totalDays) => {
    const celebrationData = celebrateGoalCompletion(goalTitle, totalDays);
    celebrate(celebrationData.type, celebrationData.data);
  };

  return (
    <CelebrationContext.Provider value={{
      celebration,
      celebrate,
      closeCelebration,
      celebrateMilestone: celebrateMilestoneGlobal,
      celebrateGoalCompletion: celebrateGoalCompletionGlobal
    }}>
      {children}
      
      {/* Global celebration overlay */}
      {celebration && (
        <CelebrationSystem
          show={celebration.show}
          type={celebration.type}
          data={celebration.data}
          onClose={closeCelebration}
          duration={celebration.duration}
        />
      )}
    </CelebrationContext.Provider>
  );
};

export default CelebrationContext;