// src/lib/queue-manager.js
import { openDB } from 'idb';
import { generateId } from './indexeddb-manager';

const DB_NAME = 'iTodoApp';
const DB_VERSION = 1;
const SYNC_QUEUE_STORE = 'syncQueue';

// 延迟函数，确保队列项有不同的时间戳
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 添加操作到同步队列
 * @param {Object} operation - 操作对象
 * @param {string} operation.action - 操作类型 (add|update|delete)
 * @param {string} operation.entityType - 实体类型 (task|taskList)
 * @param {string} operation.entityId - 实体ID
 * @param {Object} operation.changes - 变更数据
 * @returns {Promise<Object>} 创建的队列项
 */
export async function addToQueue(operation) {
  // 添加 1ms 延迟，确保时间戳唯一
  await sleep(1);
  
  const queueItem = {
    id: generateId(),
    status: 'pending',
    action: operation.action,
    entityType: operation.entityType,
    entityId: operation.entityId,
    changes: operation.changes,
    createdAt: new Date(),
    completedAt: null,
    retryCount: 0,
    error: null
  };
  
  const db = await openDB(DB_NAME, DB_VERSION);
  await db.add(SYNC_QUEUE_STORE, queueItem);
  return queueItem;
}

/**
 * 批量添加操作到同步队列
 * @param {Array<Object>} operations - 操作对象数组
 * @returns {Promise<Array<Object>>} 创建的队列项数组
 */
export async function batchAddToQueue(operations) {
  const db = await openDB(DB_NAME, DB_VERSION);
  const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
  const store = tx.objectStore(SYNC_QUEUE_STORE);
  
  const queueItems = [];
  
  // 顺序创建队列项，每个之间有 1ms 延迟
  for (const operation of operations) {
    // 添加 1ms 延迟，确保每个项有不同时间戳
    // await sleep(1);
    
    const queueItem = {
      id: generateId(),
      status: 'pending',
      action: operation.action,
      entityType: operation.entityType,
      entityId: operation.entityId,
      changes: operation.changes,
      createdAt: new Date(),
      completedAt: null,
      retryCount: 0,
      error: null
    };
    
    // 立即添加到存储
    await store.add(queueItem);
    queueItems.push(queueItem);
  }
  
  // 等待事务完成
  await tx.done;
  
  return queueItems;
}

/**
 * 更新队列项状态
 * @param {string} itemId - 队列项ID
 * @param {string} status - 新状态 (pending|processing|completed|failed)
 * @param {string|null} error - 错误信息（可选）
 * @returns {Promise<Object|undefined>} 更新后的队列项
 */
export async function updateItemStatus(itemId, status, error = null) {
  const db = await openDB(DB_NAME, DB_VERSION);
  const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
  const store = tx.objectStore(SYNC_QUEUE_STORE);
  
  const item = await store.get(itemId);
  if (item) {
    item.status = status;
    item.error = error;
    if (status === 'completed') {
      item.completedAt = new Date();
    }
    await store.put(item);
    return item;
  }
  
  return undefined;
}

/**
 * 更新队列项的任意字段
 * @param {string} itemId - 队列项ID
 * @param {Object} updates - 要更新的字段
 * @returns {Promise<Object|undefined>} 更新后的队列项
 */
export async function updateItem(itemId, updates) {
  const db = await openDB(DB_NAME, DB_VERSION);
  const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
  const store = tx.objectStore(SYNC_QUEUE_STORE);
  
  const item = await store.get(itemId);
  if (item) {
    Object.assign(item, updates);
    await store.put(item);
    return item;
  }
  
  return undefined;
}

/**
 * 删除队列项
 * @param {string} itemId - 队列项ID
 * @returns {Promise<void>}
 */
export async function deleteQueueItem(itemId) {
  const db = await openDB(DB_NAME, DB_VERSION);
  return await db.delete(SYNC_QUEUE_STORE, itemId);
}

/**
 * 获取所有待处理的同步项
 * @returns {Promise<Array>} 待处理的同步项数组
 */
export async function getPendingItems() {
  const db = await openDB(DB_NAME, DB_VERSION);
  const items = await db.getAllFromIndex(SYNC_QUEUE_STORE, 'status', 'pending');
  // 按创建时间排序，确保先进先出（FIFO）
  return items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}
/**
 * 获取同步状态汇总
 * @returns {Promise<Object>} 包含各状态项的对象
 */
