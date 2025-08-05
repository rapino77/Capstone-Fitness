# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

always check for build errors and linting errors before a task is considered done

### Primary Development
- `netlify dev` - Start development server (runs React app + serverless functions) at http://localhost:8888
- `npm start` - Run React app only at http://localhost:3000 (use netlify dev instead for full functionality)
- `npm run build` - Build React app for production
- `npm test` - Run test suite in watch mode

### Functions Development
- Functions are located in `netlify/functions/` directory
- Each function has its own package.json with Airtable dependency
- API endpoints are accessible at `/.netlify/functions/[function-name]`

## Architecture Overview

### Frontend (React + Tailwind CSS)
- **Single Page Application** with tab-based navigation
- **Main App Components:**
  - `Dashboard.js` - Analytics overview with charts and insights
  - `WorkoutForm.js` - Exercise logging with PR detection
  - `WeightLogger.js` - Body weight tracking with trend analysis
  - `GoalCreator.js` - SMART goal creation wizard
  - `GoalTracker.js` - Goal progress management with milestones
  - `WorkoutHistory.js` - Advanced workout history with filtering

### Backend (Netlify Functions + Airtable)
- **Serverless Functions** handling all API operations
- **Airtable Database** with 6 tables: Workouts, BodyWeight, Goals, Goal Progress, Progress Records, Workout Templates
- **Key API Endpoints:**
  - `/api/log-workout` - Workout logging with automatic PR detection
  - `/api/goals` - Complete CRUD operations for goal management
  - `/api/get-analytics` - Advanced analytics and insights
  - `/api/detect-prs` - Personal record detection and analysis
  - `/api/n8n-webhook` - Automation workflow integration

### Data Flow
1. React components make API calls to Netlify functions
2. Functions interact with Airtable database
3. Database updates trigger n8n webhooks for automation
4. Automated workflows send notifications and update progress

## Key Features & Systems

### Goals Management System
- **SMART Goals Creation** - Specific, Measurable, Achievable, Relevant, Time-bound
- **Goal Types:** Body Weight, Exercise PR, Frequency, Volume, Custom
- **Progress Tracking** with milestone celebrations (25%, 50%, 75%, 100%)
- **Deadline Management** with urgency indicators

### Personal Records (PR) System
- **Automatic Detection** - Identifies PRs from workout data using Brzycki formula
- **1RM Calculations** - Estimated one-rep max calculations
- **Historical Tracking** - Complete PR history with improvements

### Analytics & Intelligence
- **Progressive Overload Calculations**
- **Weight-Performance Correlation Analysis**
- **Workout Frequency & Volume Analysis**
- **Predictive Goal Completion Forecasting**

### Automation Integration (n8n)
- **Webhook Handler** at `/api/n8n-webhook`
- **5 Core Workflows:** PR detection, milestone celebrations, weekly reports, recommendations, alerts
- **Multi-Channel Notifications:** Email, Discord, Slack

## Environment Setup

### Required Environment Variables
```
AIRTABLE_API_KEY=your_api_key
AIRTABLE_BASE_ID=your_base_id
REACT_APP_API_URL=/.netlify/functions
```

### Airtable Tables Required
- Workouts (Exercise, Sets, Reps, Weight, Date, Notes)
- BodyWeight (Weight, Date, Unit, Notes)
- Goals (complete SMART goal structure)
- Goal Progress (milestone tracking)
- Progress Records (PR tracking)
- Workout Templates (future planning)

## Important Development Notes

### API Communication
- All frontend API calls go through `/.netlify/functions/` prefix
- Functions handle CORS automatically
- Error handling implemented across all endpoints

### State Management
- React hooks for local state management
- Refresh triggers for cross-component updates
- No external state management library used

### Styling & UI
- **Tailwind CSS** for all styling
- **Recharts** for data visualizations
- **React Hook Form** for form validation
- Mobile-responsive design throughout

### Testing
- Jest test framework via Create React App
- Component testing with React Testing Library
- API endpoint testing functions available in `netlify/functions/test-*.js`

## Deployment

### Netlify Configuration
- Build command: `npm install && npm run build`
- Functions directory: `netlify/functions`
- Publish directory: `build`
- Node version: 18

### Automation Setup
- Follow `N8N_INTEGRATION.md` for webhook automation
- Use `AIRTABLE_SCHEMA.md` for database schema setup
- Environment variables must be configured in Netlify dashboard