# 🔗 Fitness Command Center - API Documentation

Complete API reference for the Fitness Command Center serverless backend functions.

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Base URL](#base-url)
- [Common Response Format](#common-response-format)
- [Error Handling](#error-handling)
- [Workout Endpoints](#workout-endpoints)
- [Goals Endpoints](#goals-endpoints)
- [Body Weight Endpoints](#body-weight-endpoints)
- [Analytics Endpoints](#analytics-endpoints)
- [Social & Buddy System](#social--buddy-system)
- [Utility Endpoints](#utility-endpoints)
- [Webhook Endpoints](#webhook-endpoints)
- [Rate Limiting](#rate-limiting)
- [Examples](#examples)

## Overview

The Fitness Command Center API is built using Netlify Functions (AWS Lambda) and provides a RESTful interface for managing workouts, goals, body weight tracking, and analytics. All functions are serverless and automatically scale based on demand.

### Technology Stack
- **Runtime**: Node.js 18
- **Database**: Airtable
- **Authentication**: API Key based
- **CORS**: Enabled for all origins
- **Content Type**: JSON

## Authentication

All API endpoints require Airtable API credentials configured as environment variables:

- `AIRTABLE_API_KEY` or `AIRTABLE_PERSONAL_ACCESS_TOKEN`
- `AIRTABLE_BASE_ID`

No client-side authentication is required as this is handled server-side.

## Base URL

```
Production: https://your-app.netlify.app/.netlify/functions/
Development: http://localhost:8888/.netlify/functions/
```

## Common Response Format

All endpoints return JSON in the following format:

### Success Response
```json
{
  "success": true,
  "data": {}, // Response data
  "message": "Operation completed successfully",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `405` - Method Not Allowed
- `500` - Internal Server Error

### Common Error Codes

- `MISSING_REQUIRED_FIELDS` - Required fields not provided
- `INVALID_DATA_FORMAT` - Data format validation failed
- `DATABASE_ERROR` - Airtable operation failed
- `ENVIRONMENT_ERROR` - Missing environment variables

---

## 🏋️‍♂️ Workout Endpoints

### Log Workout

Create a new workout entry with automatic PR detection.

**Endpoint:** `POST /log-workout`

**Request Body:**
```json
{
  "exercise": "Bench Press",
  "sets": 3,
  "reps": 10,
  "weight": 185,
  "date": "2024-01-15",
  "notes": "Felt strong today",
  "duration": 45,
  "restTime": 90,
  "rpe": 8,
  "userId": "user123"
}
```

**Required Fields:**
- `exercise` (string) - Exercise name
- `sets` (number) - Number of sets
- `reps` (number) - Repetitions per set
- `weight` (number) - Weight in lbs/kg

**Optional Fields:**
- `date` (string) - Workout date (defaults to today)
- `notes` (string) - Additional notes
- `duration` (number) - Workout duration in minutes
- `restTime` (number) - Rest time between sets in seconds
- `rpe` (number) - Rate of Perceived Exertion (1-10)
- `userId` (string) - User identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "workoutId": "recXXXXXXXXXXXXXX",
    "exercise": "Bench Press",
    "sets": 3,
    "reps": 10,
    "weight": 185,
    "date": "2024-01-15",
    "prDetected": true,
    "previousBest": 180,
    "improvement": 5,
    "estimatedOneRepMax": 246
  }
}
```

---

### Get Workouts

Retrieve workout history with filtering and pagination.

**Endpoint:** `GET /get-workouts`

**Query Parameters:**
- `userId` (string) - User identifier (default: "default-user")
- `exercise` (string) - Filter by exercise name
- `startDate` (string) - Start date filter (YYYY-MM-DD)
- `endDate` (string) - End date filter (YYYY-MM-DD)
- `limit` (number) - Number of records to return (default: 20, max: 100)
- `offset` (number) - Number of records to skip (default: 0)
- `sortBy` (string) - Sort field: "Date", "Exercise", "Weight" (default: "Date")
- `sortDirection` (string) - Sort direction: "asc", "desc" (default: "desc")

**Example Request:**
```
GET /get-workouts?exercise=Bench Press&startDate=2024-01-01&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "recXXXXXXXXXXXXXX",
      "exercise": "Bench Press",
      "sets": 3,
      "reps": 10,
      "weight": 185,
      "date": "2024-01-15",
      "notes": "Felt strong today",
      "duration": 45,
      "estimatedOneRepMax": 246
    }
  ],
  "pagination": {
    "total": 150,
    "offset": 0,
    "limit": 10,
    "hasMore": true,
    "currentPage": 1,
    "totalPages": 15
  }
}
```

---

### Delete Workout

Delete a specific workout entry.

**Endpoint:** `DELETE /delete-workout/{workoutId}`

**Path Parameters:**
- `workoutId` (string) - Airtable record ID

**Response:**
```json
{
  "success": true,
  "message": "Workout deleted successfully",
  "data": {
    "deletedId": "recXXXXXXXXXXXXXX"
  }
}
```

---

### Get Progression Suggestion

Get AI-powered progression recommendations for a specific exercise.

**Endpoint:** `GET /get-progression-suggestion`

**Query Parameters:**
- `exercise` (string, required) - Exercise name
- `workoutsToAnalyze` (number) - Number of recent workouts to analyze (default: 5)
- `userId` (string) - User identifier

**Response:**
```json
{
  "success": true,
  "progression": {
    "exercise": "Bench Press",
    "currentWeight": 185,
    "suggestedWeight": 190,
    "progressionType": "weight",
    "confidence": 0.85,
    "reasoning": "Consistent 3x10 performance suggests ready for 5lb increase",
    "alternativeProgression": {
      "type": "reps",
      "suggestion": "Try 3x12 at current weight"
    },
    "deloadRecommended": false,
    "nextSession": {
      "weight": 190,
      "sets": 3,
      "reps": 10,
      "expectedDifficulty": "moderate"
    }
  }
}
```

---

### Reset All Workouts

**⚠️ DANGER ZONE** - Delete all workout records (development only).

**Endpoint:** `DELETE /reset-all-workouts`

**Response:**
```json
{
  "success": true,
  "message": "All workouts deleted successfully",
  "deletedCount": 247
}
```

---

## 🎯 Goals Endpoints

### Get Goals

Retrieve user goals with filtering options.

**Endpoint:** `GET /goals`

**Query Parameters:**
- `userId` (string) - User identifier (default: "default-user")
- `status` (string) - Filter by status: "Active", "Completed", "Paused", "all" (default: "Active")
- `type` (string) - Filter by type: "Weight", "Exercise PR", "Frequency", "Volume", "Custom"
- `sortBy` (string) - Sort field: "Created Date", "Target Date", "Priority" (default: "Created Date")
- `sortDirection` (string) - Sort direction: "asc", "desc" (default: "desc")

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "recXXXXXXXXXXXXXX",
      "title": "Bench Press 225lbs",
      "description": "Achieve 225lb bench press for 1 rep",
      "type": "Exercise PR",
      "targetValue": 225,
      "currentValue": 185,
      "targetDate": "2024-06-01",
      "status": "Active",
      "priority": "High",
      "createdDate": "2024-01-01",
      "progressPercentage": 82.2,
      "daysRemaining": 137,
      "milestones": {
        "25": { "achieved": true, "date": "2024-01-15" },
        "50": { "achieved": true, "date": "2024-02-01" },
        "75": { "achieved": true, "date": "2024-02-15" },
        "100": { "achieved": false, "date": null }
      },
      "predictionData": {
        "estimatedCompletionDate": "2024-05-15",
        "onTrack": true,
        "progressRate": 2.5
      }
    }
  ]
}
```

---

### Create Goal

Create a new SMART goal.

**Endpoint:** `POST /goals`

**Request Body:**
```json
{
  "title": "Bench Press 225lbs",
  "description": "Achieve 225lb bench press for 1 rep",
  "type": "Exercise PR",
  "targetValue": 225,
  "currentValue": 185,
  "targetDate": "2024-06-01",
  "priority": "High",
  "userId": "user123",
  "metadata": {
    "exercise": "Bench Press",
    "unit": "lbs",
    "category": "strength"
  }
}
```

**Required Fields:**
- `title` (string) - Goal title
- `type` (string) - Goal type: "Weight", "Exercise PR", "Frequency", "Volume", "Custom"
- `targetValue` (number) - Target value to achieve
- `targetDate` (string) - Target completion date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "goalId": "recXXXXXXXXXXXXXX",
    "title": "Bench Press 225lbs",
    "type": "Exercise PR",
    "status": "Active",
    "progressPercentage": 0,
    "milestones": {
      "25": { "threshold": 195, "achieved": false },
      "50": { "threshold": 205, "achieved": false },
      "75": { "threshold": 215, "achieved": false },
      "100": { "threshold": 225, "achieved": false }
    }
  }
}
```

---

### Update Goal Progress

Update progress towards a specific goal.

**Endpoint:** `POST /update-goal-progress`

**Request Body:**
```json
{
  "goalId": "recXXXXXXXXXXXXXX",
  "progressValue": 195,
  "notes": "Hit 195lbs for 3 reps today!",
  "photos": ["photo1.jpg", "photo2.jpg"],
  "userId": "user123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "goalId": "recXXXXXXXXXXXXXX",
    "previousValue": 185,
    "currentValue": 195,
    "progressPercentage": 86.7,
    "improvement": 10,
    "milestoneAchieved": "75%",
    "isCompleted": false,
    "nextMilestone": {
      "percentage": 100,
      "threshold": 225,
      "remaining": 30
    }
  }
}
```

---

### Delete Goal

Delete a specific goal.

**Endpoint:** `DELETE /goals/{goalId}`

**Path Parameters:**
- `goalId` (string) - Airtable record ID

**Response:**
```json
{
  "success": true,
  "message": "Goal deleted successfully",
  "data": {
    "deletedId": "recXXXXXXXXXXXXXX"
  }
}
```

---

### Get Goal Predictions

Get AI-powered predictions for goal completion.

**Endpoint:** `GET /get-goal-predictions`

**Query Parameters:**
- `goalId` (string) - Specific goal ID (optional)
- `userId` (string) - User identifier

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "goalId": "recXXXXXXXXXXXXXX",
      "title": "Bench Press 225lbs",
      "prediction": {
        "estimatedCompletionDate": "2024-05-15",
        "confidenceScore": 0.78,
        "onTrack": true,
        "progressRate": 2.5,
        "daysAhead": 17,
        "recommendations": [
          "Maintain current training frequency",
          "Focus on progressive overload",
          "Consider adding accessory work"
        ],
        "riskFactors": [
          "Recent plateau in bench press"
        ]
      }
    }
  ]
}
```

---

## ⚖️ Body Weight Endpoints

### Log Weight

Record a body weight measurement.

**Endpoint:** `POST /log-weight`

**Request Body:**
```json
{
  "weight": 175.5,
  "date": "2024-01-15",
  "unit": "lbs",
  "notes": "Morning weight after workout",
  "bodyFatPercentage": 12.5,
  "muscleMass": 145.2,
  "userId": "user123"
}
```

**Required Fields:**
- `weight` (number) - Body weight value
- `unit` (string) - "lbs" or "kg"

**Response:**
```json
{
  "success": true,
  "data": {
    "weightId": "recXXXXXXXXXXXXXX",
    "weight": 175.5,
    "date": "2024-01-15",
    "unit": "lbs",
    "trend": {
      "direction": "decreasing",
      "change": -1.2,
      "changePercentage": -0.68,
      "weeklyAverage": 176.1
    }
  }
}
```

---

### Get Weights

Retrieve weight history with trend analysis.

**Endpoint:** `GET /get-weights`

**Query Parameters:**
- `userId` (string) - User identifier
- `startDate` (string) - Start date filter (YYYY-MM-DD)
- `endDate` (string) - End date filter (YYYY-MM-DD)
- `limit` (number) - Number of records (default: 30)
- `includeTrends` (boolean) - Include trend analysis (default: true)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "recXXXXXXXXXXXXXX",
      "weight": 175.5,
      "date": "2024-01-15",
      "unit": "lbs",
      "notes": "Morning weight"
    }
  ],
  "trends": {
    "currentWeight": 175.5,
    "startingWeight": 180.2,
    "totalChange": -4.7,
    "weeklyChange": -1.2,
    "monthlyChange": -3.8,
    "trend": "decreasing",
    "movingAverage": 176.1,
    "volatility": "low"
  }
}
```

---

### Update Weight

Update an existing weight entry.

**Endpoint:** `PUT /update-weight/{weightId}`

**Request Body:**
```json
{
  "weight": 176.0,
  "notes": "Updated measurement",
  "bodyFatPercentage": 12.3
}
```

---

### Delete Weight

Delete a weight measurement.

**Endpoint:** `DELETE /delete-weight/{weightId}`

---

## 📊 Analytics Endpoints

### Get Comprehensive Analytics

Retrieve comprehensive fitness analytics and insights.

**Endpoint:** `GET /get-analytics`

**Query Parameters:**
- `userId` (string) - User identifier (default: "default-user")
- `timeframe` (number) - Analysis timeframe in days (default: 30)
- `includeGoals` (boolean) - Include goals data (default: true)
- `includeWeight` (boolean) - Include weight data (default: true)
- `includeWorkouts` (boolean) - Include workout data (default: true)

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalWorkouts": 45,
      "totalVolume": 125000,
      "averageSessionDuration": 52,
      "personalRecords": 8,
      "currentStreak": 12,
      "activeGoals": 5,
      "completedGoals": 2
    },
    "workoutData": [
      {
        "exercise": "Bench Press",
        "sessions": 12,
        "totalVolume": 22200,
        "maxWeight": 185,
        "averageReps": 9.5,
        "progressTrend": "increasing"
      }
    ],
    "strengthProgress": {
      "Bench Press": {
        "currentMax": 185,
        "startingMax": 155,
        "improvement": 30,
        "improvementPercentage": 19.4,
        "lastPR": "2024-01-10"
      }
    },
    "bodyComposition": {
      "currentWeight": 175.5,
      "startingWeight": 180.2,
      "weightChange": -4.7,
      "trend": "losing",
      "bmi": 23.8
    },
    "goals": {
      "active": 5,
      "completed": 2,
      "onTrack": 4,
      "overdue": 1,
      "averageProgress": 67.8
    },
    "insights": [
      "Your bench press has improved 19% over the last 30 days",
      "You've been consistent with 3.5 workouts per week",
      "Consider adding more back exercises for balanced development"
    ],
    "recommendations": [
      "Focus on progressive overload for continued strength gains",
      "Add cardio sessions for improved recovery",
      "Update your protein goal based on current weight"
    ]
  }
}
```

---

### Detect Personal Records

Analyze workouts for personal record detection.

**Endpoint:** `GET /detect-prs`

**Query Parameters:**
- `userId` (string) - User identifier
- `exercise` (string) - Specific exercise (optional)
- `timeframe` (number) - Days to analyze (default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "personalRecords": [
      {
        "exercise": "Bench Press",
        "recordType": "1RM",
        "newRecord": 185,
        "previousRecord": 180,
        "improvement": 5,
        "date": "2024-01-15",
        "workoutId": "recXXXXXXXXXXXXXX",
        "estimatedOneRepMax": 246,
        "percentageImprovement": 2.78
      }
    ],
    "summary": {
      "totalPRs": 3,
      "exercisesImproved": ["Bench Press", "Squat", "Deadlift"],
      "averageImprovement": 4.2
    }
  }
}
```

---

### Get Weekly Report

Generate comprehensive weekly fitness report.

**Endpoint:** `GET /get-weekly-report`

**Query Parameters:**
- `userId` (string) - User identifier
- `weekOffset` (number) - Weeks back from current (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "week": {
      "startDate": "2024-01-08",
      "endDate": "2024-01-14"
    },
    "workouts": {
      "total": 4,
      "goal": 4,
      "completionRate": 100,
      "averageDuration": 48,
      "totalVolume": 28500
    },
    "strength": {
      "personalRecords": 2,
      "volumeIncrease": 5.2,
      "intensityAverage": 7.8
    },
    "body": {
      "weightChange": -0.8,
      "measurements": {
        "startWeight": 176.3,
        "endWeight": 175.5
      }
    },
    "goals": {
      "progressMade": 3,
      "milestonesHit": 1,
      "onTrackCount": 4,
      "needsAttention": 1
    },
    "highlights": [
      "New PR: Bench Press 185lbs (+5lbs)",
      "Completed 100% of planned workouts",
      "Lost 0.8lbs this week"
    ],
    "insights": [
      "Excellent consistency this week",
      "Strength gains are accelerating",
      "Consider adding more recovery time"
    ]
  }
}
```

---

### Workout Duration Analytics

Analyze workout duration trends and patterns.

**Endpoint:** `GET /workout-duration-analytics`

**Query Parameters:**
- `userId` (string) - User identifier
- `timeframe` (number) - Days to analyze (default: 30)
- `exercise` (string) - Specific exercise filter (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "averageDuration": 52,
      "totalWorkouts": 28,
      "shortestWorkout": 35,
      "longestWorkout": 78,
      "standardDeviation": 12.5
    },
    "trends": {
      "direction": "stable",
      "weeklyChange": -2.1,
      "optimalRange": "45-60 minutes"
    },
    "distribution": {
      "under30": 2,
      "30to45": 8,
      "45to60": 15,
      "60to75": 3,
      "over75": 0
    },
    "recommendations": [
      "Your workout durations are well-optimized",
      "Consider shorter rest periods to reduce session time",
      "Maintain current intensity levels"
    ]
  }
}
```

---

### Trend Analysis Alerts

Get alerts for workout trends, plateaus, and performance issues.

**Endpoint:** `GET /trend-analysis-alerts`

**Query Parameters:**
- `userId` (string) - User identifier
- `severity` (string) - "low", "medium", "high", "all" (default: "all")

**Response:**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "alert_001",
        "type": "plateau",
        "severity": "medium",
        "exercise": "Bench Press",
        "message": "No progress in bench press for 3 weeks",
        "detectedDate": "2024-01-15",
        "recommendations": [
          "Try changing rep ranges",
          "Add pause reps for strength",
          "Consider a deload week"
        ],
        "data": {
          "stallDuration": 21,
          "lastProgress": "2023-12-25",
          "currentWeight": 185,
          "suggestedDeload": 155
        }
      }
    ],
    "summary": {
      "totalAlerts": 3,
      "high": 0,
      "medium": 2,
      "low": 1,
      "newThisWeek": 1
    }
  }
}
```

---

### Get Summary Insights

Get AI-generated insights and recommendations.

**Endpoint:** `GET /get-summary-insights`

**Query Parameters:**
- `userId` (string) - User identifier
- `timeframe` (number) - Days to analyze (default: 30)
- `insightType` (string) - "weekly", "monthly", "all" (default: "all")

**Response:**
```json
{
  "success": true,
  "data": {
    "insights": [
      {
        "category": "strength",
        "title": "Impressive Upper Body Progress",
        "description": "Your bench press has increased 15% this month, showing excellent progressive overload application.",
        "confidence": 0.92,
        "actionItems": [
          "Continue current rep/set scheme",
          "Focus on form consistency"
        ]
      }
    ],
    "recommendations": [
      {
        "priority": "high",
        "category": "programming",
        "title": "Add Lower Body Volume",
        "description": "Your squat frequency has decreased. Aim for 2-3 squat sessions per week.",
        "specificActions": [
          "Schedule squat sessions on Mon/Wed/Fri",
          "Start with 85% of previous working weight"
        ]
      }
    ],
    "achievements": [
      "Completed 95% of planned workouts this month",
      "Hit 3 personal records",
      "Maintained consistent weight tracking"
    ]
  }
}
```

---

## 👥 Social & Buddy System

### Buddy System

Manage workout accountability partnerships.

**Endpoint:** `GET/POST /buddy-system`

#### Get Buddy Status
**GET /buddy-system?userId=user123**

**Response:**
```json
{
  "success": true,
  "data": {
    "currentBuddy": {
      "buddyId": "user456",
      "name": "John Doe",
      "status": "active",
      "startDate": "2024-01-01",
      "sharedGoals": 2,
      "mutualWorkouts": 15
    },
    "accountability": {
      "myWorkouts": 12,
      "buddyWorkouts": 10,
      "sharedChallenges": 3,
      "competitiveScore": {
        "me": 85,
        "buddy": 78
      }
    },
    "recentActivity": [
      {
        "type": "workout_completed",
        "user": "buddy",
        "exercise": "Deadlift",
        "weight": 315,
        "date": "2024-01-14"
      }
    ]
  }
}
```

#### Send Buddy Request
**POST /buddy-system**

**Request Body:**
```json
{
  "action": "send_request",
  "userId": "user123",
  "targetUserId": "user456",
  "message": "Want to be workout buddies?"
}
```

---

## 🛠️ Utility Endpoints

### Export Progress Report

Generate comprehensive progress report in PDF format.

**Endpoint:** `GET /export-progress-report`

**Query Parameters:**
- `userId` (string) - User identifier
- `format` (string) - "pdf", "json" (default: "pdf")
- `timeframe` (number) - Days to include (default: 90)
- `includeCharts` (boolean) - Include visual charts (default: true)

**Response:**
```json
{
  "success": true,
  "data": {
    "reportUrl": "https://example.com/reports/user123_progress_2024_01_15.pdf",
    "reportId": "rpt_XXXXXXXXXXXXX",
    "generatedAt": "2024-01-15T10:30:00Z",
    "expiresAt": "2024-01-22T10:30:00Z",
    "sections": [
      "executive_summary",
      "strength_progress",
      "body_composition",
      "goal_tracking",
      "recommendations"
    ]
  }
}
```

---

### Exercise Rotation

Get suggested exercise variations and rotation recommendations.

**Endpoint:** `GET /exercise-rotation`

**Query Parameters:**
- `userId` (string) - User identifier
- `exercise` (string) - Primary exercise
- `goal` (string) - "strength", "hypertrophy", "endurance"

**Response:**
```json
{
  "success": true,
  "data": {
    "primaryExercise": "Bench Press",
    "variations": [
      {
        "name": "Incline Bench Press",
        "targetMuscles": ["upper chest", "front delts"],
        "difficulty": "intermediate",
        "recommendation": "Use 85% of flat bench weight"
      },
      {
        "name": "Dumbbell Bench Press",
        "targetMuscles": ["chest", "stabilizers"],
        "difficulty": "beginner",
        "recommendation": "Use 70% of barbell weight per dumbbell"
      }
    ],
    "rotationSchedule": {
      "week1": "Flat Bench Press",
      "week2": "Incline Bench Press", 
      "week3": "Dumbbell Bench Press",
      "week4": "Flat Bench Press"
    }
  }
}
```

---

## 🔗 Webhook Endpoints

### N8N Automation Webhook

Handle automation workflows from n8n for notifications and triggers.

**Endpoint:** `POST /n8n-webhook`

**Request Body:**
```json
{
  "trigger": "pr_detected",
  "userId": "user123",
  "data": {
    "exercise": "Bench Press",
    "newRecord": 185,
    "improvement": 5,
    "workoutId": "recXXXXXXXXXXXXXX"
  },
  "notificationChannels": ["email", "slack", "discord"]
}
```

**Supported Triggers:**
- `pr_detected` - New personal record achieved
- `goal_milestone` - Goal milestone reached
- `goal_completed` - Goal completed
- `workout_streak` - Workout streak milestone
- `plateau_detected` - Performance plateau identified
- `deload_recommended` - Deload period recommended

**Response:**
```json
{
  "success": true,
  "data": {
    "webhookId": "wh_XXXXXXXXXXXXX",
    "processed": true,
    "notifications": {
      "email": "sent",
      "slack": "sent",
      "discord": "failed"
    },
    "actions": [
      "celebration_animation_triggered",
      "progress_photo_reminder_scheduled"
    ]
  }
}
```

---

## ⚡ Rate Limiting

All endpoints have rate limiting applied:

- **Standard endpoints**: 100 requests per minute per IP
- **Analytics endpoints**: 50 requests per minute per IP
- **Export endpoints**: 10 requests per minute per IP

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642334400
```

