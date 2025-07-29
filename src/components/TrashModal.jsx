'use client';

import { useState, useEffect } from 'react';
import { useTrash } from '@/hooks/useTrash';
import { useTaskListStore } from '@/stores/taskListStore';
import { useTrashStore } from '@/stores/trashStore';
import { useTaskStore } from '@/stores/taskStore';

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
  const { loadTasks, currentListId } = useTaskStore();
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
      // 重新加载当前列表的任务，更新主页面显示
      await loadTasks(currentListId);
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
      // 重新加载当前列表的任务，更新主页面显示
      await loadTasks(currentListId);
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
      <div className="modal-content" style={{width: '1200px', maxWidth: '95vw'}} onClick={(e) => e.stopPropagation()}>
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
                  {selectedTasks.size > 0 && (
                    <span style={{color: 'var(--accent-gold)', fontSize: '0.9rem'}}>
                      已选择 {selectedTasks.size} 项
                    </span>
                  )}
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

              {/* 任务表格 - 羊皮纸风格 */}
              <div style={{overflowX: 'auto', background: 'var(--white-trans)', borderRadius: '1rem', padding: '1rem', backdropFilter: 'blur(10px)'}}>
                <table style={{width: '100%', minWidth: '700px', borderCollapse: 'collapse'}}>
                  <thead>
                    <tr style={{borderBottom: '2px solid var(--shadow-soft)'}}>
                      <th style={{width: '3rem', padding: '1rem 0.5rem', textAlign: 'left'}}>
                        {/* 全选框移到操作栏了 */}
                      </th>
                      <th style={{padding: '1rem 0.5rem', textAlign: 'left', fontFamily: 'Caveat, cursive', fontSize: '1.2rem', color: 'var(--ink-brown)', fontWeight: '600'}}>任务名</th>
                      <th style={{padding: '1rem 0.5rem', textAlign: 'left', fontFamily: 'Caveat, cursive', fontSize: '1.2rem', color: 'var(--ink-brown)', fontWeight: '600'}}>归属项目</th>
                      <th style={{padding: '1rem 0.5rem', textAlign: 'left', fontFamily: 'Caveat, cursive', fontSize: '1.2rem', color: 'var(--ink-brown)', fontWeight: '600'}}>归属象限</th>
                      <th style={{padding: '1rem 0.5rem', textAlign: 'left', fontFamily: 'Caveat, cursive', fontSize: '1.2rem', color: 'var(--ink-brown)', fontWeight: '600'}}>创建时间</th>
                      <th style={{padding: '1rem 0.5rem', textAlign: 'left', fontFamily: 'Caveat, cursive', fontSize: '1.2rem', color: 'var(--ink-brown)', fontWeight: '600'}}>完成时间</th>
                      <th style={{padding: '1rem 0.5rem', textAlign: 'left', fontFamily: 'Caveat, cursive', fontSize: '1.2rem', color: 'var(--ink-brown)', fontWeight: '600'}}>删除时间</th>
                      <th style={{width: '6rem', padding: '1rem 0.5rem', textAlign: 'center', fontFamily: 'Caveat, cursive', fontSize: '1.2rem', color: 'var(--ink-brown)', fontWeight: '600'}}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletedTasks.map((task) => (
                      <tr 
                        key={task.id} 
                        style={{
                          borderBottom: '1px solid var(--shadow-soft)',
                          backgroundColor: selectedTasks.has(task.id) ? 'var(--accent-gold)' : 'transparent',
                          color: selectedTasks.has(task.id) ? 'white' : 'var(--ink-black)',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!selectedTasks.has(task.id)) {
                            e.currentTarget.style.backgroundColor = 'var(--parchment-dark)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!selectedTasks.has(task.id)) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <td style={{padding: '0.8rem 0.5rem'}}>
                          <input
                            type="checkbox"
                            checked={selectedTasks.has(task.id)}
                            onChange={() => handleTaskSelect(task.id)}
                            style={{width: '18px', height: '18px'}}
                          />
                        </td>
                        <td style={{padding: '0.8rem 0.5rem'}}>
                          <div style={{fontSize: '1rem', fontWeight: '500', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis'}} title={task.text}>
                            {task.text}
                          </div>
                        </td>
                        <td style={{padding: '0.8rem 0.5rem', fontSize: '0.9rem', opacity: '0.8'}}>
                          {taskListMap[task.listId] || '未知列表'}
                        </td>
                        <td style={{padding: '0.8rem 0.5rem'}}>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '1rem',
                            fontSize: '0.8rem',
                            fontWeight: '500',
                            backgroundColor: 
                              task.quadrant === 1 ? 'var(--urgent-important)' :
                              task.quadrant === 2 ? 'var(--important-not-urgent)' :
                              task.quadrant === 3 ? 'var(--urgent-not-important)' :
                              'var(--not-urgent-not-important)',
                            color: 'white'
                          }}>
                            {QUADRANT_NAMES[task.quadrant]}
                          </span>
                        </td>
                        <td style={{padding: '0.8rem 0.5rem', fontSize: '0.9rem', opacity: '0.8'}}>
                          {task.createdAt ? new Date(task.createdAt).toLocaleDateString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </td>
                        <td style={{padding: '0.8rem 0.5rem', fontSize: '0.9rem', opacity: '0.8'}}>
                          {task.completed && task.completedAt 
                            ? new Date(task.completedAt).toLocaleDateString('zh-CN', {
                                month: '2-digit', 
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : task.completed ? '已完成' : '未完成'
                          }
                        </td>
                        <td style={{padding: '0.8rem 0.5rem', fontSize: '0.9rem', opacity: '0.8'}}>
                          {new Date(task.updatedAt).toLocaleDateString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit', 
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td style={{padding: '0.8rem 0.5rem'}}>
                          <div style={{display: 'flex', gap: '0.5rem', justifyContent: 'center'}}>
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}