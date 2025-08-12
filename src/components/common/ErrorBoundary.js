import React from 'react';
import { useTheme } from '../../context/ThemeContext';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Log error to monitoring service if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.toString(),
        fatal: false
      });
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: prevState.retryCount + 1 
    }));
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback 
        error={this.state.error}
        errorInfo={this.state.errorInfo}
        onRetry={this.handleRetry}
        retryCount={this.state.retryCount}
        componentName={this.props.componentName}
      />;
    }

    return this.props.children;
  }
}

const ErrorFallback = ({ error, errorInfo, onRetry, retryCount, componentName = 'Component' }) => {
  return (
    <ErrorFallbackUI 
      error={error}
      errorInfo={errorInfo}
      onRetry={onRetry}
      retryCount={retryCount}
      componentName={componentName}
    />
  );
};

const ErrorFallbackUI = ({ error, errorInfo, onRetry, retryCount, componentName }) => {
  const { theme } = useTheme();
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  const maxRetries = 3;

  return (
    <div 
      className="min-h-[200px] flex items-center justify-center p-6 rounded-lg border-2 border-dashed"
      style={{ 
        backgroundColor: theme.colors.backgroundSecondary,
        borderColor: theme.colors.border
      }}
    >
      <div className="text-center max-w-md">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 
          className="text-lg font-semibold mb-2"
          style={{ color: theme.colors.text }}
        >
          Something went wrong in {componentName}
        </h3>
        <p 
          className="text-sm mb-4"
          style={{ color: theme.colors.textSecondary }}
        >
          {isDevelopment && error?.message 
            ? error.message 
            : "We're having trouble loading this section. Please try again."
          }
        </p>
        
        {retryCount < maxRetries && (
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 mr-2"
            style={{
              backgroundColor: theme.colors.primary,
              color: theme.colors.background,
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = theme.colors.primaryHover;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = theme.colors.primary;
            }}
          >
            Try Again {retryCount > 0 && `(${retryCount}/${maxRetries})`}
          </button>
        )}
        
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
          style={{
            backgroundColor: theme.colors.backgroundSecondary,
            color: theme.colors.textSecondary,
            border: `1px solid ${theme.colors.border}`
          }}
        >
          Refresh Page
        </button>
        
        {isDevelopment && errorInfo && (
          <details className="mt-4 text-left">
            <summary 
              className="cursor-pointer text-sm font-medium"
              style={{ color: theme.colors.textSecondary }}
            >
              Error Details (Development)
            </summary>
            <pre 
              className="mt-2 text-xs p-2 rounded overflow-auto max-h-40"
              style={{ 
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                border: `1px solid ${theme.colors.border}`
              }}
            >
              {error?.stack || error?.toString()}
              {errorInfo?.componentStack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

export default ErrorBoundary;