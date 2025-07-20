'use client';

import { useEffect, useState } from 'react';

const TOAST_TYPES = {
  success: {
    icon: '✅',
    className: 'bg-green-50 border-green-200 text-green-800',
    progressColor: 'bg-green-400'
  },
  error: {
    icon: '❌',
    className: 'bg-red-50 border-red-200 text-red-800',
    progressColor: 'bg-red-400'
  },
  warning: {
    icon: '⚠️',
    className: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    progressColor: 'bg-yellow-400'
  },
  info: {
    icon: 'ℹ️',
    className: 'bg-blue-50 border-blue-200 text-blue-800',
    progressColor: 'bg-blue-400'
  }
};

export default function Toast({ 
  message, 
  type = 'info', 
  duration = 3000, 
  onClose,
  action,
  showProgress = true 
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const [isClosing, setIsClosing] = useState(false);

  const config = TOAST_TYPES[type] || TOAST_TYPES.info;

  useEffect(() => {
    // 动画进入
    const showTimer = setTimeout(() => setIsVisible(true), 10);
    
    // 进度条动画
    if (showProgress && duration > 0) {
      const progressTimer = setTimeout(() => {
        setProgress(0);
      }, 100);
      
      // 自动关闭
      const closeTimer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(progressTimer);
        clearTimeout(closeTimer);
      };
    }

    return () => clearTimeout(showTimer);
  }, [duration, showProgress]);

  const handleClose = () => {
    setIsClosing(true);
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 200); // 等待退出动画完成
  };

  const handleActionClick = (e) => {
    e.stopPropagation();
    action?.onClick?.();
    if (action?.closeOnClick !== false) {
      handleClose();
    }
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-[9999] max-w-sm w-full
        transform transition-all duration-200 ease-out
        ${isVisible && !isClosing 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
        }
      `}
      onClick={handleClose}
      role="alert"
      aria-live="polite"
    >
      <div
        className={`
          relative overflow-hidden rounded-lg border shadow-lg cursor-pointer
          ${config.className}
        `}
      >
        {/* 进度条 */}
        {showProgress && duration > 0 && (
          <div className="absolute top-0 left-0 h-1 w-full bg-black bg-opacity-10">
            <div
              className={`h-full transition-all ease-linear ${config.progressColor}`}
              style={{
                width: `${progress}%`,
                transitionDuration: `${duration - 100}ms`
              }}
            />
          </div>
        )}

        {/* 内容 */}
        <div className="flex items-start gap-3 p-4">
          <div className="flex-shrink-0 text-lg">
            {config.icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium break-words">
              {message}
            </p>
            
            {/* 操作按钮 */}
            {action && (
              <button
                onClick={handleActionClick}
                className="mt-2 text-xs underline hover:no-underline focus:outline-none focus:ring-1 focus:ring-current rounded"
              >
                {action.label}
              </button>
            )}
          </div>

          {/* 关闭按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="flex-shrink-0 text-current opacity-50 hover:opacity-75 focus:outline-none focus:ring-1 focus:ring-current rounded"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}