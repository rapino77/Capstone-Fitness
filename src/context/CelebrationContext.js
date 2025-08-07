import React, { createContext, useContext, useState } from 'react';
import CelebrationSystem, { celebrateMilestone, celebrateGoalCompletion } from '../components/common/CelebrationSystem';
import PRCelebration from '../components/celebrations/PRCelebration';

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
  const [prCelebration, setPRCelebration] = useState(null);

  const celebrate = (type, data, duration = 5000) => {
    console.log('🎉 Global celebration triggered:', { type, data });
    setCelebration({ type, data, duration, show: true });
  };

  const celebratePR = (prData) => {
    console.log('🔥 PR Celebration triggered:', prData);
    setPRCelebration({ prData, show: true });
  };

  const closeCelebration = () => {
    setCelebration(null);
  };

  const closePRCelebration = () => {
    setPRCelebration(null);
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
      prCelebration,
      celebrate,
      celebratePR,
      closeCelebration,
      closePRCelebration,
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

      {/* PR Celebration overlay */}
      {prCelebration && (
        <PRCelebration
          prData={prCelebration.prData}
          visible={prCelebration.show}
          onClose={closePRCelebration}
        />
      )}
    </CelebrationContext.Provider>
  );
};

export default CelebrationContext;