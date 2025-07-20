'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import DraggableTaskItem from './DraggableTaskItem';

const QUADRANT_CLASSES = {
  1: 'first-quadrant',
  2: 'second-quadrant', 
  3: 'third-quadrant',
  4: 'fourth-quadrant'
};

// 记忆化 TaskItem 渲染
const MemoizedTaskItem = ({ task, quadrantId, onUpdate, onDelete, onToggleComplete, onUpdateText, showETA }) => (
  <DraggableTaskItem
    key={task.id}
    task={task}
    quadrantId={quadrantId}
    onUpdate={onUpdate}
    onDelete={onDelete}
    onToggleComplete={onToggleComplete}
    onUpdateText={onUpdateText}
    showETA={showETA}
  />
);

export default function Quadrant({
  quadrantId,
  title,
  tooltip,
  isFirst,
  tasks,
  isLoading = false,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onToggleComplete,
  onUpdateTaskText,
  layoutMode = 'FOUR',
  showETA = true
}) {
  const [currentTitle, setCurrentTitle] = useState(title);
  const [isEditing, setIsEditing] = useState(false);
  const [visibleTaskLimit, setVisibleTaskLimit] = useState(20); // 初始显示20个任务
  const titleInputRef = useRef(null);

  // 记忆化任务 ID 列表，避免不必要的重渲染
  const taskIds = useMemo(() => tasks.map(task => task.id), [tasks]);
  
  // 记忆化可见任务列表
  const visibleTasks = useMemo(() => {
    return tasks.slice(0, visibleTaskLimit);
  }, [tasks, visibleTaskLimit]);

  // 记忆化事件处理器，避免子组件不必要的重渲染
  const memoizedOnAddTask = useCallback(onAddTask, [onAddTask]);
  const memoizedOnUpdateTask = useCallback(onUpdateTask, [onUpdateTask]);
  const memoizedOnDeleteTask = useCallback(onDeleteTask, [onDeleteTask]);
  const memoizedOnToggleComplete = useCallback(onToggleComplete, [onToggleComplete]);
  const memoizedOnUpdateTaskText = useCallback(onUpdateTaskText, [onUpdateTaskText]);

  // 加载更多任务
  const loadMoreTasks = useCallback(() => {
    setVisibleTaskLimit(prev => Math.min(prev + 20, tasks.length));
  }, [tasks.length]);

  // 是否有更多任务需要加载
  const hasMoreTasks = visibleTaskLimit < tasks.length;
  
  const { isOver, setNodeRef } = useDroppable({
    id: `quadrant-${quadrantId}`,
  });

  // 通过 CSS transition 在 TaskItem 上实现轻量动画，无额外依赖

  // 处理标题编辑
  const handleEditTitle = () => {
    setIsEditing(true);
  };

  const handleTitleChange = (e) => {
    setCurrentTitle(e.target.value);
  };

  const handleTitleSubmit = () => {
    setIsEditing(false);
    // 这里可以添加保存标题到本地存储的逻辑
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setCurrentTitle(title);
      setIsEditing(false);
    }
  };

  const handleTitleBlur = () => {
    handleTitleSubmit();
  };

  // 自动聚焦编辑状态的输入框
  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditing]);

  // 处理点击空白区域添加任务
  const handleQuadrantClick = async (e) => {
    // 只有点击空白区域才添加任务
    if (e.target.classList.contains('quadrant') || 
        e.target.classList.contains('task-list')) {
      try {
        const newTask = await onAddTask('');
        // 可以在这里添加聚焦到新任务的逻辑
      } catch (error) {
        console.error('Failed to add task:', error);
      }
    }
  };

  const quadrantClass = `quadrant ${QUADRANT_CLASSES[quadrantId]} ${isLoading ? 'loading' : ''}`;
  
  return (
    <div 
      className={quadrantClass} 
      onClick={handleQuadrantClick}
    >
      {/* 象限徽章与标题，仅在四象限模式下显示 */}
      {layoutMode === 'FOUR' && (
        <>
          {(() => {
            const badgeMap = {
              1: '立即做',
              2: '计划做',
              3: '外包做',
              4: '不做'
            };
            return <span className="priority-badge">{badgeMap[quadrantId]}</span>;
          })()}
          <div className="quadrant-header">
            <input
              ref={titleInputRef}
              type="text"
              className={`quadrant-title ${isEditing ? 'editing' : ''}`}
              value={currentTitle}
              onChange={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
              onBlur={handleTitleBlur}
              readOnly={!isEditing}
              title={tooltip}
            />
          </div>
        </>
      )}
 
      {/* 任务列表 */}
      <div 
        ref={setNodeRef}
        className={`task-list ${isOver ? 'drag-over' : ''}`} 
        data-quadrant={quadrantId}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {visibleTasks.map((task) => (
            <MemoizedTaskItem
              key={task.id}
              task={task}
              quadrantId={quadrantId}
              onUpdate={memoizedOnUpdateTask}
              onDelete={memoizedOnDeleteTask}
              onToggleComplete={memoizedOnToggleComplete}
              onUpdateText={memoizedOnUpdateTaskText}
              showETA={showETA}
            />
          ))}
        </SortableContext>

        {/* 加载更多按钮 */}
        {hasMoreTasks && (
          <button
            onClick={loadMoreTasks}
            className="load-more-btn"
            style={{
              display: 'block',
              width: '100%',
              padding: '8px',
              margin: '8px 0',
              background: 'rgba(212, 165, 116, 0.1)',
              border: '1px dashed rgba(212, 165, 116, 0.3)',
              borderRadius: '4px',
              color: 'var(--ink-brown)',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(212, 165, 116, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(212, 165, 116, 0.1)';
            }}
          >
            显示更多任务 ({tasks.length - visibleTaskLimit} 个)
          </button>
        )}
      </div>
 
      {/* 添加任务提示 */}
      <div className="add-task-hint">点击空白添加新任务</div>
    </div>
  );
} 