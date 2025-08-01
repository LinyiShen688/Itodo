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
  
  // 新增：临时任务输入状态
  const [isAddingNewTask, setIsAddingNewTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const newTaskInputRef = useRef(null);

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
    // 只有点击空白区域才显示输入框
    if (e.target.classList.contains('quadrant') || 
        e.target.classList.contains('task-list')) {
      // 不再立即创建任务，而是显示输入框
      setIsAddingNewTask(true);
      setNewTaskText('');
      setNewTaskTime('');
    }
  };

  // 处理新任务文本输入
  const handleNewTaskTextChange = (e) => {
    setNewTaskText(e.target.value);
    // 自动调整高度
    if (newTaskInputRef.current) {
      newTaskInputRef.current.style.height = 'auto';
      newTaskInputRef.current.style.height = newTaskInputRef.current.scrollHeight + 'px';
    }
  };

  // 处理新任务时间输入
  const handleNewTaskTimeChange = (e) => {
    setNewTaskTime(e.target.value);
  };

  // 确认创建新任务
  const handleNewTaskSubmit = async () => {
    const trimmedText = newTaskText.trim();
    if (trimmedText) {
      try {
        // 创建包含所有字段的任务数据
        const taskData = {
          text: trimmedText,
          estimatedTime: newTaskTime.trim()
        };
        
        // 一次性创建包含所有数据的任务，只产生一次 add 同步
        const newTask = await onAddTask(taskData);
        
        // 重置状态
        setIsAddingNewTask(false);
        setNewTaskText('');
        setNewTaskTime('');
      } catch (error) {
        console.error('Failed to add task:', error);
      }
    }
  };

  // 取消创建新任务
  const handleNewTaskCancel = () => {
    setIsAddingNewTask(false);
    setNewTaskText('');
    setNewTaskTime('');
  };

  // 处理新任务输入的键盘事件
  const handleNewTaskKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleNewTaskSubmit();
    } else if (e.key === 'Escape') {
      handleNewTaskCancel();
    }
  };

  // 自动聚焦新任务输入框
  useEffect(() => {
    if (isAddingNewTask && newTaskInputRef.current) {
      newTaskInputRef.current.focus();
    }
  }, [isAddingNewTask]);

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
        {/* 新任务输入框 - 显示在任务列表顶部 */}
        {isAddingNewTask && (
          <div className="task-item task-item-editing" style={{ marginBottom: '8px' }}>
            {/* 复选框占位 */}
            <div className="task-checkbox"></div>
            
            <div className="task-content">
              {/* 任务主内容行 */}
              <div className="task-main-line flex items-center flex-wrap gap-2">
                <textarea
                  ref={newTaskInputRef}
                  className="task-text"
                  value={newTaskText}
                  onChange={handleNewTaskTextChange}
                  onKeyDown={handleNewTaskKeyDown}
                  placeholder="输入任务"
                  rows={1}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              </div>

              {/* 扩展区域 */}
              <div className="task-edit-expansion show">
                {showETA && (
                  <div className="task-time-editor">
                    <textarea
                      className="task-time-input"
                      value={newTaskTime}
                      onChange={handleNewTaskTimeChange}
                      onKeyDown={handleNewTaskKeyDown}
                      placeholder="预计时间，如30分钟"
                      rows={1}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  </div>
                )}

                {/* 按钮栏 */}
                <div className="flex gap-2 pt-2">
                  <button
                    className="task-cancel-btn"
                    onClick={handleNewTaskCancel}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    取消
                  </button>
                  <button
                    className="task-confirm-btn"
                    onClick={handleNewTaskSubmit}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    确认
                  </button>
                </div>
              </div>
            </div>

            {/* 删除按钮占位 */}
            <span className="task-delete" style={{ visibility: 'hidden' }}>×</span>
          </div>
        )}

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