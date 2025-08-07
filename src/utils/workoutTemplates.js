export const workoutTemplates = {
  pushPullLegs: {
    name: "Push/Pull/Legs",
    description: "Classic 3-day split focusing on movement patterns",
    frequency: 3,
    restDays: 1,
    templates: {
      push: {
        name: "Push Day",
        description: "Chest, Shoulders, Triceps",
        primaryMuscles: ["Chest", "Shoulders", "Triceps"],
        exercises: [
          { name: "Bench Press", sets: 4, reps: "6-8", category: "compound", priority: "primary" },
          { name: "Overhead Press", sets: 3, reps: "8-10", category: "compound", priority: "primary" },
          { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", category: "isolation", priority: "secondary" },
          { name: "Lateral Raises", sets: 3, reps: "12-15", category: "isolation", priority: "secondary" },
          { name: "Dips", sets: 3, reps: "8-12", category: "compound", priority: "secondary" },
          { name: "Tricep Extensions", sets: 3, reps: "12-15", category: "isolation", priority: "accessory" },
          { name: "Close-Grip Bench Press", sets: 3, reps: "10-12", category: "compound", priority: "accessory" }
        ]
      },
      pull: {
        name: "Pull Day",
        description: "Back, Biceps, Rear Delts",
        primaryMuscles: ["Back", "Biceps", "Rear Delts"],
        exercises: [
          { name: "Deadlift", sets: 4, reps: "5-6", category: "compound", priority: "primary" },
          { name: "Pull-ups", sets: 4, reps: "6-10", category: "compound", priority: "primary" },
          { name: "Bent Over Row", sets: 3, reps: "8-10", category: "compound", priority: "secondary" },
          { name: "Cable Rows", sets: 3, reps: "10-12", category: "compound", priority: "secondary" },
          { name: "Lat Pulldowns", sets: 3, reps: "10-12", category: "compound", priority: "secondary" },
          { name: "Bicep Curls", sets: 3, reps: "12-15", category: "isolation", priority: "accessory" },
          { name: "Face Pulls", sets: 3, reps: "15-20", category: "isolation", priority: "accessory" }
        ]
      },
      legs: {
        name: "Legs Day",
        description: "Quads, Hamstrings, Glutes, Calves",
        primaryMuscles: ["Quadriceps", "Hamstrings", "Glutes", "Calves"],
        exercises: [
          { name: "Squat", sets: 4, reps: "6-8", category: "compound", priority: "primary" },
          { name: "Romanian Deadlift", sets: 3, reps: "8-10", category: "compound", priority: "primary" },
          { name: "Leg Press", sets: 3, reps: "12-15", category: "compound", priority: "secondary" },
          { name: "Walking Lunges", sets: 3, reps: "12-15", category: "compound", priority: "secondary" },
          { name: "Leg Curls", sets: 3, reps: "12-15", category: "isolation", priority: "secondary" },
          { name: "Calf Raises", sets: 4, reps: "15-20", category: "isolation", priority: "accessory" },
          { name: "Leg Extensions", sets: 3, reps: "15-20", category: "isolation", priority: "accessory" }
        ]
      }
    }
  },
  upperLower: {
    name: "Upper/Lower",
    description: "4-day split alternating upper and lower body",
    frequency: 4,
    restDays: 1,
    templates: {
      upper: {
        name: "Upper Body",
        description: "Chest, Back, Shoulders, Arms",
        primaryMuscles: ["Chest", "Back", "Shoulders", "Arms"],
        exercises: [
          { name: "Bench Press", sets: 4, reps: "6-8", category: "compound", priority: "primary" },
          { name: "Bent Over Row", sets: 4, reps: "6-8", category: "compound", priority: "primary" },
          { name: "Overhead Press", sets: 3, reps: "8-10", category: "compound", priority: "secondary" },
          { name: "Pull-ups", sets: 3, reps: "8-12", category: "compound", priority: "secondary" },
          { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", category: "isolation", priority: "secondary" },
          { name: "Cable Rows", sets: 3, reps: "10-12", category: "compound", priority: "secondary" },
          { name: "Lateral Raises", sets: 3, reps: "12-15", category: "isolation", priority: "accessory" },
          { name: "Bicep Curls", sets: 3, reps: "12-15", category: "isolation", priority: "accessory" },
          { name: "Tricep Extensions", sets: 3, reps: "12-15", category: "isolation", priority: "accessory" }
        ]
      },
      lower: {
        name: "Lower Body",
        description: "Quads, Hamstrings, Glutes, Calves",
        primaryMuscles: ["Quadriceps", "Hamstrings", "Glutes", "Calves"],
        exercises: [
          { name: "Squat", sets: 4, reps: "6-8", category: "compound", priority: "primary" },
          { name: "Romanian Deadlift", sets: 4, reps: "6-8", category: "compound", priority: "primary" },
          { name: "Bulgarian Split Squats", sets: 3, reps: "10-12", category: "compound", priority: "secondary" },
          { name: "Leg Press", sets: 3, reps: "12-15", category: "compound", priority: "secondary" },
          { name: "Leg Curls", sets: 3, reps: "12-15", category: "isolation", priority: "secondary" },
          { name: "Walking Lunges", sets: 3, reps: "12-15", category: "compound", priority: "secondary" },
          { name: "Calf Raises", sets: 4, reps: "15-20", category: "isolation", priority: "accessory" },
          { name: "Leg Extensions", sets: 3, reps: "15-20", category: "isolation", priority: "accessory" }
        ]
      }
    }
  },
  fullBody: {
    name: "Full Body",
    description: "Total body workout 3x per week",
    frequency: 3,
    restDays: 1,
    templates: {
      fullbody: {
        name: "Full Body Workout",
        description: "Complete body compound movements",
        primaryMuscles: ["Full Body"],
        exercises: [
          { name: "Squat", sets: 3, reps: "8-10", category: "compound", priority: "primary" },
          { name: "Bench Press", sets: 3, reps: "8-10", category: "compound", priority: "primary" },
          { name: "Bent Over Row", sets: 3, reps: "8-10", category: "compound", priority: "primary" },
          { name: "Overhead Press", sets: 3, reps: "10-12", category: "compound", priority: "secondary" },
          { name: "Romanian Deadlift", sets: 3, reps: "10-12", category: "compound", priority: "secondary" },
          { name: "Pull-ups", sets: 3, reps: "8-12", category: "compound", priority: "secondary" },
          { name: "Dips", sets: 3, reps: "10-15", category: "compound", priority: "accessory" },
          { name: "Plank", sets: 3, reps: "30-60s", category: "core", priority: "accessory" }
        ]
      }
    }
  }
};

export const getWorkoutSchedule = (templateType, startDate = new Date()) => {
  const template = workoutTemplates[templateType];
  if (!template) return null;

  const schedule = [];
  const currentDate = new Date(startDate);
  
  // Generate 4 weeks of schedule
  for (let week = 0; week < 4; week++) {
    const weekSchedule = [];
    
    if (templateType === 'pushPullLegs') {
      // PPL: Push, Rest, Pull, Rest, Legs, Rest, Rest
      const pplPattern = ['push', 'rest', 'pull', 'rest', 'legs', 'rest', 'rest'];
      
      for (let day = 0; day < 7; day++) {
        const date = new Date(currentDate);
        date.setDate(currentDate.getDate() + (week * 7) + day);
        
        weekSchedule.push({
          date,
          type: pplPattern[day],
          template: pplPattern[day] !== 'rest' ? template.templates[pplPattern[day]] : null
        });
      }
    } else if (templateType === 'upperLower') {
      // Upper/Lower: Upper, Rest, Lower, Upper, Rest, Lower, Rest
      const ulPattern = ['upper', 'rest', 'lower', 'upper', 'rest', 'lower', 'rest'];
      
      for (let day = 0; day < 7; day++) {
        const date = new Date(currentDate);
        date.setDate(currentDate.getDate() + (week * 7) + day);
        
        weekSchedule.push({
          date,
          type: ulPattern[day],
          template: ulPattern[day] !== 'rest' ? template.templates[ulPattern[day]] : null
        });
      }
    } else if (templateType === 'fullBody') {
      // Full Body: Workout, Rest, Workout, Rest, Workout, Rest, Rest
      const fbPattern = ['fullbody', 'rest', 'fullbody', 'rest', 'fullbody', 'rest', 'rest'];
      
      for (let day = 0; day < 7; day++) {
        const date = new Date(currentDate);
        date.setDate(currentDate.getDate() + (week * 7) + day);
        
        weekSchedule.push({
          date,
          type: fbPattern[day],
          template: fbPattern[day] !== 'rest' ? template.templates[fbPattern[day]] : null
        });
      }
    }
    
    schedule.push({
      week: week + 1,
      days: weekSchedule
    });
  }
  
  return {
    template,
    schedule
  };
};

export const analyzeWorkoutFrequency = (workoutData, daysBack = 30) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  
  const recentWorkouts = workoutData.filter(workout => {
    const workoutDate = new Date(workout.date || workout.Date);
    return workoutDate >= cutoffDate;
  });
  
  if (recentWorkouts.length === 0) {
    return {
      frequency: 0,
      averageRest: 0,
      consistency: 0,
      recommendation: "Start with 3 workouts per week with 1 rest day between sessions"
    };
  }
  
  // Calculate workout frequency per week
  const weeksAnalyzed = daysBack / 7;
  const frequency = recentWorkouts.length / weeksAnalyzed;
  
  // Calculate average rest days between workouts
  const workoutDates = recentWorkouts.map(w => new Date(w.date || w.Date)).sort((a, b) => a - b);
  let totalRestDays = 0;
  
  for (let i = 1; i < workoutDates.length; i++) {
    const daysBetween = (workoutDates[i] - workoutDates[i-1]) / (1000 * 60 * 60 * 24);
    totalRestDays += Math.max(0, daysBetween - 1);
  }
  
  const averageRest = workoutDates.length > 1 ? totalRestDays / (workoutDates.length - 1) : 0;
  
  // Calculate consistency (how evenly distributed are workouts)
  const consistency = calculateConsistency(workoutDates, daysBack);
  
  // Generate recommendations
  let recommendation = "";
  let suggestedTemplate = "";
  
  if (frequency < 2) {
    recommendation = "Consider increasing frequency to 3x per week for better results";
    suggestedTemplate = "fullBody";
  } else if (frequency >= 2 && frequency < 4) {
    recommendation = "Great frequency! Perfect for Full Body or Push/Pull/Legs split";
    suggestedTemplate = frequency >= 3 ? "pushPullLegs" : "fullBody";
  } else if (frequency >= 4 && frequency < 6) {
    recommendation = "High frequency! Upper/Lower split would work well";
    suggestedTemplate = "upperLower";
  } else {
    recommendation = "Very high frequency! Consider more rest days to prevent overtraining";
    suggestedTemplate = "upperLower";
  }
  
  return {
    frequency: Math.round(frequency * 10) / 10,
    averageRest: Math.round(averageRest * 10) / 10,
    consistency: Math.round(consistency),
    recommendation,
    suggestedTemplate,
    totalWorkouts: recentWorkouts.length,
    daysAnalyzed: daysBack
  };
};

const calculateConsistency = (workoutDates, totalDays) => {
  if (workoutDates.length < 2) return 0;
  
  // Calculate ideal spacing
  const idealSpacing = totalDays / workoutDates.length;
  
  // Calculate actual spacings
  const spacings = [];
  for (let i = 1; i < workoutDates.length; i++) {
    const spacing = (workoutDates[i] - workoutDates[i-1]) / (1000 * 60 * 60 * 24);
    spacings.push(spacing);
  }
  
  // Calculate variance from ideal
  const variance = spacings.reduce((sum, spacing) => {
    return sum + Math.pow(spacing - idealSpacing, 2);
  }, 0) / spacings.length;
  
  // Convert to consistency score (0-100, where 100 is perfectly consistent)
  const maxVariance = Math.pow(totalDays, 2);
  return Math.max(0, 100 - (variance / maxVariance) * 100);
};

export const getRestDayRecommendations = (frequency, averageRest, consistency) => {
  const recommendations = [];
  
  if (averageRest < 0.5) {
    recommendations.push({
      type: "warning",
      message: "You're working out too frequently. Add at least 1 rest day between sessions.",
      priority: "high"
    });
  } else if (averageRest > 2) {
    recommendations.push({
      type: "info",
      message: "Long rest periods detected. Consider increasing workout frequency if possible.",
      priority: "medium"
    });
  }
  
  if (consistency < 50) {
    recommendations.push({
      type: "tip",
      message: "Try to maintain more consistent workout spacing for better results.",
      priority: "medium"
    });
  } else if (consistency > 80) {
    recommendations.push({
      type: "success",
      message: "Excellent workout consistency! Keep up the regular schedule.",
      priority: "low"
    });
  }
  
  if (frequency < 2) {
    recommendations.push({
      type: "encouragement",
      message: "Start with 3 workouts per week, allowing 1 rest day between sessions.",
      priority: "high"
    });
  } else if (frequency > 5) {
    recommendations.push({
      type: "caution",
      message: "High frequency detected. Ensure adequate recovery with proper nutrition and sleep.",
      priority: "high"
    });
  }
  
  return recommendations;
};