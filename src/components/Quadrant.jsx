'use client';

import { useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import DraggableTaskItem from './DraggableTaskItem';

const QUADRANT_CLASSES = {
  1: 'first-quadrant',
  2: 'second-quadrant', 
  3: 'third-quadrant',
  4: 'fourth-quadrant'
};

export default function Quadrant({
  quadrantId,
  title,
  tooltip,
  isFirst,
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onToggleComplete,
  onUpdateTaskText
}) {
  const [currentTitle, setCurrentTitle] = useState(title);
  const [isEditing, setIsEditing] = useState(false);
  const titleInputRef = useRef(null);
  
  const { isOver, setNodeRef } = useDroppable({
    id: `quadrant-${quadrantId}`,
  });

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

  const quadrantClass = `quadrant ${QUADRANT_CLASSES[quadrantId]}`;
  
  return (
    <div 
      className={quadrantClass} 
      onClick={handleQuadrantClick}
      style={{ animation: `fadeIn 0.6s ease forwards`, animationDelay: `${quadrantId * 0.1}s` }}
    >
      {/* 顶部装饰线 */}
      <div className="top-accent"></div>
      
      {/* 内发光效果 */}
      <div className="inner-glow"></div>
      
      {/* 第一象限的优先徽章 */}
      {isFirst && (
        <span className="priority-badge">立即做</span>
      )}
      
      {/* 象限标题区域 */}
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
        {/* <span 
          className="edit-icon" 
          onClick={handleEditTitle}
        >
          ✏️
        </span> */}
      </div>
      
      {/* 任务列表 */}
      <div 
        ref={setNodeRef}
        className={`task-list ${isOver ? 'drag-over' : ''}`} 
        data-quadrant={quadrantId}
      >
        <SortableContext items={tasks} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <DraggableTaskItem
              key={task.id}
              task={task}
              quadrantId={quadrantId}
              onUpdate={onUpdateTask}
              onDelete={onDeleteTask}
              onToggleComplete={onToggleComplete}
              onUpdateText={onUpdateTaskText}
            />
          ))}
        </SortableContext>
      </div>
      
      {/* 添加任务提示 */}
      <div className="add-task-hint">点击空白添加新任务</div>
    </div>
  );
} 