'use client';

import { useState, useRef, useEffect } from 'react';
import { useSidebarState } from '@/hooks/useSidebarState';
import { useTheme } from '@/hooks/useTheme';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useTrashStore } from '@/stores/trashStore';
import { useTaskListStore } from '@/stores/taskListStore';
import IOSToggle from './IOSToggle';
import TrashModal from './TrashModal';

const THEME_OPTIONS = [
  { value: 'minimal', label: '简约' },
  { value: 'parchment', label: '羊皮纸经典' },
  { value: 'dark-blue', label: '墨水深蓝' },
  { value: 'forest-green', label: '森林绿意' }
];

export default function Sidebar() {
  const { isOpen, setIsOpen } = useSidebarState();
  const { theme, setTheme } = useTheme();
  const { defaultLayoutMode, defaultShowETA, toggleDefaultLayoutMode, toggleDefaultShowETA } = useAppSettings();
  const { 
    taskLists, 
    activeList, 
    addTaskList, 
    updateTaskList, 
    setActiveList, 
    deleteTaskList 
  } = useTaskListStore();
  const { deletedTaskCount, updateDeletedTaskCount } = useTrashStore();

  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showTrashModal, setShowTrashModal] = useState(false);
  
  const editInputRef = useRef(null);
  const createInputRef = useRef(null);

  // 切换侧边栏
  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  // 关闭侧边栏
  const closeSidebar = () => {
    setIsOpen(false);
  };

  // 开始创建新任务列表
  const startCreatingTaskList = () => {
    setIsCreating(true);
    setNewListName('');
  };

  // 完成创建任务列表
  const finishCreatingTaskList = async () => {
    if (newListName.trim()) {
      try {
        await addTaskList(newListName.trim(), defaultLayoutMode, defaultShowETA);
        setNewListName('');
        setIsCreating(false);
      } catch (error) {
        console.error('Failed to create task list:', error);
      }
    } else {
      setIsCreating(false);
    }
  };

  // 取消创建
  const cancelCreating = () => {
    setIsCreating(false);
    setNewListName('');
  };

  // 处理创建输入
  const handleCreateKeyDown = (e) => {
    if (e.key === 'Enter') {
      finishCreatingTaskList();
    } else if (e.key === 'Escape') {
      cancelCreating();
    }
  };

  // 开始编辑任务列表
  const startEditingTaskList = (list) => {
    setEditingId(list.id);
    setEditingText(list.name);
  };

  // 完成编辑任务列表
  const finishEditingTaskList = async () => {
    if (editingText.trim() && editingText.trim() !== taskLists.find(l => l.id === editingId)?.name) {
      try {
        await updateTaskList(editingId, { name: editingText.trim() });
      } catch (error) {
        console.error('Failed to update task list:', error);
      }
    }
    setEditingId(null);
    setEditingText('');
  };

  // 取消编辑
  const cancelEditing = () => {
    setEditingId(null);
    setEditingText('');
  };

  // 处理编辑输入
  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') {
      finishEditingTaskList();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  // 切换活动任务列表
  const handleSetActiveList = async (list) => {
    try {
      await setActiveList(list.id);
      // 关闭侧边栏
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to set active list:', error);
      alert('切换任务列表失败，请重试');
    }
  };

  // 删除任务列表
  const handleDeleteTaskList = async (listId) => {
    if (taskLists.length <= 1) {
      alert('至少需要保留一个任务列表');
      return;
    }
    
    if (confirm('确定要删除这个任务列表吗？所有任务都将被删除。')) {
      try {
        await deleteTaskList(listId);
      } catch (error) {
        console.error('Failed to delete task list:', error);
      }
    }
  };

  // 处理主题切换
  const handleThemeChange = (e) => {
    setTheme(e.target.value);
  };

  // 打开收纳箱
  const handleOpenTrash = () => {
    setShowTrashModal(true);
  };

  // 自动聚焦输入框
  useEffect(() => {
    if (isCreating && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [isCreating]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // 当侧边栏打开时重新加载收纳箱数据
  useEffect(() => {
    if (isOpen) {
      updateDeletedTaskCount();
    }
  }, [isOpen, updateDeletedTaskCount]);

  return (
    <>
      {/* 侧边栏 */}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <button className="sidebar-close" onClick={closeSidebar}>
          ✕
        </button>
        
        <h2>任务列表</h2>
        
        {/* 创建新任务列表按钮 */}
        {!isCreating ? (
          <button 
            className="sidebar-item create-task-btn"
            onClick={startCreatingTaskList}
          >
            ＋ 创建新任务列表
          </button>
        ) : (
          <div className="sidebar-item editable">
            <input
              ref={createInputRef}
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={handleCreateKeyDown}
              onBlur={finishCreatingTaskList}
              placeholder="输入任务列表名称..."
            />
          </div>
        )}
        
        {/* 任务列表 */}
        <div className="sidebar-tasks">
          {taskLists.map((list) => (
            <div
              key={list.id}
              className={`sidebar-item ${list.isActive ? 'active' : ''} ${editingId === list.id ? 'editable' : ''}`}
            >
              {editingId === list.id ? (
                <input
                  ref={editInputRef}
                  type="text"
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onBlur={finishEditingTaskList}
                />
              ) : (
                <>
                  <span
                    className="sidebar-item-text"
                    onClick={() => handleSetActiveList(list)}
                    onDoubleClick={() => startEditingTaskList(list)}
                  >
                    {list.name}
                  </span>
                  <span
                    className="sidebar-item-delete"
                    onClick={() => handleDeleteTaskList(list.id)}
                  >
                    ×
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
        
        <h2>视图设置</h2>
        <div className="flex flex-col gap-3 pb-4">
          <IOSToggle
            label="四象限模式"
            checked={defaultLayoutMode === 'FOUR'}
            onChange={toggleDefaultLayoutMode}
          />
          <IOSToggle
            label="显示预计时间"
            checked={defaultShowETA}
            onChange={toggleDefaultShowETA}
          />
        </div>

        <h2>收纳箱</h2>
        <div className="trash-section">
          <button 
            className="sidebar-item trash-btn"
            onClick={handleOpenTrash}
          >
            🗑️ 收纳箱 {deletedTaskCount > 0 && <span className="trash-count">({deletedTaskCount})</span>}
          </button>
        </div>

        <h2>主题</h2>
        <div className="theme-selector">
          <select value={theme} onChange={handleThemeChange}>
            {THEME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </aside>

      {/* 侧边栏切换按钮 */}
      <button className="sidebar-toggle" onClick={toggleSidebar}>
        {/* <span>任务</span> */}
      </button>

      {/* 收纳箱模态框 */}
      <TrashModal 
        isOpen={showTrashModal} 
        onClose={() => setShowTrashModal(false)} 
      />
    </>
  );
} 