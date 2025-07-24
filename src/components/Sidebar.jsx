'use client';

import { useState, useRef, useEffect } from 'react';
import { useSidebarState } from '@/hooks/useSidebarState';
import { useTheme } from '@/hooks/useTheme';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useTrashStore } from '@/stores/trashStore';
import { useTaskListStore } from '@/stores/taskListStore';
import IOSToggle from './IOSToggle';
import TrashModal from './TrashModal';
import ListItemMenu from './ListItemMenu';
import AIAnalysis from './AIAnalysis';
import { useTrash } from '@/hooks/useTrash';

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
  const { deletedTasks } = useTrash();

  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showTrashModal, setShowTrashModal] = useState(false);
  
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

  // 重命名任务列表
  const handleRenameTaskList = async (listId, newName) => {
    try {
      await updateTaskList(listId, { name: newName });
    } catch (error) {
      console.error('Failed to rename task list:', error);
      alert('重命名失败，请重试');
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
        {/* <button className="sidebar-close" onClick={closeSidebar}>
          ✕
        </button> */}
        
        {/* 任务列表标题和添加按钮 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="mb-[0px] text-lg  font-medium text-[var(--ink-brown)] font-['Noto_Serif_SC']">任务列表</h2>
          <button 
            className="
              flex items-center justify-center w-8 h-8
              bg-[var(--accent-gold)]/10 hover:bg-[var(--accent-gold)]/20 active:bg-[var(--accent-gold)]/30
              border border-[var(--accent-gold)]/30 hover:border-[var(--accent-gold)]/50
              rounded-lg transition-all duration-200
              text-[var(--accent-gold)] hover:text-[var(--ink-brown)]
              focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50 focus:ring-offset-1
              shadow-sm hover:shadow-md
            "
            onClick={startCreatingTaskList}
            aria-label="创建新任务列表"
            title="新建任务列表"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
        
        {/* 任务列表 */}
        <div className="space-y-1 mb-6">
          {/* 创建中的新列表行 */}
          {isCreating && (
            <div className="group px-3 py-2 rounded-lg bg-[var(--white-trans)] border border-[var(--accent-gold)]/30 shadow-sm">
              <input
                ref={createInputRef}
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={handleCreateKeyDown}
                onBlur={finishCreatingTaskList}
                placeholder="输入任务列表名称..."
                className="
                  w-full bg-transparent border-none outline-none
                  text-[var(--ink-brown)] placeholder-[var(--ink-brown)]/50
                  focus:ring-0 p-0 font-['Noto_Serif_SC']
                "
              />
            </div>
          )}
          
          {/* 现有任务列表 */}
          {taskLists.map((list) => (
            <div
              key={list.id}
              className={`
                group px-3 py-2 rounded-lg cursor-pointer transition-all duration-200
                ${list.isActive 
                  ? 'bg-[var(--accent-gold)] text-white shadow-md border border-[var(--accent-gold)]' 
                  : 'hover:bg-[var(--parchment-dark)] text-[var(--ink-brown)] border border-transparent'
                }
              `}
              onClick={() => handleSetActiveList(list)}
            >
              <ListItemMenu
                list={list}
                onRename={handleRenameTaskList}
                onDelete={handleDeleteTaskList}
                isActive={list.isActive}
              />
            </div>
          ))}
        </div>
        
        <h2 className="text-lg font-medium text-[var(--ink-brown)] font-['Noto_Serif_SC'] mb-3">视图设置</h2>
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

        <h2 className="text-lg font-medium text-[var(--ink-brown)] font-['Noto_Serif_SC'] mb-3">收纳箱</h2>
        <div className="trash-section">
          <button 
            className="sidebar-item trash-btn"
            onClick={handleOpenTrash}
          >
            🗑️ 收纳箱 {deletedTaskCount > 0 && <span className="trash-count">({deletedTaskCount})</span>}
          </button>
        </div>

        {/* AI分析模块 */}
        <AIAnalysis 
          deletedTasks={deletedTasks} 
          taskLists={taskLists}
        />

        <h2 className="text-lg font-medium text-[var(--ink-brown)] font-['Noto_Serif_SC'] mb-3">主题</h2>
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