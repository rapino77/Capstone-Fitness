class ProgressiveOverloadEngine {
  constructor(userPreferences) {
    this.userPrefs = userPreferences;
    this.maxWeeklyIncrease = userPreferences.maxWeeklyIncrease || 0.10;
  }

  // Primary method to calculate next workout recommendation
  calculateNextProgression(exerciseHistory, currentPerformance) {
    const lastThreeWorkouts = this.getRecentWorkouts(exerciseHistory, 3);
    const progressionType = this.determineProgressionType(lastThreeWorkouts);
    
    switch(progressionType) {
      case 'INCREASE_WEIGHT':
        return this.calculateWeightIncrease(currentPerformance);
      case 'INCREASE_REPS':
        return this.calculateRepIncrease(currentPerformance);
      case 'MAINTAIN':
        return this.maintainCurrent(currentPerformance);
      case 'DELOAD':
        return this.calculateDeload(currentPerformance);
      default:
        return this.conservativeProgression(currentPerformance);
    }
  }

  // Determine if user is ready for progression
  determineProgressionType(recentWorkouts) {
    const completionRates = recentWorkouts.map(w => this.calculateCompletionRate(w));
    const avgRIR = recentWorkouts.map(w => this.calculateAverageRIR(w));
    
    // If completing all sets with RIR >= 2 for 2+ workouts
    if (completionRates.every(rate => rate >= 0.95) && 
        avgRIR.every(rir => rir >= 2)) {
      return 'INCREASE_WEIGHT';
    }
    
    // If completing sets but struggling (RIR < 1)
    if (completionRates.every(rate => rate >= 0.90) && 
        avgRIR.some(rir => rir >= 1 && rir < 2)) {
      return 'INCREASE_REPS';
    }
    
    // If failing to complete multiple sets
    if (completionRates.some(rate => rate < 0.80)) {
      return 'DELOAD';
    }
    
    return 'MAINTAIN';
  }

  // Weight progression (primary method)
  calculateWeightIncrease(current) {
    const baseWeight = current.weight;
    let increment;
    
    // Smart increment based on weight range
    if (baseWeight < 50) increment = 2.5; // kg
    else if (baseWeight < 100) increment = 5;
    else if (baseWeight < 150) increment = 7.5;
    else increment = 10;
    
    // Ensure within weekly limit
    const maxIncrease = baseWeight * this.maxWeeklyIncrease;
    const finalIncrement = Math.min(increment, maxIncrease);
    
    return {
      newWeight: baseWeight + finalIncrement,
      newReps: current.reps, // maintain reps
      confidence: this.calculateConfidence(current),
      reasoning: `Ready for weight increase: +${finalIncrement}kg`
    };
  }

  // Rep progression (alternative method)
  calculateRepIncrease(current) {
    const targetRepIncrease = Math.min(2, Math.ceil(current.reps * 0.15));
    
    return {
      newWeight: current.weight, // maintain weight
      newReps: current.reps + targetRepIncrease,
      confidence: this.calculateConfidence(current),
      reasoning: `Focus on rep progression: +${targetRepIncrease} reps`
    };
  }

  // Confidence scoring (0-1)
  calculateConfidence(performance) {
    const factors = {
      consistency: this.getConsistencyScore(performance),
      formQuality: this.getFormScore(performance), // based on RIR
      recentProgress: this.getProgressScore(performance)
    };
    
    return (factors.consistency + factors.formQuality + factors.recentProgress) / 3;
  }
}