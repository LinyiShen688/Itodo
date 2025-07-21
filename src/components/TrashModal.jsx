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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" onClick={onClose}>
      <div className="w-full max-w-6xl max-h-[90vh] bg-white rounded-lg shadow-xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">🗑️ 收纳箱</h2>
          <button 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors" 
            onClick={onClose}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 p-6 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-500">加载中...</div>
            </div>
          ) : deletedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <div className="text-4xl mb-4">🗑️</div>
              <p className="text-gray-600 text-lg mb-2">收纳箱是空的</p>
              <small className="text-gray-400">删除的任务会先存放在这里</small>
            </div>
          ) : (
            <>
              {/* 操作栏 */}
              <div className="flex items-center justify-between mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    共 {deletedTasks.length} 项任务
                  </span>
                  {selectedTasks.size > 0 && (
                    <span className="text-sm text-blue-600">
                      已选择 {selectedTasks.size} 项
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {selectedTasks.size > 0 && (
                    <>
                      <button 
                        className="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
                        onClick={handleRestoreSelected}
                      >
                        恢复选中 ({selectedTasks.size})
                      </button>
                      <button 
                        className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                        onClick={handleDeleteSelected}
                      >
                        永久删除选中
                      </button>
                    </>
                  )}
                  <button 
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    onClick={handleClearAll}
                  >
                    清空收纳箱
                  </button>
                </div>
              </div>

              {/* 任务表格 */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] bg-white border border-gray-200 rounded-lg">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="w-12 px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedTasks.size === deletedTasks.length && deletedTasks.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">任务名</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">归属项目</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">归属象限</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">创建时间</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">完成时间</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">删除时间</th>
                      <th className="w-24 px-4 py-3 text-center text-sm font-medium text-gray-700">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {deletedTasks.map((task) => (
                      <tr 
                        key={task.id} 
                        className={`hover:bg-gray-50 transition-colors ${
                          selectedTasks.has(task.id) ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedTasks.has(task.id)}
                            onChange={() => handleTaskSelect(task.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900 font-medium truncate max-w-xs" title={task.text}>
                            {task.text}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-600">
                            {taskListMap[task.listId] || '未知列表'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            task.quadrant === 1 ? 'bg-red-100 text-red-800' :
                            task.quadrant === 2 ? 'bg-blue-100 text-blue-800' :
                            task.quadrant === 3 ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {QUADRANT_NAMES[task.quadrant]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {task.createdAt ? new Date(task.createdAt).toLocaleDateString('zh-CN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {task.completed && task.completedAt 
                            ? new Date(task.completedAt).toLocaleDateString('zh-CN', {
                                year: 'numeric',
                                month: '2-digit', 
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : task.completed ? '已完成' : '未完成'
                          }
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(task.updatedAt).toLocaleDateString('zh-CN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit', 
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center space-x-2">
                            <button 
                              className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                              onClick={() => handleRestoreTask(task.id)}
                              title="恢复任务"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                              </svg>
                            </button>
                            <button 
                              className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                              onClick={() => handlePermanentDeleteTask(task.id)}
                              title="永久删除"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
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