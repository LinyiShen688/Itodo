'use client';

import { LoadingSpinner, LoadingDots, QuadrantSkeleton, TaskSkeleton } from './LoadingSpinner';

export default function LoadingState({ 
  type = 'spinner', 
  message = '加载中...', 
  overlay = false,
  size = 'md',
  className = '',
  children 
}) {
  const renderLoadingContent = () => {
    switch (type) {
      case 'dots':
        return (
          <div className="flex flex-col items-center space-y-3">
            <LoadingDots className="text-[var(--ink-brown)]" />
            {message && <p className="text-sm text-[var(--ink-brown)] opacity-70">{message}</p>}
          </div>
        );
      
      case 'skeleton-task':
        return <TaskSkeleton count={3} />;
      
      case 'skeleton-quadrant':
        return <QuadrantSkeleton />;
      
      case 'minimal':
        return (
          <div className="flex items-center space-x-2">
            <LoadingSpinner size="sm" />
            {message && <span className="text-sm text-[var(--ink-brown)]">{message}</span>}
          </div>
        );
      
      case 'spinner':
      default:
        return (
          <div className="flex flex-col items-center space-y-3">
            <LoadingSpinner size={size} />
            {message && <p className="text-sm text-[var(--ink-brown)] opacity-70">{message}</p>}
          </div>
        );
    }
  };

  if (overlay) {
    return (
      <div className={`fixed inset-0 z-50 bg-white bg-opacity-80 backdrop-blur-sm ${className}`}>
        <div className="flex items-center justify-center min-h-screen">
          {renderLoadingContent()}
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center py-8 ${className}`}>
      {renderLoadingContent()}
      {children}
    </div>
  );
}

// 智能加载状态包装器
export function LoadingWrapper({ 
  loading, 
  error, 
  empty, 
  emptyMessage = '暂无数据',
  errorMessage = '加载失败',
  loadingType = 'spinner',
  loadingMessage = '加载中...',
  children,
  onRetry
}) {
  if (loading) {
    return (
      <LoadingState 
        type={loadingType} 
        message={loadingMessage}
      />
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-4">❌ {errorMessage}</div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-[var(--accent-gold)] text-white rounded hover:opacity-80 transition-opacity"
          >
            重试
          </button>
        )}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="text-center py-8">
        <div className="text-[var(--ink-brown)] opacity-60">📝 {emptyMessage}</div>
      </div>
    );
  }

  return children;
}