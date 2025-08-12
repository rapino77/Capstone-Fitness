import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const MobileOptimized = ({ 
  children, 
  className = '', 
  mobileClassName = '', 
  padding = true, 
  rounded = true, 
  shadow = true,
  animation = true,
  ...props 
}) => {
  const { theme } = useTheme();
  
  const baseClasses = [
    'transition-all duration-200',
    className
  ].filter(Boolean).join(' ');
  
  const mobileClasses = [
    'mobile-optimized',
    padding ? 'mobile-padding' : '',
    rounded ? 'mobile-rounded' : '',
    shadow ? 'mobile-shadow' : '',
    animation ? 'mobile-slide-in' : '',
    mobileClassName
  ].filter(Boolean).join(' ');
  
  return (
    <div 
      className={`${baseClasses} ${mobileClasses}`}
      style={{
        backgroundColor: theme.colors.background,
        borderColor: theme.colors.border,
        color: theme.colors.text
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// Mobile-optimized button component
export const MobileButton = ({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  fullWidth = false,
  disabled = false,
  loading = false,
  className = '',
  ...props 
}) => {
  const { theme } = useTheme();
  
  const baseClasses = 'mobile-button touch-manipulation transition-all duration-200 font-semibold flex items-center justify-center relative overflow-hidden';
  
  const sizeClasses = {
    small: 'px-4 py-2 text-sm min-h-[44px]',
    medium: 'px-6 py-3 text-base min-h-[52px]',
    large: 'px-8 py-4 text-lg min-h-[60px]'
  };
  
  const variantStyles = {
    primary: {
      backgroundColor: theme.colors.primary,
      color: theme.colors.background,
      border: 'none'
    },
    secondary: {
      backgroundColor: 'transparent',
      color: theme.colors.primary,
      border: `2px solid ${theme.colors.primary}`
    },
    outline: {
      backgroundColor: 'transparent',
      color: theme.colors.text,
      border: `2px solid ${theme.colors.border}`
    }
  };
  
  const buttonClasses = [
    baseClasses,
    sizeClasses[size],
    fullWidth ? 'w-full' : '',
    disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95',
    className
  ].filter(Boolean).join(' ');
  
  return (
    <button
      className={buttonClasses}
      style={variantStyles[variant]}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <span className={loading ? 'opacity-0' : 'opacity-100'}>
        {children}
      </span>
    </button>
  );
};

// Mobile-optimized input component
export const MobileInput = ({ 
  label, 
  error, 
  className = '', 
  inputClassName = '',
  ...props 
}) => {
  const { theme } = useTheme();
  
  return (
    <div className={`mobile-input-wrapper ${className}`}>
      {label && (
        <label className="block text-sm font-semibold mb-2 transition-colors duration-200"
               style={{ color: theme.colors.text }}>
          {label}
        </label>
      )}
      <input
        className={`mobile-input w-full transition-all duration-200 ${inputClassName}`}
        style={{
          backgroundColor: theme.colors.background,
          borderColor: error ? theme.colors.error : theme.colors.border,
          color: theme.colors.text
        }}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm font-medium" style={{ color: theme.colors.error }}>
          {error}
        </p>
      )}
    </div>
  );
};

// Mobile-optimized card component
export const MobileCard = ({ 
  children, 
  className = '',
  hover = true,
  padding = true,
  ...props 
}) => {
  const { theme } = useTheme();
  
  const cardClasses = [
    'mobile-card themed-card',
    hover ? 'hover:shadow-lg hover:scale-[1.02]' : '',
    padding ? 'p-4 sm:p-6' : '',
    className
  ].filter(Boolean).join(' ');
  
  return (
    <div 
      className={cardClasses}
      style={{
        backgroundColor: theme.colors.background,
        borderColor: theme.colors.border
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// Mobile-optimized section header
export const MobileHeader = ({ 
  children, 
  level = 2, 
  className = '',
  center = false,
  ...props 
}) => {
  const { theme } = useTheme();
  const Tag = `h${level}`;
  
  const headerClasses = [
    'mobile-heading font-bold transition-colors duration-200',
    center ? 'text-center' : '',
    className
  ].filter(Boolean).join(' ');
  
  return (
    <Tag 
      className={headerClasses}
      style={{ color: theme.colors.text }}
      {...props}
    >
      {children}
    </Tag>
  );
};

export default MobileOptimized;