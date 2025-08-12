# 🏋️‍♂️ Fitness Command Center

A comprehensive fitness tracking Progressive Web Application (PWA) built with React, featuring workout logging, goal management, analytics, and social features.

![Fitness Command Center](https://img.shields.io/badge/Fitness-Command%20Center-blue?style=for-the-badge&logo=react)
![Version](https://img.shields.io/badge/version-0.1.0-green?style=flat-square)
![PWA Ready](https://img.shields.io/badge/PWA-Ready-orange?style=flat-square)
![Mobile Optimized](https://img.shields.io/badge/Mobile-Optimized-purple?style=flat-square)

## 🚀 Features

### 📊 **Dashboard & Analytics**
- Real-time fitness analytics and insights
- Personal record tracking and detection
- Progress visualization with interactive charts
- Workout streak tracking
- Weekly performance reports

### 💪 **Workout Management**
- Comprehensive workout logging with PR detection
- Multiple workout programs (StrongLifts 5x5, Wendler 5/3/1)
- Progressive overload calculations
- Workout templates and scheduling
- Built-in workout timer with rest periods
- Deload detection and recommendations

### 🎯 **Goal Setting & Tracking**
- SMART goal creation wizard
- Multiple goal types (Weight, Exercise PR, Frequency, Volume)
- Milestone celebrations (25%, 50%, 75%, 100%)
- Goal prediction algorithms
- Progress photos integration

### 📈 **Advanced Analytics**
- Body weight tracking with trend analysis
- Strength progression charts
- Workout duration analytics
- Personal records sidebar
- Trend analysis with plateau detection
- Summary insights and recommendations

### 🏆 **Gamification**
- Badge system with achievements
- Challenge system with progress tracking
- Workout streaks and milestones
- Personal record celebrations

### 👥 **Social Features**
- Buddy system for workout accountability
- Social progress sharing
- Group challenges and competitions

### 📱 **PWA Features**
- Offline functionality with service worker
- Install as mobile/desktop app
- Push notifications for reminders
- Mobile-optimized responsive design
- Touch gestures and swipe navigation

## 🛠️ Technology Stack

- **Frontend**: React 18 with Hooks
- **Styling**: Tailwind CSS with custom themes
- **Charts**: Recharts for data visualization
- **Forms**: React Hook Form with validation
- **Date Handling**: date-fns
- **HTTP Client**: Axios
- **Backend**: Netlify Functions (Serverless)
- **Database**: Airtable
- **Deployment**: Netlify
- **PWA**: Service Workers, Web App Manifest

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16.0.0 or higher) - [Download](https://nodejs.org/)
- **npm** (v8.0.0 or higher) - Comes with Node.js
- **Git** - [Download](https://git-scm.com/)
- **Airtable Account** - [Sign up](https://airtable.com/)
- **Netlify Account** (for deployment) - [Sign up](https://netlify.com/)

## 🚦 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/fitness-command-center.git
cd fitness-command-center
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```env
# Airtable Configuration
AIRTABLE_API_KEY=your_airtable_api_key_here
AIRTABLE_BASE_ID=your_airtable_base_id_here

# API Configuration
REACT_APP_API_URL=/.netlify/functions

# Optional: Development settings
NODE_ENV=development
```

### 4. Airtable Database Setup

#### Create Airtable Base
1. Go to [Airtable](https://airtable.com/) and create a new base
2. Create the following tables with these exact names:

**Workouts Table:**
| Field Name | Field Type | Description |
|------------|------------|-------------|
| Exercise | Single line text | Exercise name |
| Sets | Number | Number of sets |
| Reps | Number | Repetitions per set |
| Weight | Number | Weight used (lbs) |
| Date | Date | Workout date |
| Notes | Long text | Optional notes |

**BodyWeight Table:**
| Field Name | Field Type | Description |
|------------|------------|-------------|
| Weight | Number | Body weight |
| Date | Date | Measurement date |
| Unit | Single select | lbs, kg |
| Notes | Long text | Optional notes |

**Goals Table:**
| Field Name | Field Type | Description |
|------------|------------|-------------|
| Title | Single line text | Goal title |
| Type | Single select | Weight, Exercise PR, Frequency, Volume, Custom |
| Target Value | Number | Target to achieve |
| Current Value | Number | Current progress |
| Target Date | Date | Goal deadline |
| Status | Single select | Active, Completed, Paused |
| Created Date | Date | When goal was created |
| Description | Long text | Goal description |
| Priority | Single select | High, Medium, Low |

**Goal Progress Table:**
| Field Name | Field Type | Description |
|------------|------------|-------------|
| Goal | Link to Goals | Linked goal record |
| Progress Value | Number | Progress amount |
| Date | Date | Progress date |
| Notes | Long text | Progress notes |
| Milestone | Single select | 25%, 50%, 75%, 100% |

**Progress Records Table:**
| Field Name | Field Type | Description |
|------------|------------|-------------|
| Exercise | Single line text | Exercise name |
| Record Type | Single select | 1RM, Volume, Duration |
| Value | Number | Record value |
| Date | Date | Record date |
| Previous Record | Number | Previous best |
| Improvement | Number | Improvement amount |

**Workout Templates Table:**
| Field Name | Field Type | Description |
|------------|------------|-------------|
| Name | Single line text | Template name |
| Program | Single select | StrongLifts, 5/3/1, Custom |
| Exercises | Long text | Exercise list (JSON) |
| Notes | Long text | Template notes |

#### Get Your Airtable API Key
1. Go to [Airtable API](https://airtable.com/api)
2. Select your base
3. Copy your API key and Base ID
4. Update your `.env` file

### 5. Netlify Functions Setup

The app uses Netlify Functions for the backend API. Each function is located in `netlify/functions/` and has its own `package.json`.

#### Install Function Dependencies:
```bash
cd netlify/functions
npm install
cd ../..
```

### 6. Start Development Server

```bash
# For full functionality (React + Functions)
netlify dev

# Or for React only (limited functionality)
npm start
```

The app will be available at:
- **Full App**: http://localhost:8888 (recommended)
- **React Only**: http://localhost:3000

## 🔧 Development

### Available Scripts

```bash
# Start development with Netlify Functions
netlify dev

# Start React development server only
npm start

# Run tests
npm test

# Build for production
npm run build

# Run build and start local server
npm run build && npx serve -s build
```

### Project Structure

```
fitness-command-center/
├── public/                 # Static files
│   ├── manifest.json      # PWA manifest
│   ├── sw.js             # Service worker
│   └── ...
├── src/
│   ├── components/        # React components
│   │   ├── common/       # Shared components
│   │   ├── workouts/     # Workout-related components
│   │   ├── goals/        # Goal management components
│   │   ├── dashboard/    # Dashboard components
│   │   └── ...
│   ├── context/          # React contexts
│   ├── hooks/            # Custom hooks
│   ├── utils/            # Utility functions
│   └── styles/           # CSS files
├── netlify/
│   └── functions/        # Serverless functions
├── CLAUDE.md            # AI assistant instructions
└── README.md
```

### Key Components

- **App.js**: Main application with routing and lazy loading
- **Dashboard**: Analytics and insights overview
- **WorkoutForm**: Workout logging with PR detection
- **GoalTracker**: Goal management system
- **TrackingDashboard**: Advanced analytics sections
- **ChallengeSystem**: Gamification features
- **BuddySystem**: Social accountability features

### Development Guidelines

#### Adding New Features
1. Create components in appropriate directories
2. Use TypeScript-style prop validation
3. Implement error boundaries for robustness
4. Add loading states for better UX
5. Follow mobile-first responsive design
6. Test across different screen sizes

#### Code Style
- Use functional components with hooks
- Implement proper error handling
- Use meaningful component and variable names
- Keep components focused and single-purpose
- Optimize for performance with React.memo when needed

## 📱 PWA Setup

The app is PWA-ready with offline functionality:

### Service Worker Features
- **Offline Caching**: Static assets cached for offline use
- **Background Sync**: Sync workout data when back online
- **Push Notifications**: Goal reminders and achievement notifications

### Installation
Users can install the app on mobile/desktop:
1. Open the app in a supported browser
2. Look for "Add to Home Screen" or "Install App" prompt
3. Follow browser-specific installation steps

## 🚀 Deployment

### Netlify Deployment (Recommended)

1. **Connect Repository**:
   ```bash
   # Push your code to GitHub
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Netlify**:
   - Go to [Netlify Dashboard](https://app.netlify.com/)
   - Click "New site from Git"
   - Connect your GitHub repository
   - Configure build settings:
     - **Build command**: `npm install && npm run build`
     - **Publish directory**: `build`
     - **Functions directory**: `netlify/functions`

3. **Set Environment Variables**:
   - In Netlify dashboard, go to Site Settings > Environment Variables
   - Add your `AIRTABLE_API_KEY` and `AIRTABLE_BASE_ID`

4. **Configure Domain** (Optional):
   - Go to Domain Settings
   - Add your custom domain
   - Configure DNS settings

### Manual Deployment

```bash
# Build the project
npm run build

# Deploy build folder to your hosting service
# (Static hosting like Vercel, GitHub Pages, etc.)
```

## 🔒 Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `AIRTABLE_API_KEY` | Your Airtable API key | Yes | `keyXXXXXXXXXXXXXX` |
| `AIRTABLE_BASE_ID` | Your Airtable base ID | Yes | `appXXXXXXXXXXXXXX` |
| `REACT_APP_API_URL` | API endpoint URL | Yes | `/.netlify/functions` |
| `NODE_ENV` | Environment mode | No | `production` |

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage --watchAll=false
```

### Test Structure
- **Unit Tests**: Component testing with React Testing Library
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full user workflow testing (future)

## 🎨 Customization

### Themes
The app supports custom themes in `src/context/ThemeContext.js`:

```javascript
const themes = {
  dark: {
    colors: {
      primary: '#3B82F6',
      background: '#1F2937',
      // ... other colors
    }
  }
  // Add your custom theme
};
```

### Adding New Workout Programs
1. Create program logic in `src/utils/`
2. Add program options in `WorkoutForm.js`
3. Implement program-specific calculations

### Custom Analytics
1. Create new components in `src/components/analytics/`
2. Add to `TrackingDashboard.js` sections array
3. Implement data fetching and visualization

## 🚨 Troubleshooting

### Common Issues

#### Build Errors
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Netlify Function Errors
```bash
# Check function logs in Netlify dashboard
# Ensure environment variables are set
# Verify Airtable API key and base ID
```

#### PWA Installation Issues
```bash
# Ensure HTTPS is enabled
# Check manifest.json is accessible
# Verify service worker registration
```

#### Database Connection Issues
- Verify Airtable API key is valid
- Check base ID matches your Airtable base
- Ensure table names match exactly
- Verify field names and types are correct

### Debug Mode
Enable debug logging:
```javascript
// In browser console
localStorage.setItem('debug', 'fitness-app:*');
```

## 📚 API Documentation

### Workout Endpoints
- `POST /log-workout` - Log a new workout
- `GET /get-workouts` - Fetch workout history
- `DELETE /delete-workout/:id` - Delete a workout
- `GET /get-progression-suggestion` - Get progression recommendations

### Goals Endpoints
- `GET /goals` - Fetch all goals
- `POST /goals` - Create a new goal
- `POST /update-goal-progress` - Update goal progress
- `DELETE /goals/:id` - Delete a goal

### Analytics Endpoints
- `GET /get-analytics` - Fetch comprehensive analytics
- `GET /detect-prs` - Detect personal records
- `POST /n8n-webhook` - Handle automation webhooks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Create a Pull Request

### Development Setup for Contributors
```bash
git clone https://github.com/yourusername/fitness-command-center.git
cd fitness-command-center
npm install
cp .env.example .env
# Configure your environment variables
netlify dev
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React Team** - For the amazing framework
- **Netlify** - For seamless deployment and functions
- **Airtable** - For the flexible database solution
- **Tailwind CSS** - For the utility-first CSS framework
- **Recharts** - For beautiful data visualizations

## 📞 Support

- **Documentation**: Check this README and `CLAUDE.md`
- **Issues**: Create a GitHub issue for bugs
- **Discussions**: Use GitHub Discussions for questions
- **Email**: your-email@example.com

---

**Made with ❤️ for fitness enthusiasts**

*Track your progress, achieve your goals, and become the best version of yourself!*
