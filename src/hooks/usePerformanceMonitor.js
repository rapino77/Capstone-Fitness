import { useEffect, useRef, useCallback } from 'react';

// Performance monitoring hook with Web Vitals
export const usePerformanceMonitor = (componentName, options = {}) => {
  const {
    enableLogging = process.env.NODE_ENV === 'development',
    enableWebVitals = true,
    enableRenderTracking = true
  } = options;
  
  const renderCount = useRef(0);
  const mountTime = useRef(Date.now());
  const lastRenderTime = useRef(Date.now());
  
  // Track render performance
  useEffect(() => {
    if (enableRenderTracking) {
      renderCount.current += 1;
      const now = Date.now();
      const renderTime = now - lastRenderTime.current;
      lastRenderTime.current = now;
      
      if (enableLogging && renderCount.current > 1) {
        console.log(`[Performance] ${componentName} render #${renderCount.current} took ${renderTime}ms`);
        
        if (renderTime > 16) {
          console.warn(`[Performance] ${componentName} slow render detected: ${renderTime}ms (target: <16ms)`);
        }
      }
    }
  });
  
  // Track mount time
  useEffect(() => {
    if (enableLogging) {
      const mountDuration = Date.now() - mountTime.current;
      console.log(`[Performance] ${componentName} mounted in ${mountDuration}ms`);
    }
    
    return () => {
      if (enableLogging) {
        const totalLifetime = Date.now() - mountTime.current;
        console.log(`[Performance] ${componentName} unmounted after ${totalLifetime}ms, ${renderCount.current} renders`);
      }
    };
  }, [componentName, enableLogging]);
  
  // Web Vitals integration
  useEffect(() => {
    if (enableWebVitals && 'web-vitals' in window) {
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(console.log);
        getFID(console.log);
        getFCP(console.log);
        getLCP(console.log);
        getTTFB(console.log);
      }).catch(() => {
        // Fail silently if web-vitals not available
      });
    }
  }, [enableWebVitals]);
  
  return {
    renderCount: renderCount.current,
    mountTime: mountTime.current
  };
};

// Performance measurement utility
export const measurePerformance = (name, fn) => {
  return async (...args) => {
    const start = performance.now();
    try {
      const result = await fn(...args);
      const duration = performance.now() - start;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${name} took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`[Performance] ${name} failed after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  };
};

// React component profiler
export const ProfiledComponent = ({ name, children, onRender }) => {
  const handleRender = useCallback((id, phase, actualDuration, baseDuration, startTime, commitTime) => {
    const metrics = {
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      efficiency: baseDuration > 0 ? (actualDuration / baseDuration) : 1
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Profiler] ${name}:`, metrics);
      
      if (actualDuration > 16) {
        console.warn(`[Profiler] ${name} slow render: ${actualDuration.toFixed(2)}ms`);
      }
    }
    
    if (onRender) {
      onRender(metrics);
    }
  }, [name, onRender]);
  
  if (process.env.NODE_ENV === 'development') {
    const { Profiler } = require('react');
    return (
      <Profiler id={name} onRender={handleRender}>
        {children}
      </Profiler>
    );
  }
  
  return children;
};

// Memory usage tracking
export const useMemoryMonitor = (componentName) => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
      const checkMemory = () => {
        const memory = performance.memory;
        console.log(`[Memory] ${componentName}:`, {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB',
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
        });
      };
      
      checkMemory();
      
      return () => {
        checkMemory();
      };
    }
  }, [componentName]);
};