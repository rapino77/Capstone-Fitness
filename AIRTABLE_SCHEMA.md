# Expanded Airtable Schema for Fitness Command Center

## Required Tables Setup

You need to create these additional tables in your Airtable base to support the full feature set:

### 1. Progress Records Table
**Purpose**: Track personal records (PRs) for each exercise

**Fields**:
- `Record ID` (Auto-generated)
- `User ID` (Single line text)
- `Exercise Name` (Single line text)
- `Max Weight` (Number, 2 decimal places)
- `Reps` (Number, integer)
- `Date Achieved` (Date)
- `Workout ID` (Link to Workouts table)
- `Previous PR` (Number, 2 decimal places)
- `Improvement` (Formula: `{Max Weight} - {Previous PR}`)
- `Created At` (Created time)

### 2. Goals Table
**Purpose**: Comprehensive goal management system

**Fields**:
- `Record ID` (Auto-generated)
- `User ID` (Single line text)
- `Goal Type` (Single select: Body Weight, Exercise PR, Frequency, Volume, Custom)
- `Goal Title` (Single line text)
- `Target Value` (Number, 2 decimal places)
- `Current Value` (Number, 2 decimal places)
- `Target Date` (Date)
- `Exercise Name` (Single line text, optional)
- `Status` (Single select: Active, Completed, Paused, Cancelled)
- `Priority` (Single select: High, Medium, Low)
- `Progress Percentage` (Formula: `({Current Value} / {Target Value}) * 100`)
- `Days Remaining` (Formula: `DATETIME_DIFF({Target Date}, TODAY(), 'days')`)
- `Created Date` (Created time)
- `Completed Date` (Date)
- `Notes` (Long text)

### 3. Goal Progress Table
**Purpose**: Track daily/weekly progress updates for goals

**Fields**:
- `Record ID` (Auto-generated)
- `Goal ID` (Link to Goals table)
- `Progress Value` (Number, 2 decimal places)
- `Date Recorded` (Date)
- `Progress Type` (Single select: Manual Update, Automatic, Milestone)
- `Notes` (Long text)
- `Milestone Achieved` (Checkbox)
- `Created At` (Created time)

### 4. Workout Templates Table
**Purpose**: Store workout templates and planning data

**Fields**:
- `Record ID` (Auto-generated)
- `Template Name` (Single line text)
- `Category` (Single select: Push, Pull, Legs, Upper, Lower, Full Body, Cardio)
- `Exercise List` (Long text, JSON format)
- `Target Duration` (Number, minutes)
- `Difficulty Level` (Single select: Beginner, Intermediate, Advanced)
- `Rest Days Required` (Number)
- `Created By` (Single line text, User ID)
- `Created At` (Created time)
- `Usage Count` (Number)
- `Notes` (Long text)

## Setup Instructions

1. **Create New Tables**: In your existing Airtable base, click "+ Add table" for each table above
2. **Add Fields**: For each table, add the fields with the exact names and types specified
3. **Set up Relationships**: 
   - Link Progress Records to Workouts table
   - Link Goal Progress to Goals table
4. **Configure Formulas**: Add the formula fields exactly as shown above
5. **Set Single Select Options**: Add the options listed for each single select field

## Updated API Endpoints

The following new endpoints will be created to work with this expanded schema:

- `POST /api/goals` - Create new goal
- `GET /api/goals` - Retrieve user goals
- `PUT /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal
- `POST /api/goal-progress` - Log goal progress
- `GET /api/detect-prs` - Detect and retrieve personal records
- `GET /api/analytics` - Advanced analytics and insights
- `POST /api/workout-templates` - Create workout template
- `GET /api/workout-templates` - Retrieve workout templates

## Data Validation Rules

- **Goals**: Target date must be in future, target value must be positive
- **Progress Records**: Weight must be greater than previous PR
- **Goal Progress**: Progress value must be between 0 and target value
- **Workout Templates**: Exercise list must be valid JSON format

## Next Steps

1. Set up these tables in your Airtable base
2. The API endpoints will be created to work with this schema
3. Test the connections with sample data