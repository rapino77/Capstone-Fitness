# Fitness Tracker Setup Instructions

## Prerequisites
- Node.js and npm installed
- Netlify CLI installed (`npm install -g netlify-cli`)
- Airtable account

## Airtable Setup

1. Create a new Airtable base for your fitness tracker
2. Create two tables with the following schemas:

### Workouts Table
- Exercise (Single line text)
- Sets (Number)
- Reps (Number)
- Weight (Number)
- Date (Date)
- Notes (Long text)
- CreatedAt (Created time)

### BodyWeight Table
- Weight (Number)
- Date (Date)
- Unit (Single select: lbs, kg)
- Notes (Long text)
- CreatedAt (Created time)

3. Get your Airtable API key from: https://airtable.com/account
4. Get your Base ID from: https://airtable.com/api (select your base)

## Local Development Setup

1. Update `.env.local` with your Airtable credentials:
```
AIRTABLE_API_KEY=your_actual_api_key_here
AIRTABLE_BASE_ID=your_actual_base_id_here
REACT_APP_API_URL=/.netlify/functions
```

2. Install dependencies:
```bash
npm install
```

3. Start the Netlify dev server (this will run both React and serverless functions):
```bash
netlify dev
```

The app will be available at http://localhost:8888

## Deployment to Netlify

1. Connect your GitHub repository to Netlify
2. Add environment variables in Netlify dashboard:
   - `AIRTABLE_API_KEY`
   - `AIRTABLE_BASE_ID`
3. Deploy!

## Features

- **Workout Logging**: Track exercises with sets, reps, and weight
- **Weight Tracking**: Log body weight with trend visualization
- **Workout History**: View and filter past workouts
- **Data Validation**: Frontend and backend validation for all inputs
- **Responsive Design**: Works on desktop and mobile devices

## Troubleshooting

- If you get CORS errors, make sure you're using `netlify dev` instead of `npm start`
- If Airtable connection fails, verify your API key and Base ID are correct
- Check that your Airtable table names match exactly: "Workouts" and "BodyWeight"