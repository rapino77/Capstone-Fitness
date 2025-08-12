// CSS-in-JS optimization utilities

// Critical CSS extractor
export const extractCriticalCSS = () => {
  const criticalStyles = [];
  const styleSheets = Array.from(document.styleSheets);
  
  styleSheets.forEach(sheet => {
    try {
      const rules = Array.from(sheet.cssRules || sheet.rules || []);
      rules.forEach(rule => {
        if (rule.type === CSSRule.STYLE_RULE) {
          const selector = rule.selectorText;
          if (document.querySelector(selector)) {
            criticalStyles.push(rule.cssText);
          }
        }
      });
    } catch (e) {
      // Handle CORS issues with external stylesheets
      console.warn('Could not access stylesheet:', sheet.href);
    }
  });
  
  return criticalStyles.join('\n');
};

// Inline critical CSS for above-the-fold content
export const inlineCriticalCSS = (css) => {
  const style = document.createElement('style');
  style.textContent = css;
  style.setAttribute('data-critical', 'true');
  document.head.insertBefore(style, document.head.firstChild);
};

// Lazy load non-critical CSS
export const loadNonCriticalCSS = (href) => {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.media = 'print'; // Load as non-blocking
    link.onload = () => {
      link.media = 'all'; // Apply to all media
      resolve();
    };
    link.onerror = reject;
    document.head.appendChild(link);
  });
};

// Remove unused CSS classes
export const removeUnusedCSS = () => {
  const usedClasses = new Set();
  const allElements = document.querySelectorAll('*');
  
  allElements.forEach(element => {
    if (element.className && typeof element.className === 'string') {
      element.className.split(/\s+/).forEach(className => {
        if (className) usedClasses.add(className);
      });
    }
  });
  
  return Array.from(usedClasses);
};

// Dynamic theme loading optimization
export const optimizeThemeLoading = (theme) => {
  const themeId = `theme-${theme}`;
  const existingTheme = document.getElementById(themeId);
  
  if (existingTheme) {
    return Promise.resolve();
  }
  
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.id = themeId;
    link.rel = 'stylesheet';
    link.href = `/themes/${theme}.css`;
    link.onload = resolve;
    
    // Remove other theme stylesheets
    document.querySelectorAll('[id^="theme-"]').forEach(el => {
      if (el.id !== themeId) el.remove();
    });
    
    document.head.appendChild(link);
  });
};

// Preload fonts
export const preloadFont = (fontFamily, fontWeight = 'normal', fontStyle = 'normal') => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'font';
  link.type = 'font/woff2';
  link.crossOrigin = 'anonymous';
  link.href = `/fonts/${fontFamily}-${fontWeight}-${fontStyle}.woff2`;
  document.head.appendChild(link);
};

// CSS Custom Properties optimization
export const optimizeCustomProperties = (properties) => {
  const root = document.documentElement;
  const currentProperties = {};
  
  // Read current values
  Object.keys(properties).forEach(prop => {
    currentProperties[prop] = getComputedStyle(root).getPropertyValue(`--${prop}`);
  });
  
  // Update only changed properties
  Object.entries(properties).forEach(([prop, value]) => {
    if (currentProperties[prop] !== value) {
      root.style.setProperty(`--${prop}`, value);
    }
  });
};

// Performance-aware CSS animations
export const createOptimizedAnimation = (element, keyframes, options = {}) => {
  const defaultOptions = {
    duration: 300,
    easing: 'ease-out',
    fill: 'both'
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  // Use Web Animations API for better performance
  if (element.animate) {
    return element.animate(keyframes, mergedOptions);
  }
  
  // Fallback to CSS animations
  return new Promise((resolve) => {
    const animationName = `anim-${Date.now()}`;
    const keyframeString = `@keyframes ${animationName} {
      ${Object.entries(keyframes).map(([key, value]) => 
        `${key} { ${Object.entries(value).map(([prop, val]) => `${prop}: ${val}`).join('; ')} }`
      ).join('\n')}
    }`;
    
    const style = document.createElement('style');
    style.textContent = keyframeString;
    document.head.appendChild(style);
    
    element.style.animation = `${animationName} ${mergedOptions.duration}ms ${mergedOptions.easing}`;
    
    setTimeout(() => {
      element.style.animation = '';
      document.head.removeChild(style);
      resolve();
    }, mergedOptions.duration);
  });
};

// Batch DOM updates for better performance
export const batchDOMUpdates = (updates) => {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      updates.forEach(update => update());
      resolve();
    });
  });
};

// CSS containment optimization
export const applyContainment = (element, types = ['layout', 'style', 'paint']) => {
  if ('contain' in element.style) {
    element.style.contain = types.join(' ');
  }
};

// Optimize reflows and repaints
export const optimizeLayout = (element) => {
  // Use transform instead of changing layout properties
  const optimizedTransform = (x, y, scale = 1) => {
    element.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  };
  
  // Use opacity for show/hide instead of display
  const optimizedVisibility = (visible) => {
    element.style.opacity = visible ? '1' : '0';
    element.style.visibility = visible ? 'visible' : 'hidden';
  };
  
  return { optimizedTransform, optimizedVisibility };
};