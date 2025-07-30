// test/queue-manager.test.js
import 'fake-indexeddb/auto';
import { openDB } from 'idb';

// Polyfill for structuredClone in test environment
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
  };
}
import {
  addToQueue,
  getPendingItems,
  updateItemStatus,
  updateItem,
  getSyncStatus,
  deleteQueueItem,
  getItemsByStatus,
  getItemsByEntityId,
  deleteQueueItems,
  clearItemsByStatus,
  getRecentItems,
  resetFailedItem,
  resetAllFailedItems,
  getQueueStats
} from '../../src/lib/queue-manager';

// Mock generateId
jest.mock('../../src/lib/indexeddb-manager', () => ({
  generateId: jest.fn(() => `test-id-${Date.now()}-${Math.random()}`)
}));

describe('QueueManager', () => {
  let db;
  
  beforeEach(async () => {
    // 创建测试数据库
    db = await openDB('iTodoApp', 5, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('syncQueue')) {
          const queueStore = db.createObjectStore('syncQueue', {
            keyPath: 'id'
          });
          queueStore.createIndex('status', 'status');
          queueStore.createIndex('createdAt', 'createdAt');
          queueStore.createIndex('entityType', 'entityType');
          queueStore.createIndex('action', 'action');
        }
      }
    });
  });
  
  afterEach(async () => {
    // 清理数据库
    const tx = db.transaction(['syncQueue'], 'readwrite');
    await tx.objectStore('syncQueue').clear();
    await tx.complete;
    db.close();
  });
  
  describe('addToQueue', () => {
    it('应该成功添加操作到队列', async () => {
      const operation = {
        action: 'add',
        entityType: 'task',
        entityId: 'task-123',
        changes: { text: '测试任务' }
      };
      
      const queueItem = await addToQueue(operation);
      
      expect(queueItem).toMatchObject({
        id: expect.any(String),
        status: 'pending',
        action: 'add',
        entityType: 'task',
        entityId: 'task-123',
        changes: { text: '测试任务' },
        createdAt: expect.any(Date),
        completedAt: null,
        retryCount: 0,
        error: null
      });
      
      // 验证是否已存储
      const storedItem = await db.get('syncQueue', queueItem.id);
      expect(storedItem).toBeDefined();
    });
  });
  
  describe('getPendingItems', () => {
    it('应该返回所有待处理的项', async () => {
      // 添加多个不同状态的项
      await addToQueue({ action: 'add', entityType: 'task', entityId: '1', changes: {} });
      await addToQueue({ action: 'update', entityType: 'task', entityId: '2', changes: {} });
      
      const item3 = await addToQueue({ action: 'delete', entityType: 'task', entityId: '3', changes: {} });
      await updateItemStatus(item3.id, 'completed');
      
      const pendingItems = await getPendingItems();
      
      expect(pendingItems).toHaveLength(2);
      expect(pendingItems.every(item => item.status === 'pending')).toBe(true);
    });
  });
  
  describe('updateItemStatus', () => {
    it('应该更新队列项状态', async () => {
      const item = await addToQueue({ action: 'add', entityType: 'task', entityId: '1', changes: {} });
      
      const updatedItem = await updateItemStatus(item.id, 'processing');
      
      expect(updatedItem.status).toBe('processing');
      expect(updatedItem.error).toBeNull();
    });
    
    it('应该在完成时设置completedAt', async () => {
      const item = await addToQueue({ action: 'add', entityType: 'task', entityId: '1', changes: {} });
      
      const updatedItem = await updateItemStatus(item.id, 'completed');
      
      expect(updatedItem.status).toBe('completed');
      expect(updatedItem.completedAt).toBeInstanceOf(Date);
    });
    
    it('应该能设置错误信息', async () => {
      const item = await addToQueue({ action: 'add', entityType: 'task', entityId: '1', changes: {} });
      
      const updatedItem = await updateItemStatus(item.id, 'failed', '网络错误');
      
      expect(updatedItem.status).toBe('failed');
      expect(updatedItem.error).toBe('网络错误');
    });
    
    it('应该返回undefined如果项不存在', async () => {
      const result = await updateItemStatus('non-existent-id', 'completed');
      expect(result).toBeUndefined();
    });
  });
  
  describe('updateItem', () => {
    it('应该更新队列项的任意字段', async () => {
      const item = await addToQueue({ action: 'add', entityType: 'task', entityId: '1', changes: {} });
      
      const updatedItem = await updateItem(item.id, {
        retryCount: 3,
        error: '自定义错误'
      });
      
      expect(updatedItem.retryCount).toBe(3);
      expect(updatedItem.error).toBe('自定义错误');
      expect(updatedItem.status).toBe('pending'); // 未改变的字段应保持原值
    });
  });
  
  describe('getSyncStatus', () => {
    it('应该返回按状态分组的所有项', async () => {
      // 创建各种状态的项
      const item1 = await addToQueue({ action: 'add', entityType: 'task', entityId: '1', changes: {} });
      const item2 = await addToQueue({ action: 'update', entityType: 'task', entityId: '2', changes: {} });
      const item3 = await addToQueue({ action: 'delete', entityType: 'task', entityId: '3', changes: {} });
      const item4 = await addToQueue({ action: 'add', entityType: 'taskList', entityId: '4', changes: {} });
      
      await updateItemStatus(item2.id, 'processing');
      await updateItemStatus(item3.id, 'completed');
      await updateItemStatus(item4.id, 'failed', '错误');
      
      const status = await getSyncStatus();
      
      expect(status.pending).toHaveLength(1);
      expect(status.processing).toHaveLength(1);
      expect(status.completed).toHaveLength(1);
      expect(status.failed).toHaveLength(1);
    });
  });
  
  describe('deleteQueueItem', () => {
    it('应该删除指定的队列项', async () => {
      const item = await addToQueue({ action: 'add', entityType: 'task', entityId: '1', changes: {} });
      
      await deleteQueueItem(item.id);
      
      const storedItem = await db.get('syncQueue', item.id);
      expect(storedItem).toBeUndefined();
    });
  });
  
  describe('getItemsByEntityId', () => {
    it('应该返回指定实体的所有队列项', async () => {
      const entityId = 'task-123';
      
      await addToQueue({ action: 'add', entityType: 'task', entityId, changes: { text: 'v1' } });
      await addToQueue({ action: 'update', entityType: 'task', entityId, changes: { text: 'v2' } });
      await addToQueue({ action: 'update', entityType: 'task', entityId: 'other-task', changes: {} });
      
      const items = await getItemsByEntityId(entityId);
      
      expect(items).toHaveLength(2);
      expect(items.every(item => item.entityId === entityId)).toBe(true);
    });
  });
  
  describe('deleteQueueItems', () => {
    it('应该批量删除队列项', async () => {
      const item1 = await addToQueue({ action: 'add', entityType: 'task', entityId: '1', changes: {} });
      const item2 = await addToQueue({ action: 'update', entityType: 'task', entityId: '2', changes: {} });
      const item3 = await addToQueue({ action: 'delete', entityType: 'task', entityId: '3', changes: {} });
      
      await deleteQueueItems([item1.id, item2.id]);
      
      const remaining = await db.getAll('syncQueue');
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(item3.id);
    });
  });
  
  describe('clearItemsByStatus', () => {
    it('应该清空指定状态的所有项', async () => {
      const item1 = await addToQueue({ action: 'add', entityType: 'task', entityId: '1', changes: {} });
      const item2 = await addToQueue({ action: 'update', entityType: 'task', entityId: '2', changes: {} });
      const item3 = await addToQueue({ action: 'delete', entityType: 'task', entityId: '3', changes: {} });
      
      await updateItemStatus(item2.id, 'completed');
      await updateItemStatus(item3.id, 'completed');
      
      const deletedCount = await clearItemsByStatus('completed');
      
      expect(deletedCount).toBe(2);
      const remaining = await db.getAll('syncQueue');
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(item1.id);
    });
  });
  
  describe('getRecentItems', () => {
    it('应该返回最近创建的项', async () => {
      // 创建多个项，延迟以确保时间戳不同
      const items = [];
      for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 10));
        const item = await addToQueue({ 
          action: 'add', 
          entityType: 'task', 
          entityId: `${i}`, 
          changes: {} 
        });
        items.push(item);
      }
      
      const recentItems = await getRecentItems(3);
      
      expect(recentItems).toHaveLength(3);
      // 验证是否按时间倒序排列（最新的在前）
      expect(recentItems[0].entityId).toBe('4');
      expect(recentItems[1].entityId).toBe('3');
      expect(recentItems[2].entityId).toBe('2');
    });
  });
  
  describe('resetFailedItem', () => {
    it('应该重置失败项为待处理状态', async () => {
      const item = await addToQueue({ action: 'add', entityType: 'task', entityId: '1', changes: {} });
      await updateItem(item.id, { status: 'failed', error: '网络错误', retryCount: 3 });
      
      const resetItem = await resetFailedItem(item.id);
      
      expect(resetItem.status).toBe('pending');
      expect(resetItem.retryCount).toBe(0);
      expect(resetItem.error).toBeNull();
    });
  });
  
  describe('resetAllFailedItems', () => {
    it('应该重置所有失败项', async () => {
      const item1 = await addToQueue({ action: 'add', entityType: 'task', entityId: '1', changes: {} });
      const item2 = await addToQueue({ action: 'update', entityType: 'task', entityId: '2', changes: {} });
      const item3 = await addToQueue({ action: 'delete', entityType: 'task', entityId: '3', changes: {} });
      
      await updateItemStatus(item1.id, 'failed', '错误1');
      await updateItemStatus(item2.id, 'failed', '错误2');
      await updateItemStatus(item3.id, 'completed');
      
      const resetCount = await resetAllFailedItems();
      
      expect(resetCount).toBe(2);
      
      const status = await getSyncStatus();
      expect(status.failed).toHaveLength(0);
      expect(status.pending).toHaveLength(2);
      expect(status.completed).toHaveLength(1);
    });
  });
  
  describe('getQueueStats', () => {
    it('应该返回队列统计信息', async () => {
      // 创建各种状态的项
      await addToQueue({ action: 'add', entityType: 'task', entityId: '1', changes: {} });
      await addToQueue({ action: 'update', entityType: 'task', entityId: '2', changes: {} });
      
      const item3 = await addToQueue({ action: 'delete', entityType: 'task', entityId: '3', changes: {} });
      await updateItemStatus(item3.id, 'processing');
      
      const item4 = await addToQueue({ action: 'add', entityType: 'taskList', entityId: '4', changes: {} });
      await updateItemStatus(item4.id, 'completed');
      
      const item5 = await addToQueue({ action: 'update', entityType: 'taskList', entityId: '5', changes: {} });
      await updateItemStatus(item5.id, 'failed');
      
      const stats = await getQueueStats();
      
      expect(stats).toEqual({
        pendingCount: 2,
        processingCount: 1,
        failedCount: 1,
        completedCount: 1,
        totalCount: 5
      });
    });
  });
});