// Bundle optimization utilities

// Lazy load heavy libraries only when needed
export const lazyLoadCharts = () => {
  return import('recharts').catch(error => {
    console.error('Failed to load charts library:', error);
    return null;
  });
};

export const lazyLoadDateFns = () => {
  return import('date-fns').catch(error => {
    console.error('Failed to load date-fns library:', error);
    return null;
  });
};

export const lazyLoadAxios = () => {
  return import('axios').catch(error => {
    console.error('Failed to load axios library:', error);
    return null;
  });
};

// Dynamic component loading with error boundaries
export const loadComponentWithRetry = (importFunc, retries = 3) => {
  return importFunc().catch(error => {
    if (retries > 0) {
      console.warn(`Component load failed, retrying... (${retries} attempts left)`);
      return new Promise(resolve => {
        setTimeout(() => resolve(loadComponentWithRetry(importFunc, retries - 1)), 1000);
      });
    }
    throw error;
  });
};

// Preload critical chunks
export const preloadCriticalChunks = () => {
  const criticalComponents = [
    () => import('../components/dashboard/Dashboard'),
    () => import('../components/workouts/WorkoutForm'),
    () => import('../components/workouts/WorkoutHistory')
  ];
  
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      criticalComponents.forEach(component => {
        component().catch(() => {
          // Fail silently for preloading
        });
      });
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      criticalComponents.forEach(component => {
        component().catch(() => {
          // Fail silently for preloading
        });
      });
    }, 2000);
  }
};

// Route-based code splitting
export const getRouteComponent = (route) => {
  const routes = {
    '/dashboard': () => import('../components/dashboard/Dashboard'),
    '/workout': () => import('../components/workouts/WorkoutDashboard'),
    '/tracking': () => import('../components/tracking/TrackingDashboard'),
    '/goals': () => import('../components/goals/GoalTracker'),
    '/history': () => import('../components/workouts/WorkoutHistory'),
    '/badges': () => import('../components/badges/BadgeDisplay'),
    '/challenges': () => import('../components/challenges/ChallengeSystem'),
    '/buddies': () => import('../components/social/BuddySystem')
  };
  
  return routes[route] || (() => Promise.resolve(null));
};

// Tree shaking utilities
export const importOnlyNeeded = {
  // Import only needed date-fns functions
  dateUtils: async () => {
    const { format, subDays, addDays, startOfWeek, endOfWeek } = await import('date-fns');
    return { format, subDays, addDays, startOfWeek, endOfWeek };
  },
  
  // Import only needed chart components
  chartUtils: async () => {
    const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } = await import('recharts');
    return { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar };
  },
  
  // Import only needed React Hook Form functions
  formUtils: async () => {
    const { useForm, useController } = await import('react-hook-form');
    return { useForm, useController };
  }
};

// Bundle analyzer helpers
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Bundle analysis available in production build');
    return;
  }
  
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  
  const bundleInfo = {
    scripts: scripts.map(script => ({
      src: script.src,
      size: script.getAttribute('data-size') || 'unknown'
    })),
    styles: styles.map(style => ({
      href: style.href,
      size: style.getAttribute('data-size') || 'unknown'
    }))
  };
  
  console.table(bundleInfo.scripts);
  console.table(bundleInfo.styles);
  
  return bundleInfo;
};

// Resource hints for performance
export const addResourceHints = () => {
  const hints = [
    { rel: 'preconnect', href: 'https://api.airtable.com' },
    { rel: 'dns-prefetch', href: 'https://api.airtable.com' },
    { rel: 'preload', href: '/fonts/main.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' }
  ];
  
  hints.forEach(hint => {
    const link = document.createElement('link');
    Object.assign(link, hint);
    document.head.appendChild(link);
  });
};

// Module federation for micro-frontends (future enhancement)
export const loadRemoteModule = async (remoteUrl, moduleName) => {
  try {
    await import(/* webpackIgnore: true */ remoteUrl);
    return window[moduleName];
  } catch (error) {
    console.error('Failed to load remote module:', error);
    return null;
  }
};

// Performance budget monitoring
export const checkPerformanceBudget = () => {
  const budgets = {
    totalJS: 250 * 1024, // 250KB
    totalCSS: 50 * 1024,  // 50KB
    images: 500 * 1024    // 500KB
  };
  
  if ('performance' in window && performance.getEntriesByType) {
    const resources = performance.getEntriesByType('resource');
    
    const sizes = {
      totalJS: 0,
      totalCSS: 0,
      images: 0
    };
    
    resources.forEach(resource => {
      const size = resource.transferSize || 0;
      
      if (resource.name.includes('.js')) {
        sizes.totalJS += size;
      } else if (resource.name.includes('.css')) {
        sizes.totalCSS += size;
      } else if (resource.initiatorType === 'img') {
        sizes.images += size;
      }
    });
    
    Object.entries(budgets).forEach(([type, budget]) => {
      const actual = sizes[type];
      const percentage = (actual / budget) * 100;
      
      console.log(`${type}: ${Math.round(actual / 1024)}KB / ${Math.round(budget / 1024)}KB (${Math.round(percentage)}%)`);
      
      if (actual > budget) {
        console.warn(`⚠️ Performance budget exceeded for ${type}!`);
      }
    });
    
    return sizes;
  }
  
  return null;
};