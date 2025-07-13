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
  // 空白任务自动进入编辑模式
  const [isEditing, setIsEditing] = useState(task.text.trim() === '');
  const [currentText, setCurrentText] = useState(task.text);
  const [currentEstimatedTime, setCurrentEstimatedTime] = useState(task.estimatedTime || '');
  const textInputRef = useRef(null);
  const timeInputRef = useRef(null);

  // 开始编辑（由铅笔按钮触发）
  const handleStartEdit = (e) => {
    e?.stopPropagation();
    if (!task.completed && !isEditing) {
      setIsEditing(true);
    }
  };

  const handleTextChange = (e) => {
    setCurrentText(e.target.value);
    // 自动高度
    if (textInputRef.current) {
      textInputRef.current.style.height = 'auto';
      textInputRef.current.style.height = textInputRef.current.scrollHeight + 'px';
    }
  };

  const handleTextSubmit = async () => {
    const hasTextChanged = currentText.trim() !== task.text;
    const hasTimeChanged = currentEstimatedTime !== (task.estimatedTime || '');
    
    if (hasTextChanged || hasTimeChanged) {
      try {
        await onUpdateText(task.id, {
          text: currentText.trim(),
          estimatedTime: currentEstimatedTime.trim()
        });
      } catch (error) {
        console.error('Failed to update task:', error);
        setCurrentText(task.text); // 恢复原文本
        setCurrentEstimatedTime(task.estimatedTime || ''); // 恢复原预计时间
      }
    }
    setIsEditing(false);
  };

  // 取消编辑
  const handleCancel = () => {
    setCurrentText(task.text);
    setCurrentEstimatedTime(task.estimatedTime || '');
    setIsEditing(false);
  };

  // 处理预计时间输入
  const handleTimeChange = (e) => {
    setCurrentEstimatedTime(e.target.value);
  };

  // Enter 提交（Shift+Enter 换行），Esc 取消
  const handleTextKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleTextBlur = () => {
    handleTextSubmit();
  };

  // 自动聚焦编辑状态的输入框
  useEffect(() => {
    if (isEditing && textInputRef.current) {
      textInputRef.current.focus();
      // 初次进入时调整高度
      textInputRef.current.style.height = 'auto';
      textInputRef.current.style.height = textInputRef.current.scrollHeight + 'px';
    }
  }, [isEditing]);

  // 更新本地状态
  useEffect(() => {
    setCurrentText(task.text);
    setCurrentEstimatedTime(task.estimatedTime || '');
  }, [task.text, task.estimatedTime]);

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

  // 阻止 textarea 与拖拽冲突
  const handleInputMouseDown = (e) => {
    e.stopPropagation();
  };

  return (
    <div 
      ref={!isEditing ? setActivatorNodeRef : null}
      className={`task-item ${isEditing ? 'task-item-editing' : ''}`}
      {...(!isEditing ? dragListeners : {})}
    >
      {/* 复选框 */}
      <div 
        className={`task-checkbox ${task.completed ? 'checked' : ''}`}
        onClick={handleCheckboxClick}
      ></div>
      
      <div className="task-content">
        {/* 任务文本（textarea 可自动换行） */}
        <textarea
          ref={textInputRef}
          className={`task-text ${task.completed ? 'completed' : ''}`}
          value={isEditing ? currentText : task.text}
          onChange={handleTextChange}
          onKeyDown={handleTextKeyDown}
          onBlur={isEditing ? undefined : handleTextBlur}
          onMouseDown={handleInputMouseDown}
          readOnly={!isEditing || task.completed}
          placeholder="输入任务..."
          rows={1}
        />

        {/* 预计时间显示/输入 */}
        {isEditing ? (
          <div className="task-time-editor">
            <label className="task-time-label">预计时间：</label>
            <input
              ref={timeInputRef}
              type="text"
              className="task-time-input"
              value={currentEstimatedTime}
              onChange={handleTimeChange}
              onMouseDown={handleInputMouseDown}
              placeholder="如：30分钟、2小时"
            />
          </div>
        ) : (
          task.estimatedTime && (
            <div className="task-time-display">
              {task.estimatedTime}
            </div>
          )
        )}

        {/* 编辑模式的按钮栏 */}
        {isEditing && (
          <div className="task-edit-actions">
            <button
              className="task-cancel-btn"
              onClick={handleCancel}
              onMouseDown={handleInputMouseDown}
            >
              取消
            </button>
            <button
              className="task-confirm-btn"
              onClick={handleTextSubmit}
              onMouseDown={handleInputMouseDown}
            >
              确认
            </button>
          </div>
        )}
      </div>

      {/* 铅笔编辑按钮 */}
      {(!isEditing && !task.completed) && (
        <span
          className="task-edit"
          onClick={handleStartEdit}
        >
          ✎
        </span>
      )}
      
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