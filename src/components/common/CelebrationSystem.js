import React, { useState, useEffect, useCallback } from 'react';

const CelebrationSystem = ({ 
  show, 
  type = 'milestone', 
  data = {}, 
  onClose,
  duration = 5000 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClose = useCallback(() => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setIsAnimating(true);
      
      // Play celebration sound effect (if supported)
      try {
        const celebrationSound = new Audio();
        celebrationSound.volume = 0.3;
        
        // Different sounds for different milestones
        if (type === 'milestone' && data.milestone) {
          if (data.milestone === 100) {
            // Victory sound for completion
            celebrationSound.src = 'data:audio/wav;base64,UklGRvQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YdADAAA=';
          } else {
            // Achievement sound for milestones
            celebrationSound.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YdADAAA=';
          }
          celebrationSound.play().catch(() => {
            // Silently fail if audio isn't supported
          });
        }
      } catch (error) {
        // Silently fail if audio isn't supported
      }
      
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, handleClose, type, data.milestone]);

  if (!isVisible) return null;

  const getCelebrationContent = () => {
    switch (type) {
      case 'milestone':
        // Use custom configuration if available, otherwise default
        if (data.customConfig) {
          return {
            emoji: data.customConfig.emoji,
            title: data.customConfig.title,
            message: data.customConfig.message,
            color: data.customConfig.color,
            confetti: true
          };
        }
        return {
          emoji: '🎯',
          title: 'Milestone Achieved!',
          message: `You've reached ${data.milestone}% of your goal: "${data.goalTitle}"`,
          color: 'bg-gradient-to-r from-blue-500 to-purple-600',
          confetti: true
        };
      
      case 'goal_completed':
        return {
          emoji: '🏆',
          title: 'Goal Completed!',
          message: `Congratulations! You've achieved your goal: "${data.goalTitle}"`,
          color: 'bg-gradient-to-r from-green-500 to-emerald-600',
          confetti: true
        };
      
      case 'personal_record':
        return {
          emoji: '💪',
          title: 'New Personal Record!',
          message: `${data.exercise}: ${data.newPR} lbs (+${data.improvement} lbs improvement!)`,
          color: 'bg-gradient-to-r from-yellow-500 to-orange-600',
          confetti: true
        };
      
      case 'streak':
        return {
          emoji: '🔥',
          title: 'Workout Streak!',
          message: `${data.days} days in a row! Keep the momentum going!`,
          color: 'bg-gradient-to-r from-red-500 to-pink-600',
          confetti: false
        };
      
      case 'level_up':
        return {
          emoji: '⭐',
          title: 'Level Up!',
          message: `You've reached fitness level ${data.level}! Amazing progress!`,
          color: 'bg-gradient-to-r from-indigo-500 to-blue-600',
          confetti: true
        };
      
      default:
        return {
          emoji: '🎉',
          title: 'Achievement Unlocked!',
          message: data.message || 'Great job on your fitness journey!',
          color: 'bg-gradient-to-r from-purple-500 to-pink-600',
          confetti: true
        };
    }
  };

  const content = getCelebrationContent();

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
          isAnimating ? 'bg-black bg-opacity-50' : 'bg-transparent'
        }`}
        onClick={handleClose}
      >
        {/* Celebration Modal */}
        <div 
          className={`relative max-w-md w-full mx-4 rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-500 ${
            isAnimating ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
          } ${content.color}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Confetti Effect */}
          {content.confetti && <ConfettiRain milestone={data.milestone} />}
          
          {/* Content */}
          <div className="relative z-10 p-8 text-center text-white">
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 flex items-center justify-center transition-colors"
            >
              <span className="text-white text-lg">×</span>
            </button>

            {/* Emoji with Animation */}
            <div className={`text-6xl mb-4 transform transition-transform duration-700 ${
              isAnimating ? 'scale-100 rotate-0' : 'scale-0 rotate-180'
            }`}>
              {content.emoji}
            </div>

            {/* Title */}
            <h2 className={`text-2xl font-bold mb-3 transform transition-all duration-500 delay-200 ${
              isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}>
              {content.title}
            </h2>

            {/* Message */}
            <p className={`text-lg mb-6 transform transition-all duration-500 delay-300 ${
              isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}>
              {content.message}
            </p>

            {/* Additional Stats or Details */}
            {(data.stats || data.progress !== undefined) && (
              <div className={`bg-white bg-opacity-20 rounded-lg p-4 mb-6 transform transition-all duration-500 delay-400 ${
                isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              }`}>
                {data.progress !== undefined && (
                  <div className="mb-2">
                    <div className="text-sm opacity-90 mb-1">Progress</div>
                    <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
                      <div
                        className="bg-white rounded-full h-2 transition-all duration-1000 delay-500"
                        style={{ width: `${Math.min(data.progress, 100)}%` }}
                      />
                    </div>
                    <div className="text-sm opacity-90 mt-1">{data.progress?.toFixed(1)}%</div>
                  </div>
                )}
                
                {data.stats && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {Object.entries(data.stats).map(([key, value]) => (
                      <div key={key} className="text-center">
                        <div className="font-semibold">{value}</div>
                        <div className="opacity-90 capitalize">{key.replace('_', ' ')}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className={`flex space-x-3 transform transition-all duration-500 delay-500 ${
              isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}>
              {data.shareMessage && (
                <button
                  onClick={() => handleShare(data.shareMessage)}
                  className="flex-1 bg-white bg-opacity-20 hover:bg-opacity-30 py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  Share Achievement
                </button>
              )}
              <button
                onClick={handleClose}
                className="flex-1 bg-white bg-opacity-20 hover:bg-opacity-30 py-2 px-4 rounded-lg font-medium transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Confetti Animation Component
const ConfettiRain = ({ milestone }) => {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    // Different confetti patterns based on milestone
    const getConfettiConfig = (milestone) => {
      switch (milestone) {
        case 25:
          return {
            count: 30,
            colors: ['#10B981', '#34D399', '#6EE7B7'], // Green tones
            shapes: ['circle']
          };
        case 50:
          return {
            count: 40,
            colors: ['#F59E0B', '#FBBF24', '#FCD34D'], // Orange/yellow tones
            shapes: ['circle', 'square']
          };
        case 75:
          return {
            count: 50,
            colors: ['#8B5CF6', '#A78BFA', '#C4B5FD'], // Purple tones
            shapes: ['circle', 'square', 'triangle']
          };
        case 100:
          return {
            count: 80,
            colors: ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#1E90FF', '#FF1493'], // Rainbow
            shapes: ['circle', 'square', 'triangle', 'star']
          };
        default:
          return {
            count: 50,
            colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'],
            shapes: ['circle']
          };
      }
    };

    const config = getConfettiConfig(milestone);
    
    const confettiPieces = Array.from({ length: config.count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDelay: Math.random() * 3,
      animationDuration: 3 + Math.random() * 2,
      color: config.colors[Math.floor(Math.random() * config.colors.length)],
      shape: config.shapes[Math.floor(Math.random() * config.shapes.length)]
    }));
    setPieces(confettiPieces);
  }, [milestone]);

  const getShapeStyle = (shape) => {
    switch (shape) {
      case 'square':
        return { borderRadius: '0' };
      case 'triangle':
        return {
          width: 0,
          height: 0,
          backgroundColor: 'transparent',
          borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent',
          borderBottom: '8px solid'
        };
      case 'star':
        return {
          clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
        };
      default: // circle
        return { borderRadius: '50%' };
    }
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute w-2 h-2 opacity-80"
          style={{
            left: `${piece.left}%`,
            backgroundColor: piece.shape === 'triangle' ? 'transparent' : piece.color,
            borderBottomColor: piece.shape === 'triangle' ? piece.color : 'transparent',
            animation: `confetti-fall ${piece.animationDuration}s ${piece.animationDelay}s ease-out infinite`,
            ...getShapeStyle(piece.shape)
          }}
        />
      ))}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

// Helper function for sharing
const handleShare = (message) => {
  if (navigator.share) {
    navigator.share({
      title: 'Fitness Achievement!',
      text: message,
      url: window.location.href,
    }).catch(console.error);
  } else {
    // Fallback to clipboard
    navigator.clipboard.writeText(message).then(() => {
      alert('Achievement copied to clipboard!');
    }).catch(() => {
      // Final fallback - show the message in an alert
      alert(`Share this achievement: ${message}`);
    });
  }
};

// Celebration trigger hook for easy usage
export const useCelebration = () => {
  const [celebration, setCelebration] = useState(null);

  const celebrate = (type, data, duration = 5000) => {
    setCelebration({ type, data, duration, show: true });
  };

  const closeCelebration = () => {
    setCelebration(null);
  };

  return {
    celebration,
    celebrate,
    closeCelebration
  };
};

// Predefined celebration triggers
export const celebrateMilestone = (goalTitle, milestone, progress) => {
  // Customize celebration based on milestone level
  const milestoneConfig = {
    25: {
      emoji: '🌟',
      title: 'Quarter Way There!',
      message: `Great start! You've reached ${milestone}% of your goal: "${goalTitle}"`,
      color: 'bg-gradient-to-r from-green-400 to-green-600',
      shareMessage: `🌟 Quarter milestone reached! ${milestone}% of my fitness goal: "${goalTitle}"! #FitnessGoals #Progress`
    },
    50: {
      emoji: '🔥',
      title: 'Halfway Champion!',
      message: `Amazing progress! You're halfway to your goal: "${goalTitle}"`,
      color: 'bg-gradient-to-r from-orange-400 to-orange-600',
      shareMessage: `🔥 Halfway there! ${milestone}% of my fitness goal: "${goalTitle}"! #FitnessGoals #Progress`
    },
    75: {
      emoji: '⚡',
      title: 'Almost There!',
      message: `Incredible! You've reached ${milestone}% of your goal: "${goalTitle}"`,
      color: 'bg-gradient-to-r from-purple-400 to-purple-600',
      shareMessage: `⚡ ${milestone}% complete! Almost achieved my fitness goal: "${goalTitle}"! #FitnessGoals #Progress`
    },
    100: {
      emoji: '🏆',
      title: 'Goal Completed!',
      message: `Congratulations! You've achieved your goal: "${goalTitle}"`,
      color: 'bg-gradient-to-r from-yellow-400 to-yellow-600',
      shareMessage: `🏆 Goal achieved! Just completed: "${goalTitle}" #FitnessGoals #Achievement`
    }
  };

  const config = milestoneConfig[milestone] || milestoneConfig[25];

  return {
    type: 'milestone',
    data: {
      goalTitle,
      milestone,
      progress,
      customConfig: config,
      shareMessage: config.shareMessage
    }
  };
};

export const celebrateGoalCompletion = (goalTitle, totalDays) => ({
  type: 'goal_completed',
  data: {
    goalTitle,
    stats: {
      total_days: totalDays,
      goal_type: 'Completed'
    },
    shareMessage: `🏆 Goal achieved! Just completed: "${goalTitle}" #FitnessGoals #Achievement`
  }
});

export const celebratePersonalRecord = (exercise, newPR, improvement, previousPR) => ({
  type: 'personal_record',
  data: {
    exercise,
    newPR,
    improvement,
    stats: {
      previous_pr: `${previousPR} lbs`,
      new_pr: `${newPR} lbs`
    },
    shareMessage: `💪 New PR! ${exercise}: ${newPR} lbs (+${improvement} lbs improvement!) #PersonalRecord #Strength`
  }
});

export const celebrateStreak = (days, workoutType = 'workout') => ({
  type: 'streak',
  data: {
    days,
    workoutType,
    shareMessage: `🔥 ${days} day ${workoutType} streak! Consistency is key! #FitnessStreak #Consistency`
  }
});

export default CelebrationSystem;