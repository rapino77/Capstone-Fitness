import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

const PRCelebration = ({ prData, onClose, visible }) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [animationPhase, setAnimationPhase] = useState('enter');
  const [sharedPlatforms, setSharedPlatforms] = useState([]);

  useEffect(() => {
    if (visible && prData) {
      setShowConfetti(true);
      setAnimationPhase('celebrate');
      
      // Auto-hide confetti after 3 seconds
      const confettiTimer = setTimeout(() => {
        setShowConfetti(false);
      }, 3000);

      return () => clearTimeout(confettiTimer);
    }
  }, [visible, prData]);

  if (!visible || !prData) return null;

  const getPRMessage = () => {
    const { exercise, weight, improvement, isNewPR, previousPR } = prData;
    
    if (isNewPR && !previousPR) {
      return `🎉 First time logging ${exercise}! Starting strong with ${weight} lbs!`;
    }
    
    if (improvement > 0) {
      return `🔥 NEW PERSONAL RECORD! ${exercise}: ${weight} lbs (+${improvement} lbs improvement!)`;
    }
    
    return `💪 Matched your PR! ${exercise}: ${weight} lbs - Keep pushing!`;
  };

  const getPRLevel = () => {
    const { improvement = 0 } = prData;
    
    if (improvement >= 50) return { level: 'LEGENDARY', color: 'from-yellow-400 via-orange-500 to-red-500', icon: '👑' };
    if (improvement >= 25) return { level: 'EPIC', color: 'from-purple-400 to-purple-600', icon: '⚡' };
    if (improvement >= 10) return { level: 'RARE', color: 'from-blue-400 to-blue-600', icon: '🌟' };
    if (improvement >= 5) return { level: 'UNCOMMON', color: 'from-green-400 to-green-600', icon: '✨' };
    return { level: 'COMMON', color: 'from-gray-400 to-gray-600', icon: '💪' };
  };

  const generateShareText = (platform) => {
    const { exercise, weight, improvement } = prData;
    const baseText = improvement > 0 
      ? `🔥 NEW PR! Just hit ${weight} lbs on ${exercise} - ${improvement} lbs improvement!` 
      : `💪 Matched my PR! ${exercise}: ${weight} lbs`;
    
    const hashtags = '#PersonalRecord #Fitness #Gym #Strength #PRAlert';
    
    switch (platform) {
      case 'twitter':
        return `${baseText} ${hashtags}`;
      case 'facebook':
        return `${baseText}\n\n${hashtags}`;
      case 'instagram':
        return `${baseText}\n.\n.\n.\n${hashtags.replace(/#/g, '#')}`;
      case 'linkedin':
        return `Just achieved a new fitness milestone! ${baseText}\n\nConsistency and dedication paying off. 💪\n\n${hashtags}`;
      default:
        return baseText;
    }
  };

  const shareToSocialMedia = (platform) => {
    const text = generateShareText(platform);
    const encodedText = encodeURIComponent(text);
    let shareUrl = '';
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodedText}`;
        break;
      case 'instagram':
        // Instagram doesn't support direct sharing, copy to clipboard instead
        navigator.clipboard.writeText(text);
        alert('Caption copied to clipboard! Open Instagram to share your achievement.');
        setSharedPlatforms([...sharedPlatforms, platform]);
        return;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent('New Personal Record!')}&summary=${encodedText}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(text);
        alert('PR celebration text copied to clipboard!');
        setSharedPlatforms([...sharedPlatforms, platform]);
        return;
      default:
        return;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes');
      setSharedPlatforms([...sharedPlatforms, platform]);
    }
  };

  const prLevel = getPRLevel();

  const socialPlatforms = [
    {
      id: 'twitter',
      name: 'Twitter',
      icon: '🐦',
      color: 'bg-blue-400 hover:bg-blue-500',
      description: 'Tweet your achievement'
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: '📘',
      color: 'bg-blue-600 hover:bg-blue-700',
      description: 'Share on Facebook'
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: '📸',
      color: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
      description: 'Copy for Instagram'
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: '💼',
      color: 'bg-blue-700 hover:bg-blue-800',
      description: 'Share professionally'
    },
    {
      id: 'copy',
      name: 'Copy Text',
      icon: '📋',
      color: 'bg-gray-600 hover:bg-gray-700',
      description: 'Copy to clipboard'
    }
  ];

  return (
    <>
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
                fontSize: `${12 + Math.random() * 8}px`,
                transform: `translateY(${window.innerHeight + 50}px)`,
              }}
            >
              {['🎉', '🎊', '⭐', '💪', '🔥', '👑', '🏆'][Math.floor(Math.random() * 7)]}
            </div>
          ))}
        </div>
      )}

      {/* Main Modal */}
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-40 p-4">
        <div 
          className={`bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-500 ${
            animationPhase === 'celebrate' ? 'scale-100 rotate-0' : 'scale-95 rotate-1'
          }`}
        >
          {/* Header with PR Level */}
          <div className={`bg-gradient-to-r ${prLevel.color} p-6 text-white rounded-t-2xl relative overflow-hidden`}>
            <div className="absolute inset-0 bg-white bg-opacity-10 animate-pulse"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-4xl animate-bounce">{prLevel.icon}</span>
                  <div>
                    <h2 className="text-2xl font-bold">{prLevel.level} ACHIEVEMENT</h2>
                    <p className="text-sm opacity-90">Personal Record Unlocked!</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-white hover:text-gray-200 text-3xl font-bold transform hover:scale-110 transition-transform"
                >
                  ×
                </button>
              </div>
              
              <div className="text-center">
                <p className="text-lg font-medium mb-2">{getPRMessage()}</p>
                <div className="text-sm opacity-90">
                  {format(new Date(), 'EEEE, MMMM d, yyyy')}
                </div>
              </div>
            </div>
          </div>

          {/* PR Details */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{prData.weight}</div>
                <div className="text-sm text-gray-600 uppercase tracking-wide">Weight (lbs)</div>
              </div>
              
              {prData.improvement > 0 && (
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">+{prData.improvement}</div>
                  <div className="text-sm text-gray-600 uppercase tracking-wide">Improvement (lbs)</div>
                </div>
              )}
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{prData.exercise}</div>
                <div className="text-sm text-gray-600 uppercase tracking-wide">Exercise</div>
              </div>
            </div>

            {/* Motivational Message */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">🎯 Keep The Momentum Going!</h3>
                <p className="text-gray-600">
                  {prData.improvement > 20 ? "Incredible progress! You're absolutely crushing your goals. This kind of improvement shows serious dedication!" :
                   prData.improvement > 10 ? "Outstanding work! This significant jump shows you're really dialing in your training. Keep it up!" :
                   prData.improvement > 5 ? "Solid progress! Consistent improvements like this are the key to long-term success." :
                   "Every PR counts! Small improvements compound into major transformations over time."}
                </p>
              </div>
            </div>

            {/* Social Media Sharing */}
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
                🌟 Share Your Achievement
              </h3>
              <p className="text-center text-gray-600 mb-6">
                Let the world know about your awesome progress!
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {socialPlatforms.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => shareToSocialMedia(platform.id)}
                    className={`${platform.color} text-white p-4 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                      sharedPlatforms.includes(platform.id) ? 'ring-4 ring-green-400' : ''
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">{platform.icon}</div>
                      <div className="text-sm font-medium">{platform.name}</div>
                      <div className="text-xs opacity-90 mt-1">{platform.description}</div>
                      {sharedPlatforms.includes(platform.id) && (
                        <div className="text-xs mt-1 bg-green-500 bg-opacity-20 rounded px-2 py-1">
                          ✅ Shared
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview Share Text */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-800 mb-2">📝 Share Preview:</h4>
              <div className="bg-white border rounded p-3 text-sm text-gray-700">
                {generateShareText('twitter')}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  // Log another workout
                  onClose();
                }}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                🔥 Log Another Workout
              </button>
              
              <button
                onClick={onClose}
                className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                ✨ Close Celebration
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PRCelebration;