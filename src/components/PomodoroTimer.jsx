'use client';

import { useState, useEffect, useRef } from 'react';

const TIMER_MODES = {
  WORK: { duration: 25 * 60, label: '专注时间' },
  SHORT_BREAK: { duration: 5 * 60, label: '短休息' },
  LONG_BREAK: { duration: 15 * 60, label: '长休息' }
};

export default function PomodoroTimer({ isVisible, onClose }) {
  const [mode, setMode] = useState('WORK');
  const [timeLeft, setTimeLeft] = useState(TIMER_MODES.WORK.duration);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const intervalRef = useRef(null);

  // 格式化时间显示
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 计算进度百分比
  const getProgress = () => {
    const total = TIMER_MODES[mode].duration;
    return ((total - timeLeft) / total) * 100;
  };

  // 开始/暂停计时器
  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  // 重置计时器
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(TIMER_MODES[mode].duration);
    setIsCompleted(false);
  };

  // 切换模式
  const switchMode = (newMode) => {
    setMode(newMode);
    setTimeLeft(TIMER_MODES[newMode].duration);
    setIsRunning(false);
    setIsCompleted(false);
  };

  // 倒计时逻辑
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsCompleted(true);
            // 播放提示音（可选）
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('番茄钟提醒', {
                body: `${TIMER_MODES[mode].label}结束！`,
                icon: '/favicon.ico'
              });
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft, mode]);

  // 组件卸载时清理
  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="pomodoro-timer-container">
      {/* 背景遮罩 */}
      <div 
        className="pomodoro-backdrop"
        onClick={onClose}
      />
      
      {/* 主计时器面板 */}
      <div className="pomodoro-panel">
        {/* 关闭按钮 */}
        <button 
          className="pomodoro-close"
          onClick={onClose}
          title="关闭番茄钟"
        >
          ✕
        </button>

        {/* 模式选择 */}
        <div className="pomodoro-modes">
          {Object.entries(TIMER_MODES).map(([key, config]) => (
            <button
              key={key}
              className={`pomodoro-mode-btn ${mode === key ? 'active' : ''}`}
              onClick={() => switchMode(key)}
            >
              {config.label}
            </button>
          ))}
        </div>

        {/* 圆形进度条和时间显示 */}
        <div className="pomodoro-display">
          <svg className="pomodoro-progress" viewBox="0 0 120 120">
            {/* 背景圆环 */}
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="var(--parchment-dark)"
              strokeWidth="4"
            />
            {/* 进度圆环 */}
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="var(--accent-gold)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 54}`}
              strokeDashoffset={`${2 * Math.PI * 54 * (1 - getProgress() / 100)}`}
              transform="rotate(-90 60 60)"
              className="progress-ring"
            />
          </svg>
          
          {/* 时间文字 */}
          <div className="pomodoro-time">
            {formatTime(timeLeft)}
          </div>
          
          {/* 状态指示 */}
          {isCompleted && (
            <div className="pomodoro-status completed">
              ✓ 完成！
            </div>
          )}
        </div>

        {/* 控制按钮 */}
        <div className="pomodoro-controls">
          <button
            className="pomodoro-btn secondary"
            onClick={resetTimer}
            title="重置"
          >
            🔄
          </button>
          
          <button
            className={`pomodoro-btn primary ${isRunning ? 'pause' : 'play'}`}
            onClick={toggleTimer}
            disabled={isCompleted}
          >
            {isRunning ? '⏸️' : '▶️'}
          </button>
          
          <button
            className="pomodoro-btn secondary"
            onClick={() => {
              // 快速切换到下一个模式
              const modes = Object.keys(TIMER_MODES);
              const currentIndex = modes.indexOf(mode);
              const nextMode = modes[(currentIndex + 1) % modes.length];
              switchMode(nextMode);
            }}
            title="下一个模式"
          >
            ⏭️
          </button>
        </div>
      </div>

      <style jsx>{`
        .pomodoro-timer-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pomodoro-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(4px);
        }

        .pomodoro-panel {
          position: relative;
          background: var(--parchment);
          border: 2px solid var(--accent-gold);
          border-radius: 24px;
          padding: 2rem;
          box-shadow: 0 20px 40px var(--shadow-soft);
          max-width: 400px;
          width: 90vw;
          text-align: center;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .pomodoro-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: none;
          border: none;
          font-size: 1.5rem;
          color: var(--ink-brown);
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .pomodoro-close:hover {
          opacity: 1;
        }

        .pomodoro-modes {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          justify-content: center;
        }

        .pomodoro-mode-btn {
          padding: 0.5rem 1rem;
          border: 1px solid var(--accent-gold);
          background: transparent;
          color: var(--ink-brown);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Noto Serif SC', serif;
          font-size: 0.9rem;
        }

        .pomodoro-mode-btn:hover {
          background: var(--parchment-dark);
        }

        .pomodoro-mode-btn.active {
          background: var(--accent-gold);
          color: white;
        }

        .pomodoro-display {
          position: relative;
          margin: 2rem 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pomodoro-progress {
          width: 200px;
          height: 200px;
        }

        .progress-ring {
          transition: stroke-dashoffset 0.3s ease;
        }

        .pomodoro-time {
          position: absolute;
          font-family: 'Caveat', cursive;
          font-size: 3rem;
          font-weight: 700;
          color: var(--ink-black);
          text-shadow: 2px 2px 4px var(--shadow-soft);
        }

        .pomodoro-status {
          position: absolute;
          bottom: -2rem;
          left: 50%;
          transform: translateX(-50%);
          font-family: 'Noto Serif SC', serif;
          font-size: 1.1rem;
          color: var(--accent-gold);
          font-weight: 600;
        }

        .pomodoro-controls {
          display: flex;
          gap: 1rem;
          justify-content: center;
          align-items: center;
        }

        .pomodoro-btn {
          width: 3rem;
          height: 3rem;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
        }

        .pomodoro-btn.primary {
          background: linear-gradient(135deg, var(--accent-gold), var(--ink-brown));
          color: white;
          box-shadow: 0 4px 12px var(--shadow-soft);
          width: 4rem;
          height: 4rem;
          font-size: 1.5rem;
        }

        .pomodoro-btn.secondary {
          background: var(--parchment-dark);
          color: var(--ink-brown);
          border: 1px solid var(--accent-gold);
        }

        .pomodoro-btn:hover {
          transform: scale(1.1);
        }

        .pomodoro-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        /* 响应式适配 */
        @media (max-width: 768px) {
          .pomodoro-panel {
            padding: 1.5rem;
          }
          
          .pomodoro-progress {
            width: 160px;
            height: 160px;
          }
          
          .pomodoro-time {
            font-size: 2.5rem;
          }
          
          .pomodoro-modes {
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .pomodoro-mode-btn {
            font-size: 0.8rem;
            padding: 0.4rem 0.8rem;
          }
        }
      `}</style>
    </div>
  );
} 