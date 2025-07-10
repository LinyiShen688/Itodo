'use client';

export default function Header({ currentTaskName = "今日待办" }) {
  return (
    <header>
      <div style={{ display: 'flex', alignItems: 'baseline' }}>
        <h1 className="app-title">墨迹清单</h1>
        <span className="current-task-name">{currentTaskName}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div className="pomodoro-icon" title="番茄钟"></div>
      </div>
    </header>
  );
} 