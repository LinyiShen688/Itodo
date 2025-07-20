'use client';

export function LoadingSpinner({ size = 'md', color = 'primary', className = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'text-[var(--ink-brown)]',
    secondary: 'text-[var(--accent-gold)]',
    white: 'text-white',
    gray: 'text-gray-500'
  };

  return (
    <div
      className={`
        inline-block animate-spin rounded-full border-2 border-solid border-current border-r-transparent
        ${sizeClasses[size]} ${colorClasses[color]} ${className}
      `}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function LoadingDots({ className = '' }) {
  return (
    <div className={`flex space-x-1 ${className}`}>
      <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
    </div>
  );
}

export function LoadingPulse({ className = '' }) {
  return (
    <div className={`w-full h-2 bg-gray-200 rounded-full overflow-hidden ${className}`}>
      <div 
        className="h-full bg-gradient-to-r from-[var(--accent-gold)] to-[var(--ink-brown)] rounded-full animate-pulse"
        style={{
          animation: 'pulse-loading 1.5s ease-in-out infinite'
        }}
      />
      <style jsx>{`
        @keyframes pulse-loading {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

// 骨架屏组件
export function TaskSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200">
            <div className="w-4 h-4 bg-gray-200 rounded"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="w-16 h-6 bg-gray-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function QuadrantSkeleton() {
  return (
    <div className="quadrant animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
      <TaskSkeleton count={3} />
    </div>
  );
}