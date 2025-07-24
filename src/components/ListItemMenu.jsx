'use client';

import { useState, useRef, useEffect } from 'react';

export default function ListItemMenu({ 
  list, 
  onRename, 
  onDelete, 
  isActive = false 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(list.name);
  
  const menuRef = useRef(null);
  const renameInputRef = useRef(null);

  // 切换菜单显示/隐藏
  const toggleMenu = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  // 开始重命名
  const startRenaming = (e) => {
    e.stopPropagation();
    setIsRenaming(true);
    setNewName(list.name);
    setIsOpen(false);
  };

  // 完成重命名
  const finishRenaming = () => {
    if (newName.trim() && newName.trim() !== list.name) {
      onRename(list.id, newName.trim());
    }
    setIsRenaming(false);
    setNewName(list.name);
  };

  // 取消重命名
  const cancelRenaming = () => {
    setIsRenaming(false);
    setNewName(list.name);
  };

  // 处理重命名输入键盘事件
  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finishRenaming();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRenaming();
    }
  };

  // 处理删除
  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(list.id);
    setIsOpen(false);
  };

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // 自动聚焦重命名输入框
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  if (isRenaming) {
    return (
      <div className="flex-1 min-w-0">
        <input
          ref={renameInputRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={handleRenameKeyDown}
          onBlur={finishRenaming}
          className="w-full px-2 py-1 text-sm bg-[var(--white-trans)] border border-[var(--accent-gold)]/30 rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50 focus:border-[var(--accent-gold)] text-[var(--ink-brown)] font-['Noto_Serif_SC']"
          placeholder="输入列表名称..."
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between w-full group">
      {/* 列表名称 */}
      <span className="flex-1 truncate text-left font-['Noto_Serif_SC']">
        {list.name}
      </span>
      
      {/* 三点菜单按钮 */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={toggleMenu}
          className={`
            p-1 rounded-full transition-all duration-200 
            ${isOpen ? 'bg-[var(--parchment-dark)]' : 'bg-transparent hover:bg-[var(--parchment-dark)]'}
            ${isActive ? 'text-white hover:bg-white/20' : 'text-[var(--ink-brown)]/70 hover:text-[var(--ink-brown)]'}
            opacity-0 group-hover:opacity-100 focus:opacity-100
            touch:opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100
          `}
          aria-label="更多选项"
        >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            className="w-4 h-4"
          >
            <circle cx="12" cy="5" r="1"/>
            <circle cx="12" cy="12" r="1"/>
            <circle cx="12" cy="19" r="1"/>
          </svg>
        </button>

        {/* 下拉菜单 */}
        {isOpen && (
          <div className={`
            absolute right-0 top-full mt-1 z-50
            bg-[var(--parchment)] rounded-lg shadow-lg border border-[var(--accent-gold)]/20
            min-w-[120px] py-1
            animate-in fade-in duration-150
          `}>
            <button
              onClick={startRenaming}
              className="w-full px-4 py-2 text-left text-sm text-[var(--ink-brown)] hover:bg-[var(--parchment-dark)] transition-colors duration-150 font-['Noto_Serif_SC']"
            >
              重命名
            </button>
            <button
              onClick={handleDelete}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50/50 transition-colors duration-150 font-['Noto_Serif_SC']"
            >
              删除
            </button>
          </div>
        )}
      </div>
    </div>
  );
}