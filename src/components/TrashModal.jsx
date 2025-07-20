'use client';

import { useState, useEffect } from 'react';
import { useTrash } from '@/hooks/useTrash';
import { useTaskListStore } from '@/stores/taskListStore';
import { useTrashStore } from '@/stores/trashStore';

const QUADRANT_NAMES = {
  1: '重要且紧急',
  2: '重要不紧急', 
  3: '紧急不重要',
  4: '不重要不紧急'
};

export default function TrashModal({ isOpen, onClose }) {
  const { deletedTasks, loading, restoreTask, permanentDeleteTask, clearTrash, loadDeletedTasks } = useTrash();
  const { taskLists } = useTaskListStore();
  const { decrementDeletedCount, decrementDeletedCountBy, resetDeletedCount } = useTrashStore();
  const [selectedTasks, setSelectedTasks] = useState(new Set());

  // 当模态框打开时重新加载数据
  useEffect(() => {
    if (isOpen) {
      loadDeletedTasks();
      setSelectedTasks(new Set()); // 清空选择状态
    }
  }, [isOpen, loadDeletedTasks]);

  if (!isOpen) return null;

  // 创建任务列表映射
  const taskListMap = taskLists.reduce((map, list) => {
    map[list.id] = list.name;
    return map;
  }, {});

  // 处理任务选择
  const handleTaskSelect = (taskId) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedTasks.size === deletedTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(deletedTasks.map(task => task.id)));
    }
  };

  // 恢复选中的任务
  const handleRestoreSelected = async () => {
    if (selectedTasks.size === 0) return;
    
    try {
      const count = selectedTasks.size;
      for (const taskId of selectedTasks) {
        await restoreTask(taskId);
      }
      setSelectedTasks(new Set());
      // 更新计数
      decrementDeletedCountBy(count);
    } catch (error) {
      console.error('Failed to restore selected tasks:', error);
      alert('恢复任务失败，请重试');
    }
  };

  // 永久删除选中的任务
  const handleDeleteSelected = async () => {
    if (selectedTasks.size === 0) return;
    
    if (!confirm(`确定要永久删除选中的 ${selectedTasks.size} 个任务吗？此操作无法撤销。`)) {
      return;
    }

    try {
      const count = selectedTasks.size;
      for (const taskId of selectedTasks) {
        await permanentDeleteTask(taskId);
      }
      setSelectedTasks(new Set());
      // 更新计数
      decrementDeletedCountBy(count);
    } catch (error) {
      console.error('Failed to permanently delete selected tasks:', error);
      alert('删除任务失败，请重试');
    }
  };

  // 清空收纳箱
  const handleClearAll = async () => {
    if (deletedTasks.length === 0) return;
    
    if (!confirm(`确定要清空收纳箱吗？这将永久删除所有 ${deletedTasks.length} 个任务，此操作无法撤销。`)) {
      return;
    }

    try {
      await clearTrash();
      setSelectedTasks(new Set());
      // 重置计数
      resetDeletedCount();
    } catch (error) {
      console.error('Failed to clear trash:', error);
      alert('清空收纳箱失败，请重试');
    }
  };

  // 恢复单个任务
  const handleRestoreTask = async (taskId) => {
    try {
      await restoreTask(taskId);
      decrementDeletedCount();
    } catch (error) {
      console.error('Failed to restore task:', error);
      alert('恢复任务失败，请重试');
    }
  };

  // 永久删除单个任务
  const handlePermanentDeleteTask = async (taskId) => {
    if (!confirm('确定要永久删除这个任务吗？此操作无法撤销。')) {
      return;
    }

    try {
      await permanentDeleteTask(taskId);
      decrementDeletedCount();
    } catch (error) {
      console.error('Failed to permanently delete task:', error);
      alert('删除任务失败，请重试');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content trash-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🗑️ 收纳箱</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading">加载中...</div>
          ) : deletedTasks.length === 0 ? (
            <div className="empty-trash">
              <div className="empty-icon">🗑️</div>
              <p>收纳箱是空的</p>
              <small>删除的任务会先存放在这里</small>
            </div>
          ) : (
            <>
              <div className="trash-actions">
                <div className="left-actions">
                  <label className="select-all">
                    <input
                      type="checkbox"
                      checked={selectedTasks.size === deletedTasks.length && deletedTasks.length > 0}
                      onChange={handleSelectAll}
                    />
                    全选 ({deletedTasks.length})
                  </label>
                </div>
                <div className="right-actions">
                  {selectedTasks.size > 0 && (
                    <>
                      <button 
                        className="btn-restore"
                        onClick={handleRestoreSelected}
                      >
                        恢复选中 ({selectedTasks.size})
                      </button>
                      <button 
                        className="btn-delete"
                        onClick={handleDeleteSelected}
                      >
                        永久删除选中
                      </button>
                    </>
                  )}
                  <button 
                    className="btn-clear-all"
                    onClick={handleClearAll}
                  >
                    清空收纳箱
                  </button>
                </div>
              </div>

              <div className="trash-tasks">
                {deletedTasks.map((task) => (
                  <div 
                    key={task.id} 
                    className={`trash-task ${selectedTasks.has(task.id) ? 'selected' : ''}`}
                  >
                    <label className="task-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedTasks.has(task.id)}
                        onChange={() => handleTaskSelect(task.id)}
                      />
                    </label>
                    
                    <div className="task-content">
                      <div className="task-text">{task.text}</div>
                      <div className="task-meta">
                        <span className="task-list">{taskListMap[task.listId] || '未知列表'}</span>
                        <span className="task-quadrant">{QUADRANT_NAMES[task.quadrant]}</span>
                        {task.estimatedTime && (
                          <span className="task-eta">{task.estimatedTime}</span>
                        )}
                        <span className="delete-time">
                          删除于 {new Date(task.updatedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="task-actions">
                      <button 
                        className="btn-restore-single"
                        onClick={() => handleRestoreTask(task.id)}
                        title="恢复任务"
                      >
                        ↩️
                      </button>
                      <button 
                        className="btn-delete-single"
                        onClick={() => handlePermanentDeleteTask(task.id)}
                        title="永久删除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}