import React, { useState, useRef, useEffect, useCallback } from 'react';

const OptimizedImage = ({
  src,
  alt,
  className = '',
  width,
  height,
  placeholder = 'blur',
  blurDataURL,
  priority = false,
  loading = 'lazy',
  quality = 75,
  onLoad,
  onError,
  ...props
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [inView, setInView] = useState(priority);
  const imgRef = useRef(null);
  const observerRef = useRef(null);
  
  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!priority && !inView) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setInView(true);
              observerRef.current?.unobserve(entry.target);
            }
          });
        },
        {
          rootMargin: '50px' // Start loading 50px before image comes into view
        }
      );
      
      if (imgRef.current) {
        observerRef.current.observe(imgRef.current);
      }
    }
    
    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority, inView]);
  
  const handleLoad = useCallback((event) => {
    setImageLoaded(true);
    setImageError(false);
    onLoad?.(event);
  }, [onLoad]);
  
  const handleError = useCallback((event) => {
    setImageError(true);
    setImageLoaded(false);
    onError?.(event);
  }, [onError]);
  
  // Generate optimized src URLs (for services like Cloudinary, Imgix, etc.)
  const getOptimizedSrc = useCallback((originalSrc, width, height, quality) => {
    // If using a service like Cloudinary, apply transformations
    // For now, return original src
    return originalSrc;
  }, []);
  
  // Generate srcSet for responsive images
  const generateSrcSet = useCallback((src) => {
    if (!width || !height) return undefined;
    
    const sizes = [1, 1.5, 2, 3]; // Different density versions
    return sizes.map(size => {
      const scaledWidth = Math.round(width * size);
      const scaledHeight = Math.round(height * size);
      const optimizedSrc = getOptimizedSrc(src, scaledWidth, scaledHeight, quality);
      return `${optimizedSrc} ${size}x`;
    }).join(', ');
  }, [width, height, quality, getOptimizedSrc]);
  
  // Placeholder component
  const Placeholder = ({ show }) => {
    if (!show) return null;
    
    if (placeholder === 'blur' && blurDataURL) {
      return (
        <img
          src={blurDataURL}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            imageLoaded ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ filter: 'blur(10px)' }}
        />
      );
    }
    
    if (placeholder === 'empty') {
      return (
        <div
          className={`absolute inset-0 bg-gray-200 transition-opacity duration-300 ${
            imageLoaded ? 'opacity-0' : 'opacity-100'
          }`}
        />
      );
    }
    
    // Default shimmer placeholder
    return (
      <div
        className={`absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse transition-opacity duration-300 ${
          imageLoaded ? 'opacity-0' : 'opacity-100'
        }`}
      />
    );
  };
  
  // Error fallback
  const ErrorFallback = () => (
    <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-400">
      <div className="text-center">
        <div className="text-2xl mb-2">📷</div>
        <div className="text-sm">Failed to load</div>
      </div>
    </div>
  );
  
  const shouldLoad = priority || inView;
  const srcSet = generateSrcSet(src);
  const optimizedSrc = getOptimizedSrc(src, width, height, quality);
  
  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
      {...props}
    >
      {shouldLoad && !imageError && (
        <img
          src={optimizedSrc}
          srcSet={srcSet}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : loading}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          decoding="async"
        />
      )}
      
      {imageError ? (
        <ErrorFallback />
      ) : (
        <Placeholder show={!imageLoaded} />
      )}
    </div>
  );
};

// Higher-order component for progressive image enhancement
export const withImageOptimization = (WrappedComponent) => {
  return React.forwardRef((props, ref) => {
    const optimizedProps = {
      ...props,
      // Apply default optimizations
      loading: props.loading || 'lazy',
      quality: props.quality || 75
    };
    
    return <WrappedComponent ref={ref} {...optimizedProps} />;
  });
};

// Hook for preloading images
export const useImagePreload = (sources) => {
  const [preloadedImages, setPreloadedImages] = useState(new Set());
  
  useEffect(() => {
    const preloadImage = (src) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(src);
        img.onerror = reject;
        img.src = src;
      });
    };
    
    const preloadAll = async () => {
      try {
        const loaded = await Promise.allSettled(
          sources.map(src => preloadImage(src))
        );
        
        const successful = loaded
          .filter(result => result.status === 'fulfilled')
          .map(result => result.value);
        
        setPreloadedImages(new Set(successful));
      } catch (error) {
        console.warn('Image preload failed:', error);
      }
    };
    
    if (sources.length > 0) {
      preloadAll();
    }
  }, [sources]);
  
  return preloadedImages;
};

export default OptimizedImage;