---

## 📋 Examples

### Complete Workout Session Flow

1. **Log workout:**
```bash
curl -X POST https://your-app.netlify.app/.netlify/functions/log-workout \
  -H "Content-Type: application/json" \
  -d '{
    "exercise": "Squat",
    "sets": 3,
    "reps": 8,
    "weight": 275,
    "date": "2024-01-15"
  }'
```

2. **Check for PRs:**
```bash
curl "https://your-app.netlify.app/.netlify/functions/detect-prs?exercise=Squat"
```

3. **Update goal progress:**
```bash
curl -X POST https://your-app.netlify.app/.netlify/functions/update-goal-progress \
  -H "Content-Type: application/json" \
  -d '{
    "goalId": "recXXXXXXXXXXXXXX",
    "progressValue": 275
  }'
```

### Analytics Dashboard Data

```bash
curl "https://your-app.netlify.app/.netlify/functions/get-analytics?timeframe=30&includeGoals=true"
```

### Weekly Report Generation

```bash
curl "https://your-app.netlify.app/.netlify/functions/get-weekly-report?userId=user123&weekOffset=0"
```

---

## 🚀 Getting Started

1. **Set up environment variables** in your Netlify dashboard
2. **Test connection** with a simple GET request to `/get-analytics`
3. **Create your first workout** using `/log-workout`
4. **Set up goals** with `/goals` endpoint
5. **Monitor progress** with `/get-weekly-report`

---

## 📞 Support

For API support and questions:
- **Issues**: Create a GitHub issue
- **Documentation**: Check the main README.md
- **Discussions**: Use GitHub Discussions

---

*Last updated: January 2024 | Version: 1.0.0*