'use client';

import { useState, useEffect } from 'react';
import { X, RefreshCw, Trash2, Clock, AlertCircle, CheckCircle, Loader2, ArrowUpDown } from 'lucide-react';
import { useUnifiedStorage } from '@/lib/unified-storage';

export default function SyncProgressModal({ isOpen, onClose }) {
  const [syncStatus, setSyncStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
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
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };
  
  const formatShortTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
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
  
  const getEntityName = (item) => {
    if (item.entityType === 'task') {
      return item.changes?.text || '未知任务';
    } else if (item.entityType === 'taskList') {
      return item.changes?.name || '未知列表';
    }
    return '未知';
  };
  
  // 排序已完成的项目
  const sortCompletedItems = (items) => {
    return [...items].sort((a, b) => {
      const dateA = new Date(a.completedAt);
      const dateB = new Date(b.completedAt);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  };
  
  // 切换排序
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
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
          max-width: 64rem;
          width: 90vw;
          max-height: 85vh;
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
        
        .sync-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }
        
        .sync-table th {
          text-align: left;
          padding: 0.75rem;
          background: var(--parchment-dark);
          border-bottom: 2px solid rgb(from var(--ink-brown) r g b / 0.2);
          font-weight: 600;
          color: var(--ink-black);
          font-family: 'Caveat', cursive;
          font-size: 1.1rem;
          position: sticky;
          top: 0;
          z-index: 1;
        }
        
        .sync-table td {
          padding: 0.75rem;
          border-bottom: 1px solid rgb(from var(--ink-brown) r g b / 0.1);
          color: var(--ink-brown);
          vertical-align: middle;
        }
        
        .sync-table tr:hover {
          background: rgb(from var(--accent-gold) r g b / 0.05);
        }
        
        .entity-id {
          font-family: monospace;
          font-size: 0.75rem;
          color: rgb(from var(--ink-brown) r g b / 0.6);
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          display: inline-block;
          vertical-align: middle;
        }
        
        .entity-id-tooltip {
          position: relative;
        }
        
        .entity-id-tooltip:hover .tooltip-content {
          display: block;
        }
        
        .tooltip-content {
          display: none;
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: var(--ink-black);
          color: white;
          padding: 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          white-space: nowrap;
          z-index: 10;
          margin-bottom: 5px;
        }
        
        .tooltip-content::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 5px solid transparent;
          border-top-color: var(--ink-black);
        }
        
        .entity-name {
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .sync-section {
          margin-bottom: 2rem;
        }
        
        .sync-section:last-child {
          margin-bottom: 0;
        }
        
        .action-buttons {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
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
                <section className="sync-section">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--ink-black)] mb-3 font-['Caveat']">
                    <Loader2 className="w-5 h-5 animate-spin text-[var(--accent-gold)]" />
                    正在同步 ({syncStatus.processing.length})
                  </h3>
                  <div className="overflow-x-auto rounded-lg border border-[var(--ink-brown)]/10">
                    <table className="sync-table">
                      <thead>
                        <tr>
                          <th style={{width: '80px'}}>状态</th>
                          <th style={{width: '80px'}}>操作</th>
                          <th style={{width: '100px'}}>类型</th>
                          <th>名称</th>
                          <th style={{width: '180px'}}>ID</th>
                          <th style={{width: '100px'}}>时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {syncStatus.processing.map(item => (
                          <tr key={item.id}>
                            <td>
                              <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-gold)]" />
                            </td>
                            <td>
                              <span className="font-medium">{getActionLabel(item.action)}</span>
                            </td>
                            <td>{getEntityLabel(item.entityType)}</td>
                            <td>
                              <div className="entity-name" title={getEntityName(item)}>
                                {getEntityName(item)}
                              </div>
                            </td>
                            <td>
                              <div className="entity-id-tooltip">
                                <code className="entity-id" title={item.entityId}>{item.entityId}</code>
                                <div className="tooltip-content">{item.entityId}</div>
                              </div>
                            </td>
                            <td className="text-xs text-[var(--ink-brown)]/60">
                              {formatShortTime(item.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
              
              {/* 等待同步的项 */}
              {syncStatus?.pending?.length > 0 && (
                <section className="sync-section">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--ink-black)] mb-3 font-['Caveat']">
                    <Clock className="w-5 h-5 text-[var(--ink-brown)]" />
                    等待同步 ({syncStatus.pending.length})
                  </h3>
                  <div className="overflow-x-auto rounded-lg border border-[var(--ink-brown)]/10">
                    <table className="sync-table">
                      <thead>
                        <tr>
                          <th style={{width: '80px'}}>状态</th>
                          <th style={{width: '80px'}}>操作</th>
                          <th style={{width: '100px'}}>类型</th>
                          <th>名称</th>
                          <th style={{width: '180px'}}>ID</th>
                          <th style={{width: '100px'}}>时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {syncStatus.pending.map(item => (
                          <tr key={item.id}>
                            <td>
                              <Clock className="w-4 h-4 text-[var(--ink-brown)]" />
                            </td>
                            <td>
                              <span className="font-medium">{getActionLabel(item.action)}</span>
                            </td>
                            <td>{getEntityLabel(item.entityType)}</td>
                            <td>
                              <div className="entity-name" title={getEntityName(item)}>
                                {getEntityName(item)}
                              </div>
                            </td>
                            <td>
                              <div className="entity-id-tooltip">
                                <code className="entity-id" title={item.entityId}>{item.entityId}</code>
                                <div className="tooltip-content">{item.entityId}</div>
                              </div>
                            </td>
                            <td className="text-xs text-[var(--ink-brown)]/60">
                              {formatShortTime(item.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
              
              {/* 失败的同步 */}
              {syncStatus?.failed?.length > 0 && (
                <section className="sync-section">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-red-600 mb-3 font-['Caveat']">
                    <AlertCircle className="w-5 h-5" />
                    同步失败 ({syncStatus.failed.length})
                  </h3>
                  <div className="overflow-x-auto rounded-lg border border-red-200">
                    <table className="sync-table">
                      <thead>
                        <tr style={{background: 'rgb(254 242 242)'}}>
                          <th style={{width: '80px'}}>状态</th>
                          <th style={{width: '80px'}}>操作</th>
                          <th style={{width: '100px'}}>类型</th>
                          <th>名称</th>
                          <th style={{width: '180px'}}>ID</th>
                          <th>错误信息</th>
                          <th style={{width: '80px'}}>重试次数</th>
                          <th style={{width: '100px'}}>时间</th>
                          <th style={{width: '140px'}}>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {syncStatus.failed.map(item => (
                          <tr key={item.id} style={{background: 'rgb(254 242 242)'}}>
                            <td>
                              <AlertCircle className="w-4 h-4 text-red-600" />
                            </td>
                            <td>
                              <span className="font-medium text-red-600">{getActionLabel(item.action)}</span>
                            </td>
                            <td>{getEntityLabel(item.entityType)}</td>
                            <td>
                              <div className="entity-name" title={getEntityName(item)}>
                                {getEntityName(item)}
                              </div>
                            </td>
                            <td>
                              <div className="entity-id-tooltip">
                                <code className="entity-id" title={item.entityId}>{item.entityId}</code>
                                <div className="tooltip-content">{item.entityId}</div>
                              </div>
                            </td>
                            <td>
                              <span className="text-sm text-red-600">{item.error || '未知错误'}</span>
                            </td>
                            <td className="text-center">{item.retryCount}</td>
                            <td className="text-xs text-[var(--ink-brown)]/60">
                              {formatShortTime(item.createdAt)}
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button 
                                  onClick={() => handleRetry(item.id)}
                                  className="px-2 py-1 bg-[var(--accent-gold)] text-white rounded text-xs hover:bg-[var(--accent-gold)]/90 transition-colors flex items-center gap-1"
                                >
                                  <RefreshCw size={12} />
                                  重试
                                </button>
                                <button 
                                  onClick={() => handleDelete(item.id)}
                                  className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors flex items-center gap-1"
                                  title="放弃该同步"
                                >
                                  <Trash2 size={12} />
                                  删除
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                <section className="sync-section">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-green-600 font-['Caveat']">
                      <CheckCircle className="w-5 h-5" />
                      已同步 ({syncStatus.completed.length})
                    </h3>
                    <button
                      onClick={toggleSortOrder}
                      className="px-3 py-1 bg-[var(--parchment-dark)] rounded-md text-sm hover:bg-[var(--ink-brown)]/10 transition-colors flex items-center gap-1"
                      title={`切换为${sortOrder === 'desc' ? '正序' : '倒序'}排列`}
                    >
                      <ArrowUpDown size={14} />
                      {sortOrder === 'desc' ? '倒序' : '正序'}
                    </button>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-green-200">
                    <table className="sync-table">
                      <thead>
                        <tr style={{background: 'rgb(240 253 244)'}}>
                          <th style={{width: '80px'}}>状态</th>
                          <th style={{width: '80px'}}>操作</th>
                          <th style={{width: '100px'}}>类型</th>
                          <th>名称</th>
                          <th style={{width: '180px'}}>ID</th>
                          <th style={{width: '150px'}}>完成时间</th>
                          <th style={{width: '60px'}}>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortCompletedItems(syncStatus.completed).slice(0, 10).map(item => (
                          <tr key={item.id} style={{background: 'rgb(240 253 244)'}}>
                            <td>
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </td>
                            <td>
                              <span className="font-medium text-green-600">{getActionLabel(item.action)}</span>
                            </td>
                            <td>{getEntityLabel(item.entityType)}</td>
                            <td>
                              <div className="entity-name" title={getEntityName(item)}>
                                {getEntityName(item)}
                              </div>
                            </td>
                            <td>
                              <div className="entity-id-tooltip">
                                <code className="entity-id" title={item.entityId}>{item.entityId}</code>
                                <div className="tooltip-content">{item.entityId}</div>
                              </div>
                            </td>
                            <td className="text-xs text-[var(--ink-brown)]/60">
                              {formatTime(item.completedAt)}
                            </td>
                            <td>
                              <button 
                                onClick={() => handleDelete(item.id)}
                                className="p-1 hover:bg-green-100 rounded transition-colors"
                                title="从列表中移除"
                              >
                                <X size={14} className="text-[var(--ink-brown)]/60" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {syncStatus.completed.length > 10 && (
                      <div className="text-center text-sm text-[var(--ink-brown)]/60 py-3 border-t border-green-200">
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