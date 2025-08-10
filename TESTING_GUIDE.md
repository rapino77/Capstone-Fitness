# Testing Guide: Exercise Rotation and Periodization System

## Prerequisites

1. **Create Periodization Table in Airtable**
   - Go to your Airtable base
   - Click "+ Add table" 
   - Name it "Periodization"
   - Add these fields:
     - `User ID` (Single line text)
     - `Current Phase` (Single select: HYPERTROPHY, STRENGTH, POWER, DELOAD)
     - `Phase Start Date` (Date)
     - `Week in Phase` (Number)
     - `Total Weeks in Phase` (Number) 
     - `Next Phase` (Single select: HYPERTROPHY, STRENGTH, POWER, DELOAD)
     - `Rotation Enabled` (Checkbox)
     - `Auto Progression` (Checkbox)

2. **Have Some Workout Data**
   - Log at least 3-5 workouts in different exercises
   - Include some repeated exercises (e.g., Bench Press 2-3 times)

## Testing Methods

### Method 1: Quick Setup Verification

Run the setup test to verify everything is configured correctly:

```bash
# Start development server
netlify dev

# In another terminal, test the setup
curl "http://localhost:8888/.netlify/functions/test-quick-setup"
```

### Method 2: UI Testing (Recommended)

1. **Start the Application**
   ```bash
   netlify dev
   # Then visit http://localhost:8888
   ```

2. **Enable Periodization**
   - Go to the Workout Form
   - Look for the new "📊 Periodization" checkbox 
   - Check it to enable the system

3. **Test Exercise Selection**
   - Select an exercise you've done before (e.g., "Bench Press")
   - Look for the new purple "Training Phase" panel
   - Look for the orange "Exercise Rotation" panel

4. **Test Phase Information**
   - Should show current phase (likely HYPERTROPHY for new users)
   - Should show week in phase
   - Click the expand arrow (▼) to see more details

5. **Test Rotation Suggestions**
   - Click "Show Options" in the rotation panel
   - Should see alternative exercises
   - Try clicking "Switch" on an alternative exercise

6. **Test Periodized Workout**
   - Look for phase-optimized workout suggestion
   - Click "Apply" to use the suggested sets/reps/weight

### Method 3: API Testing

Test individual endpoints:

```bash
# Test rotation suggestions
curl "http://localhost:8888/.netlify/functions/exercise-rotation?exercise=Bench Press&action=suggestions&userId=default-user"

# Test phase information
curl "http://localhost:8888/.netlify/functions/exercise-rotation?action=phase-info&userId=default-user"

# Test full analysis
curl "http://localhost:8888/.netlify/functions/exercise-rotation?exercise=Bench Press&action=full-analysis&userId=default-user"

# Initialize periodization for user
curl -X POST "http://localhost:8888/.netlify/functions/setup-periodization-table" \
  -H "Content-Type: application/json" \
  -d '{"action": "create", "userId": "default-user"}'
```

### Method 4: Browser Developer Tools

1. **Open Developer Tools** (F12)
2. **Go to Network Tab**
3. **Enable Periodization** in the UI
4. **Select an Exercise**
5. **Watch Network Requests** - should see calls to `/exercise-rotation`
6. **Check Console** for any errors or debug logs

## Expected Behavior

### When Working Correctly:

1. **Phase Display**
   - Shows current training phase (HYPERTROPHY, STRENGTH, etc.)
   - Shows week within phase (e.g., "Week 2/4")
   - Phase-specific workout recommendations

2. **Exercise Rotation**
   - Shows exercise category (CHEST - primary, LEGS - secondary, etc.)
   - Rotation recommendation ("Continue with current exercise" or "Rotation recommended")
   - List of alternative exercises with rankings

3. **Smart Suggestions**
   - Periodized workout parameters based on current phase
   - Exercise alternatives ranked by rotation score
   - One-click application to workout form

### Common Issues and Solutions:

#### "No periodization data" or Loading Forever
- **Cause**: Periodization table not created or API endpoint not working
- **Solution**: Create table in Airtable, check Netlify functions logs

#### "Error loading periodization data"
- **Cause**: API credentials or table permissions
- **Solution**: Check environment variables, verify table access

#### No Rotation Suggestions
- **Cause**: Not enough workout history or exercise not in categories
- **Solution**: Log more workouts, check if exercise is in `EXERCISE_CATEGORIES`

#### UI Not Showing
- **Cause**: JavaScript errors or component not enabled
- **Solution**: Check browser console, verify periodization toggle is checked

## Testing Different Scenarios

### Scenario 1: New User
- Should start in HYPERTROPHY phase
- Should show "First time exercise" suggestions
- Should have basic workout recommendations

### Scenario 2: User with History
- Should calculate rotation scores based on previous workouts
- Should show realistic phase based on workout timeline
- Should suggest exercises based on staleness

### Scenario 3: Exercise Variation
- Try different exercises (Bench Press, Squat, Deadlift, etc.)
- Should see different rotation suggestions for each category
- Should maintain phase consistency across exercises

### Scenario 4: Phase Advancement
- Click "Advance Phase" button
- Should move to next phase in cycle
- Should update workout recommendations accordingly

## Debugging Tips

### Check Logs
```bash
# Netlify function logs
netlify dev --debug

# Browser console
- Look for 🧪, 📊, 💡, 🔄 prefixed messages
- Check for any red error messages
```

### Verify Data Flow
1. **Database** → Check Airtable tables have data
2. **API** → Test endpoints return valid JSON
3. **Frontend** → Check component receives and displays data
4. **User Action** → Verify clicks trigger correct API calls

### Test with Mock Data
If you want to test without setting up the full database:

```javascript
// In browser console, test rotation logic directly:
const mockWorkouts = [
  { exercise: 'Bench Press', sets: 3, reps: 10, weight: 185, date: '2025-01-15' },
  { exercise: 'Bench Press', sets: 3, reps: 8, weight: 190, date: '2025-01-10' }
];

// This would be the API response structure to expect
console.log('Expected response format:', {
  success: true,
  analysis: {
    currentPhase: { phase: 'HYPERTROPHY', weekInPhase: 1 },
    rotationSuggestions: [
      { exercise: 'Incline Bench Press', score: 85, recommendation: 'Highly Recommended' }
    ],
    periodizedWorkout: { sets: 3, reps: 12, weight: 180 }
  }
});
```

## Success Criteria

✅ **Setup Complete** when:
- Periodization table exists in Airtable
- API endpoints return valid data
- UI components render without errors

✅ **Basic Functionality** when:
- Phase information displays correctly
- Exercise categories are detected
- Rotation suggestions are generated

✅ **Full Integration** when:
- Users can apply suggestions to workout form
- Phase advancement works
- Exercise switching updates suggestions

✅ **Production Ready** when:
- All error cases handled gracefully
- Performance is acceptable (< 2s response times)
- User experience is intuitive and helpful