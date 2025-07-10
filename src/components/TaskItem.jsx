'use client';

import { useState, useRef, useEffect } from 'react';

export default function TaskItem({
  task,
  quadrantId,
  onUpdate,
  onDelete,
  onToggleComplete,
  onUpdateText,
  dragListeners,
  setActivatorNodeRef
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentText, setCurrentText] = useState(task.text);
  const textInputRef = useRef(null);

  // 处理文本编辑
  const handleTextClick = () => {
    if (!task.completed && !isEditing) {
      setIsEditing(true);
    }
  };

  const handleTextChange = (e) => {
    setCurrentText(e.target.value);
  };

  const handleTextSubmit = async () => {
    if (currentText.trim() !== task.text) {
      try {
        await onUpdateText(task.id, currentText.trim());
      } catch (error) {
        console.error('Failed to update task text:', error);
        setCurrentText(task.text); // 恢复原文本
      }
    }
    setIsEditing(false);
  };

  const handleTextKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTextSubmit();
    } else if (e.key === 'Escape') {
      setCurrentText(task.text);
      setIsEditing(false);
    }
  };

  const handleTextBlur = () => {
    handleTextSubmit();
  };

  // 自动聚焦编辑状态的输入框
  useEffect(() => {
    if (isEditing && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [isEditing]);

  // 更新本地文本状态
  useEffect(() => {
    setCurrentText(task.text);
  }, [task.text]);

  // 处理复选框点击
  const handleCheckboxClick = async (e) => {
    e.stopPropagation();
    try {
      await onToggleComplete(task.id);
    } catch (error) {
      console.error('Failed to toggle task completion:', error);
    }
  };

  // 处理删除按钮点击
  const handleDeleteClick = async (e) => {
    e.stopPropagation();
    try {
      await onDelete(task.id);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  // 阻止输入框的拖拽事件
  const handleInputMouseDown = (e) => {
    e.stopPropagation();
  };

  const handleInputClick = (e) => {
    e.stopPropagation(); // 阻止拖拽事件
    handleTextClick(); // 触发编辑
  };

  return (
    <div 
      ref={setActivatorNodeRef}
      className="task-item"
      {...dragListeners}
    >
      {/* 复选框 */}
      <div 
        className={`task-checkbox ${task.completed ? 'checked' : ''}`}
        onClick={handleCheckboxClick}
      ></div>
      
      {/* 任务文本 */}
      <input
        ref={textInputRef}
        type="text"
        className={`task-text ${task.completed ? 'completed' : ''}`}
        value={isEditing ? currentText : task.text}
        onChange={handleTextChange}
        onKeyDown={handleTextKeyDown}
        onBlur={handleTextBlur}
        onClick={handleInputClick}
        onMouseDown={handleInputMouseDown}
        readOnly={!isEditing || task.completed}
        placeholder="输入任务..."
      />
      
      {/* 删除按钮 */}
      <span 
        className="task-delete"
        onClick={handleDeleteClick}
      >
        ×
      </span>
      
      {/* 优先级圆点 */}
      <span className="task-priority-dot"></span>
    </div>
  );
} 