export async function getSyncStatus() {
  const db = await openDB(DB_NAME, DB_VERSION);
  
  const [pending, processing, failed, completed] = await Promise.all([
    db.getAllFromIndex(SYNC_QUEUE_STORE, 'status', 'pending'),
    db.getAllFromIndex(SYNC_QUEUE_STORE, 'status', 'processing'),
    db.getAllFromIndex(SYNC_QUEUE_STORE, 'status', 'failed'),
    db.getAllFromIndex(SYNC_QUEUE_STORE, 'status', 'completed')
  ]);
  
  // 对每个数组按创建时间排序（FIFO）
  const sortByCreatedAt = (items) => 
    items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  
  return { 
    pending: sortByCreatedAt(pending), 
    processing: sortByCreatedAt(processing), 
    failed: sortByCreatedAt(failed), 
    completed: sortByCreatedAt(completed)
  };
}



/**
 * 获取指定状态的队列项
 * @param {string} status - 状态 (pending|processing|completed|failed)
 * @returns {Promise<Array>} 符合状态的队列项数组
 */
export async function getItemsByStatus(status) {
  const db = await openDB(DB_NAME, DB_VERSION);
  const items = await db.getAllFromIndex(SYNC_QUEUE_STORE, 'status', status);
  // 按创建时间排序，确保先进先出（FIFO）
  return items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

/**
 * 获取指定实体的所有队列项
 * @param {string} entityId - 实体ID
 * @returns {Promise<Array>} 该实体的所有队列项
 */
export async function getItemsByEntityId(entityId) {
  const db = await openDB(DB_NAME, DB_VERSION);
  const allItems = await db.getAll(SYNC_QUEUE_STORE);
  // 过滤后按创建时间排序，确保先进先出（FIFO）
  return allItems
    .filter(item => item.entityId === entityId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

/**
 * 批量删除队列项
 * @param {Array<string>} itemIds - 要删除的队列项ID数组
 * @returns {Promise<void>}
 */
export async function deleteQueueItems(itemIds) {
  const db = await openDB(DB_NAME, DB_VERSION);
  const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
  const store = tx.objectStore(SYNC_QUEUE_STORE);
  
  for (const itemId of itemIds) {
    await store.delete(itemId);
  }
}

/**
 * 清空指定状态的所有队列项
 * @param {string} status - 状态 (pending|processing|completed|failed)
 * @returns {Promise<number>} 删除的项数
 */
export async function clearItemsByStatus(status) {
  const db = await openDB(DB_NAME, DB_VERSION);
  const items = await db.getAllFromIndex(SYNC_QUEUE_STORE, 'status', status);
  
  if (items.length === 0) {
    return 0;
  }
  
  const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
  const store = tx.objectStore(SYNC_QUEUE_STORE);
  
  for (const item of items) {
    await store.delete(item.id);
  }
  
  return items.length;
}

/**
 * 获取最近的同步记录（按创建时间倒序）
 * @param {number} limit - 返回的最大记录数
 * @returns {Promise<Array>} 最近的同步记录
 */
export async function getRecentItems(limit = 10) {
  const db = await openDB(DB_NAME, DB_VERSION);
  const items = await db.getAllFromIndex(SYNC_QUEUE_STORE, 'createdAt');
  
  // 按创建时间倒序排序 (处理Date对象可能被序列化为字符串的情况)
  items.sort((a, b) => {
    const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
    const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
    return timeB - timeA;
  });
  
  return items.slice(0, limit);
}

/**
 * 重置失败项为待处理状态
 * @param {string} itemId - 队列项ID
 * @returns {Promise<Object|undefined>} 更新后的队列项
 */
export async function resetFailedItem(itemId) {
  return await updateItem(itemId, {
    status: 'pending',
    retryCount: 0,
    error: null
  });
}

/**
 * 批量重置所有失败项
 * @returns {Promise<number>} 重置的项数
 */
export async function resetAllFailedItems() {
  const db = await openDB(DB_NAME, DB_VERSION);
  const failedItems = await db.getAllFromIndex(SYNC_QUEUE_STORE, 'status', 'failed');
  
  if (failedItems.length === 0) {
    return 0;
  }
  
  const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
  const store = tx.objectStore(SYNC_QUEUE_STORE);
  
  for (const item of failedItems) {
    item.status = 'pending';
    item.retryCount = 0;
    item.error = null;
    await store.put(item);
  }
  
  return failedItems.length;
}

/**
 * 获取队列统计信息
 * @returns {Promise<Object>} 统计信息
 */
export async function getQueueStats() {
  const status = await getSyncStatus();
  
  return {
    pendingCount: status.pending.length,
    processingCount: status.processing.length,
    failedCount: status.failed.length,
    completedCount: status.completed.length,
    totalCount: status.pending.length + status.processing.length + 
                 status.failed.length + status.completed.length
  };
}