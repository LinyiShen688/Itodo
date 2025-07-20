'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTaskStore } from '@/stores/taskStore';

const QUADRANT_NAMES = {
  1: '重要且紧急',
  2: '重要不紧急',
  3: '紧急不重要',
  4: '不重要不紧急'
};

export default function SummaryModal({ isVisible, onClose }) {
  const { tasks } = useTaskStore();

  const completedTasks = useMemo(() => {
    if (!tasks) return [];
    const allTasks = Object.values(tasks).flat();
    return allTasks
      .filter(task => task.completed)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [tasks]);

  const groupedTasks = useMemo(() => {
    const groups = {
      'today': [],
      'yesterday': [],
      'thisWeek': [],
      'thisMonth': [],
      'older': []
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(startOfWeek.getDate() - today.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    completedTasks.forEach(task => {
      const taskDate = new Date(task.updatedAt);
      if (taskDate >= today) {
        groups.today.push(task);
      } else if (taskDate >= yesterday) {
        groups.yesterday.push(task);
      } else if (taskDate >= startOfWeek) {
        groups.thisWeek.push(task);
      } else if (taskDate >= startOfMonth) {
        groups.thisMonth.push(task);
      } else {
        groups.older.push(task);
      }
    });
    return groups;
  }, [completedTasks]);

  if (!isVisible) return null;

  const renderTaskGroup = (title, tasks) => {
    if (tasks.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-[var(--ink-brown)] border-b-2 border-[var(--accent-gold)] pb-2 mb-3" style={{ fontFamily: "'Noto Serif SC', serif" }}>
          {title}
        </h3>
        <ul className="space-y-2">
          {tasks.map(task => (
            <li key={task.id} className="text-sm text-[var(--ink-black)] flex items-center">
               <span className="text-green-600 mr-2">✓</span>
               <span>{task.text}</span>
               <span className="ml-auto text-xs opacity-60">({QUADRANT_NAMES[task.quadrant]})</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="summary-modal-container">
      <div 
        className="summary-backdrop"
        onClick={onClose}
      />
      
      <div className="summary-panel">
        <button 
          className="summary-close"
          onClick={onClose}
          title="关闭总结"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold text-center text-[var(--ink-brown)] mb-6" style={{ fontFamily: "'Caveat', cursive" }}>
          任务总结
        </h2>

        <div className="max-h-[60vh] overflow-y-auto pr-4 -mr-4">
          {completedTasks.length === 0 ? (
             <p className="text-center text-[var(--ink-brown)] opacity-80">还没有已完成的任务哦。</p>
          ) : (
            <>
              {renderTaskGroup('今天', groupedTasks.today)}
              {renderTaskGroup('昨天', groupedTasks.yesterday)}
              {renderTaskGroup('本周', groupedTasks.thisWeek)}
              {renderTaskGroup('本月', groupedTasks.thisMonth)}
              {renderTaskGroup('更早', groupedTasks.older)}
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .summary-modal-container {
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

        .summary-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(4px);
        }

        .summary-panel {
          position: relative;
          background: var(--parchment);
          border: 2px solid var(--accent-gold);
          border-radius: 24px;
          padding: 2rem;
          box-shadow: 0 20px 40px var(--shadow-soft);
          max-width: 500px;
          width: 90vw;
          text-align: left;
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

        .summary-close {
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
        .summary-close:hover {
          opacity: 1;
        }
      `}</style>
    </div>
  );
} 