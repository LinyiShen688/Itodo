'use client';

import { useState, useEffect } from 'react';
import { X, RefreshCw, Trash2, Clock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useUnifiedStorage } from '@/lib/unified-storage';

export default function SyncProgressModal({ isOpen, onClose }) {
  const [syncStatus, setSyncStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const unifiedStorage = useUnifiedStorage();
  
  useEffect(() => {
    if (isOpen) {
      loadSyncStatus();
    }
  }, [isOpen]);
  
  const loadSyncStatus = async () => {
    setLoading(true);
    try {
      const status = await unifiedStorage.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRetry = async (itemId) => {
    await unifiedStorage.retryFailedItem(itemId);
    await loadSyncStatus(); // 刷新状态
  };
  
  const handleDelete = async (itemId) => {
    await unifiedStorage.deleteQueueItem(itemId);
    await loadSyncStatus(); // 刷新状态
  };
  
  const handleRetryAll = async () => {
    if (!syncStatus?.failed || syncStatus.failed.length === 0) return;
    
    for (const item of syncStatus.failed) {
      await unifiedStorage.retryFailedItem(item.id);
    }
    await loadSyncStatus();
  };
  
  const handleClearCompleted = async () => {
    if (!syncStatus?.completed || syncStatus.completed.length === 0) return;
    
    if (!confirm('确定要清空所有已完成的同步记录吗？')) {
      return;
    }
    
    for (const item of syncStatus.completed) {
      await unifiedStorage.deleteQueueItem(item.id);
    }
    await loadSyncStatus();
  };
  
  const handleClearFailed = async () => {
    if (!syncStatus?.failed || syncStatus.failed.length === 0) return;
    
    if (!confirm('确定要清空所有失败的同步记录吗？')) {
      return;
    }
    
    for (const item of syncStatus.failed) {
      await unifiedStorage.deleteQueueItem(item.id);
    }
    await loadSyncStatus();
  };
  
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  const getActionLabel = (action) => {
    const actionMap = {
      'add': '新增',
      'update': '更新',
      'delete': '删除'
    };
    return actionMap[action] || action;
  };
  
  const getEntityLabel = (entityType) => {
    const entityMap = {
      'task': '任务',
      'taskList': '任务列表'
    };
    return entityMap[entityType] || entityType;
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="sync-progress-container">
      <style jsx>{`
        .sync-progress-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sync-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
        }

        .sync-panel {
          position: relative;
          background: var(--parchment);
          border: 2px solid rgb(from var(--ink-brown) r g b / 0.2);
          border-radius: 16px;
          box-shadow: 0 20px 40px var(--shadow-soft);
          max-width: 48rem;
          width: 90vw;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .sync-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: none;
          border: none;
          padding: 0.25rem;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s;
        }

        .sync-close:hover {
          background: var(--parchment-dark);
        }
      `}</style>
      
      {/* 背景遮罩 */}
      <div className="sync-backdrop" onClick={onClose} />
      
      {/* 主面板 */}
      <div className="sync-panel">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="sync-close"
          title="关闭"
        >
          <X size={20} className="text-[var(--ink-brown)]" />
        </button>

        <div className="p-6 border-b border-[var(--ink-brown)]/10">
          {/* 标题 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-[var(--accent-gold)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCw size={32} className="text-[var(--accent-gold)]" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--ink-black)] font-['Caveat']">
              同步进度
            </h2>
            <p className="text-[var(--ink-brown)] mt-2 text-sm font-['Noto_Serif_SC']">
              查看和管理数据同步状态
            </p>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-[var(--accent-gold)] animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* 处理中的同步 */}
              {syncStatus?.processing?.length > 0 && (
                <section>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--ink-black)] mb-3 font-['Caveat']">
                    <Loader2 className="w-5 h-5 animate-spin text-[var(--accent-gold)]" />
                    正在同步 ({syncStatus.processing.length})
                  </h3>
                  <div className="space-y-2">
                    {syncStatus.processing.map(item => (
                      <div key={item.id} className="bg-[var(--white-trans)] border border-[var(--ink-brown)]/10 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-gold)]" />
                          <span className="text-[var(--ink-brown)] font-['Noto_Serif_SC']">
                            {getActionLabel(item.action)} {getEntityLabel(item.entityType)}
                          </span>
                        </div>
                        <span className="text-xs text-[var(--ink-brown)]/60">
                          处理中...
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              
              {/* 等待同步的项 */}
              {syncStatus?.pending?.length > 0 && (
                <section>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--ink-black)] mb-3 font-['Caveat']">
                    <Clock className="w-5 h-5 text-[var(--ink-brown)]" />
                    等待同步 ({syncStatus.pending.length})
                  </h3>
                  <div className="space-y-2">
                    {syncStatus.pending.map(item => (
                      <div key={item.id} className="bg-[var(--white-trans)] border border-[var(--ink-brown)]/10 rounded-lg p-3 flex items-center justify-between">
                        <span className="text-[var(--ink-brown)] font-['Noto_Serif_SC']">
                          {getActionLabel(item.action)} {getEntityLabel(item.entityType)}
                        </span>
                        <span className="text-xs text-[var(--ink-brown)]/60">
                          {formatTime(item.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              
              {/* 失败的同步 */}
              {syncStatus?.failed?.length > 0 && (
                <section>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-red-600 mb-3 font-['Caveat']">
                    <AlertCircle className="w-5 h-5" />
                    同步失败 ({syncStatus.failed.length})
                  </h3>
                  <div className="space-y-2">
                    {syncStatus.failed.map(item => (
                      <div key={item.id} className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-[var(--ink-brown)] font-['Noto_Serif_SC']">
                              {getActionLabel(item.action)} {getEntityLabel(item.entityType)}
                            </div>
                            <div className="text-sm text-red-600 mt-1">
                              错误: {item.error || '未知错误'}
                            </div>
                            <div className="text-xs text-[var(--ink-brown)]/60 mt-1">
                              重试次数: {item.retryCount} | {formatTime(item.createdAt)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button 
                              onClick={() => handleRetry(item.id)}
                              className="px-3 py-1 bg-[var(--accent-gold)] text-white rounded-md text-sm hover:bg-[var(--accent-gold)]/90 transition-colors flex items-center gap-1"
                            >
                              <RefreshCw size={14} />
                              重试
                            </button>
                            <button 
                              onClick={() => handleDelete(item.id)}
                              className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors flex items-center gap-1"
                              title="放弃该同步"
                            >
                              <Trash2 size={14} />
                              删除
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    <button 
                      onClick={handleRetryAll}
                      className="px-4 py-2 bg-[var(--accent-gold)] text-white rounded-md text-sm hover:bg-[var(--accent-gold)]/90 transition-colors flex items-center gap-2"
                    >
                      <RefreshCw size={16} />
                      重试全部
                    </button>
                    <button 
                      onClick={handleClearFailed}
                      className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                      <Trash2 size={16} />
                      清空失败记录
                    </button>
                  </div>
                </section>
              )}
              
              {/* 已完成的同步 */}
              {syncStatus?.completed?.length > 0 && (
                <section>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-green-600 mb-3 font-['Caveat']">
                    <CheckCircle className="w-5 h-5" />
                    已同步 ({syncStatus.completed.length})
                  </h3>
                  <div className="space-y-2">
                    {syncStatus.completed.slice(0, 10).map(item => (
                      <div key={item.id} className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <span className="text-[var(--ink-brown)] font-['Noto_Serif_SC']">
                            {getActionLabel(item.action)} {getEntityLabel(item.entityType)}
                          </span>
                          <span className="text-xs text-[var(--ink-brown)]/60 ml-2">
                            {formatTime(item.completedAt)}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-1 hover:bg-green-100 rounded transition-colors"
                          title="从列表中移除"
                        >
                          <X size={16} className="text-[var(--ink-brown)]/60" />
                        </button>
                      </div>
                    ))}
                    {syncStatus.completed.length > 10 && (
                      <div className="text-center text-sm text-[var(--ink-brown)]/60 py-2">
                        还有 {syncStatus.completed.length - 10} 项...
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={handleClearCompleted}
                    className="mt-4 px-4 py-2 bg-[var(--ink-brown)] text-white rounded-md text-sm hover:bg-[var(--ink-brown)]/90 transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    清空已完成记录
                  </button>
                </section>
              )}
              
              {/* 无数据状态 */}
              {(!syncStatus || Object.values(syncStatus).every(arr => !arr || arr.length === 0)) && (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-[var(--accent-gold)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <RefreshCw size={48} className="text-[var(--accent-gold)]/50" />
                  </div>
                  <p className="text-[var(--ink-brown)]/60 font-['Noto_Serif_SC']">
                    暂无同步记录
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* 底部按钮 */}
        <div className="border-t border-[var(--ink-brown)]/10 p-4">
          <button 
            onClick={onClose} 
            className="w-full py-2 px-4 bg-[var(--ink-brown)] text-white rounded-lg hover:bg-[var(--ink-brown)]/90 transition-colors font-['Noto_Serif_SC']"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}