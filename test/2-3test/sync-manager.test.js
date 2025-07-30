/**
 * SyncManager 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock supabase-db functions
jest.mock('../../src/lib/supabase-db.js', () => ({
  addSupabaseTask: jest.fn(),
  updateSupabaseTask: jest.fn(),
  deleteSupabaseTask: jest.fn(),
  addSupabaseTaskList: jest.fn(),
  updateSupabaseTaskList: jest.fn(),
  deleteSupabaseTaskList: jest.fn()
}));

import * as syncManager from '../../src/lib/sync-manager.js';
import * as supabaseDb from '../../src/lib/supabase-db.js';

describe('SyncManager', () => {
  beforeEach(() => {
    // 清理状态
    syncManager.setProcessing(false);
    syncManager.clearNetworkRestoreCallbacks();
    
    // 清理所有 mock
    jest.clearAllMocks();
    
    // 设置默认的 mock 返回值
    supabaseDb.addSupabaseTask.mockResolvedValue({ id: 'test-id', text: 'Test task' });
    supabaseDb.updateSupabaseTask.mockResolvedValue({ id: 'test-id', text: 'Updated task' });
    supabaseDb.deleteSupabaseTask.mockResolvedValue({ id: 'test-id', deleted: 1 });
    supabaseDb.addSupabaseTaskList.mockResolvedValue({ id: 'list-id', name: 'Test list' });
    supabaseDb.updateSupabaseTaskList.mockResolvedValue({ id: 'list-id', name: 'Updated list' });
    supabaseDb.deleteSupabaseTaskList.mockResolvedValue({ id: 'list-id', deleted: 2 });
  });

  afterEach(() => {
    // 清理监听器
    syncManager.destroyNetworkListener();
  });

  describe('状态管理', () => {
    it('应该正确设置和获取处理状态', () => {
      expect(syncManager.getProcessing()).toBe(false);
      
      syncManager.setProcessing(true);
      expect(syncManager.getProcessing()).toBe(true);
      
      syncManager.setProcessing(false);
      expect(syncManager.getProcessing()).toBe(false);
    });
  });

  describe('同步操作', () => {
    it('应该正确执行任务添加同步', async () => {
      const taskData = { text: 'Test task', completed: 0 };
      const result = await syncManager.syncTask('add', 'test-id', taskData);

      expect(supabaseDb.addSupabaseTask).toHaveBeenCalledWith(taskData);
      expect(result).toEqual({ id: 'test-id', text: 'Test task' });
    });

    it('应该正确执行任务更新同步', async () => {
      const updates = { text: 'Updated task' };
      const result = await syncManager.syncTask('update', 'test-id', updates);

      expect(supabaseDb.updateSupabaseTask).toHaveBeenCalledWith('test-id', updates);
      expect(result).toEqual({ id: 'test-id', text: 'Updated task' });
    });

    it('应该正确执行任务删除同步', async () => {
      const result = await syncManager.syncTask('delete', 'test-id', { deleted: 1 });

      expect(supabaseDb.deleteSupabaseTask).toHaveBeenCalledWith('test-id', false);
      expect(result).toEqual({ id: 'test-id', deleted: 1 });
    });

    it('应该正确执行任务永久删除同步', async () => {
      const result = await syncManager.syncTask('delete', 'test-id', { deleted: 2 });

      expect(supabaseDb.deleteSupabaseTask).toHaveBeenCalledWith('test-id', true);
      expect(result).toEqual({ id: 'test-id', deleted: 1 });
    });

    it('应该正确执行任务列表添加同步', async () => {
      const listData = { name: 'Test list', isActive: 0 };
      const result = await syncManager.syncTaskList('add', 'list-id', listData);

      expect(supabaseDb.addSupabaseTaskList).toHaveBeenCalledWith('Test list', listData);
      expect(result).toEqual({ id: 'list-id', name: 'Test list' });
    });

    it('应该正确执行任务列表更新同步', async () => {
      const updates = { name: 'Updated list', isActive: 1 };
      const result = await syncManager.syncTaskList('update', 'list-id', updates);

      expect(supabaseDb.updateSupabaseTaskList).toHaveBeenCalledWith('list-id', updates);
      expect(result).toEqual({ id: 'list-id', name: 'Updated list' });
    });

    it('应该正确执行任务列表删除同步', async () => {
      const result = await syncManager.syncTaskList('delete', 'list-id', {});

      expect(supabaseDb.deleteSupabaseTaskList).toHaveBeenCalledWith('list-id');
      expect(result).toEqual({ id: 'list-id', deleted: 2 });
    });

    it('应该通过统一入口正确路由同步操作', async () => {
      // 测试任务同步
      const taskResult = await syncManager.sync('add', 'task', 'task-id', {
        text: 'Test task'
      });
      expect(supabaseDb.addSupabaseTask).toHaveBeenCalled();
      expect(taskResult.id).toBe('test-id');

      // 测试任务列表同步
      const listResult = await syncManager.sync('update', 'taskList', 'list-id', {
        name: 'Test list'
      });
      expect(supabaseDb.updateSupabaseTaskList).toHaveBeenCalled();
      expect(listResult.id).toBe('list-id');
    });

    it('应该拒绝未知的实体类型', async () => {
      await expect(
        syncManager.sync('add', 'unknown', 'id', {})
      ).rejects.toThrow('Unknown entity type: unknown');
    });
  });

  describe('错误处理', () => {
    it('应该正确识别可重试的网络错误', () => {
      const networkErrors = [
        { code: 'NETWORK_ERROR' },
        { message: 'fetch failed' },
        { message: 'network timeout' },
        { message: 'Network request failed' },
        { code: 'TIMEOUT' },
        { message: 'Request timeout' },
        { code: 'ECONNREFUSED' },
        { code: 'ECONNRESET' },
        { message: 'connection refused' },
        { status: 500 },
        { status: 502 },
        { status: 503 },
        { status: 504 }
      ];

      networkErrors.forEach(error => {
        expect(syncManager.isRetryableError(error)).toBe(true);
      });
    });

    it('应该正确识别不可重试的错误', () => {
      const nonRetryableErrors = [
        { status: 400 },  // Bad Request
        { status: 401 },  // Unauthorized
        { status: 403 },  // Forbidden
        { status: 404 },  // Not Found
        { status: 422 },  // Unprocessable Entity
        { code: 'AUTH_ERROR' },
        { code: 'VALIDATION_ERROR' },
        { message: 'Invalid data' }
      ];

      nonRetryableErrors.forEach(error => {
        expect(syncManager.isRetryableError(error)).toBe(false);
      });
    });

    it('应该正确分类错误类型', () => {
      // 认证错误
      expect(syncManager.classifyError({ status: 401 })).toBe(syncManager.ERROR_TYPES.AUTH);
      expect(syncManager.classifyError({ status: 403 })).toBe(syncManager.ERROR_TYPES.AUTH);
      expect(syncManager.classifyError({ code: 'AUTH_ERROR' })).toBe(syncManager.ERROR_TYPES.AUTH);
      expect(syncManager.classifyError({ message: 'unauthorized' })).toBe(syncManager.ERROR_TYPES.AUTH);

      // 验证错误
      expect(syncManager.classifyError({ status: 400 })).toBe(syncManager.ERROR_TYPES.VALIDATION);
      expect(syncManager.classifyError({ status: 422 })).toBe(syncManager.ERROR_TYPES.VALIDATION);
      expect(syncManager.classifyError({ code: 'VALIDATION_ERROR' })).toBe(syncManager.ERROR_TYPES.VALIDATION);
      expect(syncManager.classifyError({ message: 'validation failed' })).toBe(syncManager.ERROR_TYPES.VALIDATION);

      // 服务器错误
      expect(syncManager.classifyError({ status: 500 })).toBe(syncManager.ERROR_TYPES.SERVER);
      expect(syncManager.classifyError({ status: 503 })).toBe(syncManager.ERROR_TYPES.SERVER);

      // 网络错误
      expect(syncManager.classifyError({ code: 'NETWORK_ERROR' })).toBe(syncManager.ERROR_TYPES.NETWORK);
      expect(syncManager.classifyError({ message: 'fetch failed' })).toBe(syncManager.ERROR_TYPES.NETWORK);

      // 未知错误
      expect(syncManager.classifyError({ message: 'something went wrong' })).toBe(syncManager.ERROR_TYPES.UNKNOWN);
    });
  });

  describe('网络监听', () => {
    it('应该正确注册和执行网络恢复回调', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      // 注册回调
      syncManager.onNetworkRestore(callback1);
      syncManager.onNetworkRestore(callback2);

      // 初始化监听器
      syncManager.initNetworkListener();

      // 模拟网络恢复事件
      window.dispatchEvent(new Event('online'));

      // 验证回调被执行
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('应该正确移除网络恢复回调', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      // 注册回调
      syncManager.onNetworkRestore(callback1);
      syncManager.onNetworkRestore(callback2);

      // 移除第一个回调
      syncManager.offNetworkRestore(callback1);

      // 初始化监听器
      syncManager.initNetworkListener();

      // 模拟网络恢复事件
      window.dispatchEvent(new Event('online'));

      // 验证只有第二个回调被执行
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('应该防止重复初始化', () => {
      const originalAddEventListener = window.addEventListener;
      window.addEventListener = jest.fn();

      // 第一次初始化
      syncManager.initNetworkListener();
      expect(window.addEventListener).toHaveBeenCalledTimes(2);

      // 再次初始化应该被忽略
      syncManager.initNetworkListener();
      expect(window.addEventListener).toHaveBeenCalledTimes(2);

      // 恢复原函数
      window.addEventListener = originalAddEventListener;
    });

    it('应该正确销毁网络监听器', () => {
      const callback = jest.fn();
      
      // 注册回调并初始化
      syncManager.onNetworkRestore(callback);
      syncManager.initNetworkListener();

      // 销毁监听器
      syncManager.destroyNetworkListener();

      // 模拟网络恢复事件
      window.dispatchEvent(new Event('online'));

      // 验证回调不会被执行
      expect(callback).not.toHaveBeenCalled();
    });

    it('应该正确报告网络状态', () => {
      // 默认情况下，测试环境中 navigator.onLine 应该为 true
      expect(syncManager.isOnline()).toBe(true);
    });

    it('应该处理回调执行中的错误', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const normalCallback = jest.fn();

      // 注册回调
      syncManager.onNetworkRestore(errorCallback);
      syncManager.onNetworkRestore(normalCallback);

      // 初始化监听器
      syncManager.initNetworkListener();

      // 捕获控制台错误输出
      const originalError = console.error;
      console.error = jest.fn();

      // 模拟网络恢复事件
      window.dispatchEvent(new Event('online'));

      // 验证错误被捕获，其他回调仍然执行
      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        '[SyncManager] Error in network restore callback:',
        expect.any(Error)
      );

      // 恢复控制台
      console.error = originalError;
    });

    it('应该忽略非函数类型的回调', () => {
      // 尝试注册非函数类型
      syncManager.onNetworkRestore(null);
      syncManager.onNetworkRestore(undefined);
      syncManager.onNetworkRestore('not a function');
      syncManager.onNetworkRestore(123);

      // 注册一个正常的回调
      const validCallback = jest.fn();
      syncManager.onNetworkRestore(validCallback);

      // 初始化并触发事件
      syncManager.initNetworkListener();
      window.dispatchEvent(new Event('online'));

      // 只有有效的回调被执行
      expect(validCallback).toHaveBeenCalled();
    });
  });

  describe('边界情况', () => {
    it('应该处理空的changes对象', async () => {
      const result = await syncManager.syncTask('update', 'test-id', {});
      expect(supabaseDb.updateSupabaseTask).toHaveBeenCalledWith('test-id', {});
      expect(result).toEqual({ id: 'test-id', text: 'Updated task' });
    });

    it('应该处理错误情况', async () => {
      // 模拟错误
      supabaseDb.addSupabaseTask.mockRejectedValueOnce(new Error('Database error'));
      
      await expect(
        syncManager.syncTask('add', 'test-id', { text: 'test' })
      ).rejects.toThrow('Database error');
    });
  });
});