/**
 * SyncManager - 管理与Supabase的数据同步
 * 
 * 职责：
 * - 处理与Supabase的数据同步
 * - 执行同步重试逻辑
 * - 管理网络状态监听
 * - 处理数据格式转换
 */

import { 
  addSupabaseTask, 
  updateSupabaseTask, 
  deleteSupabaseTask,
  addSupabaseTaskList,
  updateSupabaseTaskList,
  deleteSupabaseTaskList
} from './supabase-db';

// 模块级状态
let isProcessing = false;
let networkRestoreCallbacks = [];
let hasInitialized = false;

// 状态管理
export function setProcessing(value) {
  isProcessing = value;
}

export function getProcessing() {
  return isProcessing;
}

/**
 * 执行任务同步操作
 * @param {string} action - 操作类型: add/update/delete
 * @param {string} entityId - 实体ID
 * @param {Object} changes - 变更数据
 * @returns {Promise<Object>} 同步结果
 */
export async function syncTask(action, entityId, changes) {
  switch (action) {
    case 'add':
      return await addSupabaseTask(changes);
    case 'update':
      return await updateSupabaseTask(entityId, changes);
    case 'delete':
      // 对于删除操作，检查 deleted 状态来决定是软删除还是墓碑
      const permanent = changes.deleted === 2;
      return await deleteSupabaseTask(entityId, permanent);
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * 执行任务列表同步操作
 * @param {string} action - 操作类型: add/update/delete
 * @param {string} entityId - 实体ID
 * @param {Object} changes - 变更数据
 * @returns {Promise<Object>} 同步结果
 */
export async function syncTaskList(action, entityId, changes) {
  switch (action) {
    case 'add':
      // 对于添加操作，changes 包含完整数据
      return await addSupabaseTaskList(changes.name, changes);
    case 'update':
      return await updateSupabaseTaskList(entityId, changes);
    case 'delete':
      // 任务列表只有墓碑删除
      return await deleteSupabaseTaskList(entityId);
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * 统一的同步入口
 * @param {string} action - 操作类型
 * @param {string} entityType - 实体类型: task/taskList
 * @param {string} entityId - 实体ID
 * @param {Object} changes - 变更数据
 * @returns {Promise<Object>} 同步结果
 */
export async function sync(action, entityType, entityId, changes) {
  switch (entityType) {
    case 'task':
      return await syncTask(action, entityId, changes);
    case 'taskList':
      return await syncTaskList(action, entityId, changes);
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

/**
 * 判断错误是否可重试
 * @param {Error} error - 错误对象
 * @returns {boolean} 是否可重试
 */
export function isRetryableError(error) {
  // 网络错误
  if (error.code === 'NETWORK_ERROR' || 
      error.message?.includes('fetch') ||
      error.message?.includes('network') ||
      error.message?.includes('Network')) {
    return true;
  }
  
  // 服务器错误 (5xx)
  if (error.status >= 500 && error.status < 600) {
    return true;
  }
  
  // 请求超时
  if (error.code === 'TIMEOUT' || error.message?.includes('timeout')) {
    return true;
  }
  
  // 连接错误
  if (error.code === 'ECONNREFUSED' || 
      error.code === 'ECONNRESET' ||
      error.message?.includes('connection')) {
    return true;
  }
  
  // 其他错误不可重试（如认证错误、数据验证错误等）
  return false;
}

/**
 * 注册网络恢复回调
 * @param {Function} callback - 回调函数
 */
export function onNetworkRestore(callback) {
  if (typeof callback === 'function') {
    networkRestoreCallbacks.push(callback);
  }
}

/**
 * 移除网络恢复回调
 * @param {Function} callback - 回调函数
 */
export function offNetworkRestore(callback) {
  const index = networkRestoreCallbacks.indexOf(callback);
  if (index > -1) {
    networkRestoreCallbacks.splice(index, 1);
  }
}

/**
 * 清空所有网络恢复回调
 */
export function clearNetworkRestoreCallbacks() {
  networkRestoreCallbacks = [];
}

/**
 * 初始化网络监听
 */
export function initNetworkListener() {
  // 避免重复初始化
  if (hasInitialized) {
    return;
  }
  
  // 检查是否在浏览器环境中
  if (typeof window === 'undefined') {
    console.warn('[SyncManager] Network listener not available in non-browser environment');
    return;
  }
  
  hasInitialized = true;
  
  // 监听网络恢复事件
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  console.log('[SyncManager] Network listener initialized');
}

/**
 * 销毁网络监听
 */
export function destroyNetworkListener() {
  if (!hasInitialized) {
    return;
  }
  
  hasInitialized = false;
  
  // 检查是否在浏览器环境中
  if (typeof window !== 'undefined') {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  }
  
  // 清空回调
  clearNetworkRestoreCallbacks();
  
  console.log('[SyncManager] Network listener destroyed');
}

/**
 * 处理网络恢复
 */
function handleOnline() {
  console.log('[SyncManager] Network restored, executing callbacks...');
  
  // 执行所有注册的回调
  networkRestoreCallbacks.forEach(callback => {
    try {
      callback();
    } catch (error) {
      console.error('[SyncManager] Error in network restore callback:', error);
    }
  });
}

/**
 * 处理网络断开
 */
function handleOffline() {
  console.log('[SyncManager] Network disconnected');
}

/**
 * 获取当前网络状态
 * @returns {boolean} 是否在线
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * 错误分类常量
 */
export const ERROR_TYPES = {
  NETWORK: 'network',       // 网络错误，可重试
  AUTH: 'auth',             // 认证错误，不自动重试
  VALIDATION: 'validation', // 数据验证错误，不可重试
  SERVER: 'server',         // 服务器错误，可重试
  UNKNOWN: 'unknown'        // 未知错误
};

/**
 * 分类错误类型
 * @param {Error} error - 错误对象
 * @returns {string} 错误类型
 */
export function classifyError(error) {
  // 认证错误
  if (error.status === 401 || error.status === 403 ||
      error.code === 'AUTH_ERROR' ||
      error.message?.includes('auth') ||
      error.message?.includes('unauthorized')) {
    return ERROR_TYPES.AUTH;
  }
  
  // 数据验证错误
  if (error.status === 400 || error.status === 422 ||
      error.code === 'VALIDATION_ERROR' ||
      error.message?.includes('validation') ||
      error.message?.includes('invalid')) {
    return ERROR_TYPES.VALIDATION;
  }
  
  // 服务器错误
  if (error.status >= 500 && error.status < 600) {
    return ERROR_TYPES.SERVER;
  }
  
  // 网络错误
  if (isRetryableError(error)) {
    return ERROR_TYPES.NETWORK;
  }
  
  return ERROR_TYPES.UNKNOWN;
}

// 创建 SyncManager 对象
const SyncManager = {
  // 状态管理
  setProcessing,
  getProcessing,
  
  // 同步操作
  sync,
  syncTask,
  syncTaskList,
  
  // 错误处理
  isRetryableError,
  classifyError,
  ERROR_TYPES,
  
  // 网络监听
  initNetworkListener,
  destroyNetworkListener,
  onNetworkRestore,
  offNetworkRestore,
  clearNetworkRestoreCallbacks,
  isOnline
};

// 导出默认对象
export default SyncManager;