/**
 * Supabase 数据层
 * 
 * 职责：
 * - 封装 Supabase 数据库操作
 * - 处理数据格式转换
 * - 实现错误处理和重试机制
 * - 提供任务和任务列表的 CRUD 接口
 */

import { createClient } from './supabase/client.js';
import { convertIndexedDBToSupabase, convertSupabaseToIndexedDB } from './data-converters.js';

// 获取 Supabase 客户端实例
let supabase = null;
function getSupabase() {
  if (!supabase) {
    supabase = createClient();
  }
  return supabase;
}

// 获取当前用户ID
async function getCurrentUserId() {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.id;
}

// =====================================================
// 任务操作 (Tasks)
// =====================================================

/**
 * 获取任务列表
 * @param {string} listId - 任务列表ID
 * @param {Object} options - 查询选项
 * @returns {Promise<Array>} 任务数组
 */
export async function getSupabaseTasks(listId, options = {}) {
  try {
    const supabase = getSupabase();
    const userId = await getCurrentUserId();
    
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('list_id', listId);
    
    // 只获取非墓碑数据
    if (!options.includeTombstones) {
      query = query.neq('deleted', 2);
    }
    
    // 添加排序
    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? true });
    } else {
      // 默认按象限和顺序排序
      query = query.order('quadrant').order('order');
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // 转换数据格式
    return data.map(task => convertSupabaseToIndexedDB(task));
  } catch (error) {
    console.error('Get tasks failed:', error);
    throw error;
  }
}

/**
 * 添加任务
 * @param {Object} taskData - 任务数据
 * @returns {Promise<Object>} 创建的任务
 */
export async function addSupabaseTask(taskData) {
  try {
    const supabase = getSupabase();
    const userId = await getCurrentUserId();
    
    // 验证任务列表归属
    await validateTaskListOwnership(taskData.listId, userId);
    
    // 转换数据格式
    const supabaseData = convertIndexedDBToSupabase(taskData, userId);
    
    const { data, error } = await supabase
      .from('tasks')
      .insert(supabaseData)
      .select()
      .single();
    
    if (error) throw error;
    
    return convertSupabaseToIndexedDB(data);
  } catch (error) {
    console.error('Add task failed:', error);
    throw error;
  }
}

/**
 * 更新任务
 * @param {string} id - 任务ID
 * @param {Object} updates - 更新数据
 * @returns {Promise<Object>} 更新后的任务
 */
export async function updateSupabaseTask(id, updates) {
  try {
    const supabase = getSupabase();
    const userId = await getCurrentUserId();
    
    // 验证任务归属
    await validateTaskOwnership(id, userId);
    
    // 准备更新数据
    const updateData = {};
    
    // 只更新实际变更的字段
    if ('text' in updates) updateData.text = updates.text;
    if ('completed' in updates) updateData.completed = updates.completed === 1;
    if ('deleted' in updates) updateData.deleted = updates.deleted;
    if ('quadrant' in updates) updateData.quadrant = updates.quadrant;
    if ('listId' in updates) updateData.list_id = updates.listId;
    if ('estimatedTime' in updates) updateData.estimated_time = updates.estimatedTime;
    if ('order' in updates) updateData.order = updates.order;
    
    // 更新 updated_at 由数据库触发器自动处理
    
    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    
    return convertSupabaseToIndexedDB(data);
  } catch (error) {
    console.error('Update task failed:', error);
    throw error;
  }
}

/**
 * 删除任务（软删除或墓碑）
 * @param {string} id - 任务ID
 * @param {boolean} permanent - 是否永久删除（墓碑状态）
 * @returns {Promise<Object>} 删除后的任务
 */
export async function deleteSupabaseTask(id, permanent = false) {
  try {
    const deleteStatus = permanent ? 2 : 1;
    return await updateSupabaseTask(id, { deleted: deleteStatus });
  } catch (error) {
    console.error('Delete task failed:', error);
    throw error;
  }
}

/**
 * 移动任务到不同象限
 * @param {string} taskId - 任务ID
 * @param {number} fromQuadrant - 原象限
 * @param {number} toQuadrant - 目标象限
 * @param {number} newOrder - 新的顺序号
 * @returns {Promise<Object>} 更新后的任务
 */
export async function moveSupabaseTask(taskId, fromQuadrant, toQuadrant, newOrder) {
  try {
    return await updateSupabaseTask(taskId, {
      quadrant: toQuadrant,
      order: newOrder
    });
  } catch (error) {
    console.error('Move task failed:', error);
    throw error;
  }
}

/**
 * 重新排序任务
 * @param {Array} tasks - 需要重新排序的任务数组
 * @returns {Promise<Array>} 更新后的任务数组
 */
export async function reorderSupabaseTasks(tasks) {
  try {
    const supabase = getSupabase();
    const userId = await getCurrentUserId();
    
    // 批量更新任务顺序
    const updates = tasks.map((task, index) => ({
      id: task.id,
      order: index,
      user_id: userId
    }));
    
    // Supabase 批量更新需要逐个执行
    const results = await Promise.all(
      updates.map(update => 
        supabase
          .from('tasks')
          .update({ order: update.order })
          .eq('id', update.id)
          .eq('user_id', update.user_id)
          .select()
          .single()
      )
    );
    
    // 检查是否有错误
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      throw new Error(`Batch update failed: ${errors[0].error.message}`);
    }
    
    // 返回更新后的任务
    return results.map(result => convertSupabaseToIndexedDB(result.data));
  } catch (error) {
    console.error('Reorder tasks failed:', error);
    throw error;
  }
}

// =====================================================
// 任务列表操作 (Task Lists)
// =====================================================

/**
 * 获取所有任务列表
 * @returns {Promise<Array>} 任务列表数组
 */
export async function getSupabaseTaskLists() {
  try {
    const supabase = getSupabase();
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('task_lists')
      .select('*')
      .eq('user_id', userId)
      .eq('deleted', 0) // 只获取未删除的列表
      .order('created_at');
    
    if (error) throw error;
    
    return data.map(list => convertSupabaseToIndexedDB(list));
  } catch (error) {
    console.error('Get task lists failed:', error);
    throw error;
  }
}

/**
 * 添加任务列表
 * @param {string} name - 列表名称
 * @param {Object} options - 其他选项
 * @returns {Promise<Object>} 创建的任务列表
 */
export async function addSupabaseTaskList(name, options = {}) {
  try {
    const supabase = getSupabase();
    const userId = await getCurrentUserId();
    
    const taskListData = {
      id: options.id || crypto.randomUUID(),
      user_id: userId,
      name: name,
      is_active: options.isActive === 1,
      deleted: 0,
      layout_mode: options.layoutMode || 'FOUR',
      show_eta: options.showETA !== false
    };
    
    const { data, error } = await supabase
      .from('task_lists')
      .insert(taskListData)
      .select()
      .single();
    
    if (error) throw error;
    
    return convertSupabaseToIndexedDB(data);
  } catch (error) {
    console.error('Add task list failed:', error);
    throw error;
  }
}

/**
 * 更新任务列表
 * @param {string} id - 列表ID
 * @param {Object} updates - 更新数据
 * @returns {Promise<Object>} 更新后的任务列表
 */
export async function updateSupabaseTaskList(id, updates) {
  try {
    const supabase = getSupabase();
    const userId = await getCurrentUserId();
    
    // 准备更新数据
    const updateData = {};
    
    if ('name' in updates) updateData.name = updates.name;
    if ('isActive' in updates) updateData.is_active = updates.isActive === 1;
    if ('deleted' in updates) updateData.deleted = updates.deleted;
    if ('layoutMode' in updates) updateData.layout_mode = updates.layoutMode;
    if ('showETA' in updates) updateData.show_eta = updates.showETA;
    
    const { data, error } = await supabase
      .from('task_lists')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    
    return convertSupabaseToIndexedDB(data);
  } catch (error) {
    console.error('Update task list failed:', error);
    throw error;
  }
}

/**
 * 删除任务列表（软删除，标记为墓碑）
 * @param {string} id - 列表ID
 * @returns {Promise<Object>} 删除后的任务列表
 */
export async function deleteSupabaseTaskList(id) {
  try {
    const supabase = getSupabase();
    const userId = await getCurrentUserId();
    
    // 使用事务确保任务和列表都被标记为删除
    // 注意：Supabase 不支持事务，所以我们按顺序执行
    
    // 1. 先将所有任务标记为墓碑
    const { error: tasksError } = await supabase
      .from('tasks')
      .update({ deleted: 2 })
      .eq('list_id', id)
      .eq('user_id', userId);
    
    if (tasksError) throw tasksError;
    
    // 2. 再将任务列表标记为墓碑
    const { data, error } = await supabase
      .from('task_lists')
      .update({ deleted: 2 })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    
    return convertSupabaseToIndexedDB(data);
  } catch (error) {
    console.error('Delete task list failed:', error);
    throw error;
  }
}

/**
 * 设置激活的任务列表
 * @param {string} id - 列表ID
 * @returns {Promise<Object>} 激活的任务列表
 */
export async function setSupabaseActiveTaskList(id) {
  try {
    const supabase = getSupabase();
    const userId = await getCurrentUserId();
    
    // 1. 先将所有列表设置为非激活
    const { error: deactivateError } = await supabase
      .from('task_lists')
      .update({ is_active: false })
      .eq('user_id', userId);
    
    if (deactivateError) throw deactivateError;
    
    // 2. 激活指定列表
    const { data, error } = await supabase
      .from('task_lists')
      .update({ is_active: true })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    
    return convertSupabaseToIndexedDB(data);
  } catch (error) {
    console.error('Set active task list failed:', error);
    throw error;
  }
}

// =====================================================
// 批量操作
// =====================================================

/**
 * 批量插入任务
 * @param {Array} tasks - 任务数组
 * @param {string} userId - 用户ID
 * @returns {Promise<Array>} 插入的任务数组
 */
export async function batchInsertTasks(tasks, userId) {
  try {
    const supabase = getSupabase();
    
    // 转换数据格式
    const supabaseTasks = tasks.map(task => 
      convertIndexedDBToSupabase(task, userId)
    );
    
    const { data, error } = await supabase
      .from('tasks')
      .insert(supabaseTasks)
      .select();
    
    if (error) throw error;
    
    return data.map(task => convertSupabaseToIndexedDB(task));
  } catch (error) {
    console.error('Batch insert tasks failed:', error);
    throw error;
  }
}

/**
 * 批量插入任务列表
 * @param {Array} taskLists - 任务列表数组
 * @param {string} userId - 用户ID
 * @returns {Promise<Array>} 插入的任务列表数组
 */
export async function batchInsertTaskLists(taskLists, userId) {
  try {
    const supabase = getSupabase();
    
    // 转换数据格式
    const supabaseTaskLists = taskLists.map(list => 
      convertIndexedDBToSupabase(list, userId)
    );
    
    const { data, error } = await supabase
      .from('task_lists')
      .insert(supabaseTaskLists)
      .select();
    
    if (error) throw error;
    
    return data.map(list => convertSupabaseToIndexedDB(list));
  } catch (error) {
    console.error('Batch insert task lists failed:', error);
    throw error;
  }
}

// =====================================================
// 数据验证函数
// =====================================================

/**
 * 验证任务列表归属
 * @param {string} listId - 列表ID
 * @param {string} userId - 用户ID
 * @returns {Promise<boolean>} 验证结果
 */
export async function validateTaskListOwnership(listId, userId) {
  try {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('task_lists')
      .select('user_id')
      .eq('id', listId)
      .single();
    
    if (error) {
      throw new Error(`Task list not found: ${listId}`);
    }
    
    if (data.user_id !== userId) {
      throw new Error(`Access denied: Task list ${listId} does not belong to user ${userId}`);
    }
    
    return true;
  } catch (error) {
    console.error('Validate task list ownership failed:', error);
    throw error;
  }
}

/**
 * 验证任务归属
 * @param {string} taskId - 任务ID
 * @param {string} userId - 用户ID
 * @returns {Promise<boolean>} 验证结果
 */
export async function validateTaskOwnership(taskId, userId) {
  try {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('tasks')
      .select('user_id')
      .eq('id', taskId)
      .single();
    
    if (error) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    if (data.user_id !== userId) {
      throw new Error(`Access denied: Task ${taskId} does not belong to user ${userId}`);
    }
    
    return true;
  } catch (error) {
    console.error('Validate task ownership failed:', error);
    throw error;
  }
}

// =====================================================
// 用户数据管理
// =====================================================

/**
 * 检查用户数据是否存在
 * @param {string} userId - 用户ID
 * @returns {Promise<boolean>} 是否存在数据
 */
export async function getUserDataExists(userId) {
  try {
    const supabase = getSupabase();
    
    // 检查是否有任务列表
    const { count, error } = await supabase
      .from('task_lists')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return count > 0;
  } catch (error) {
    console.error('Check user data exists failed:', error);
    throw error;
  }
}

// =====================================================
// 同步相关的查询
// =====================================================

/**
 * 获取自指定时间后更新的任务
 * @param {string} userId - 用户ID
 * @param {string} lastSyncTime - 最后同步时间 (ISO string)
 * @returns {Promise<Array>} 更新的任务数组
 */
export async function getUpdatedTasks(userId, lastSyncTime) {
  try {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', lastSyncTime)
      .order('updated_at', { ascending: true });
    
    if (error) throw error;
    
    return data.map(task => convertSupabaseToIndexedDB(task));
  } catch (error) {
    console.error('Get updated tasks failed:', error);
    throw error;
  }
}

/**
 * 获取自指定时间后更新的任务列表
 * @param {string} userId - 用户ID
 * @param {string} lastSyncTime - 最后同步时间 (ISO string)
 * @returns {Promise<Array>} 更新的任务列表数组
 */
export async function getUpdatedTaskLists(userId, lastSyncTime) {
  try {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('task_lists')
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', lastSyncTime)
      .order('updated_at', { ascending: true });
    
    if (error) throw error;
    
    return data.map(list => convertSupabaseToIndexedDB(list));
  } catch (error) {
    console.error('Get updated task lists failed:', error);
    throw error;
  }
}

// 创建 SupabaseDB 对象
const SupabaseDB = {
  // 任务操作
  getSupabaseTasks,
  addSupabaseTask,
  updateSupabaseTask,
  deleteSupabaseTask,
  moveSupabaseTask,
  reorderSupabaseTasks,
  
  // 任务列表操作
  getSupabaseTaskLists,
  addSupabaseTaskList,
  updateSupabaseTaskList,
  deleteSupabaseTaskList,
  setSupabaseActiveTaskList,
  
  // 批量操作
  batchInsertTasks,
  batchInsertTaskLists,
  
  // 数据验证
  validateTaskListOwnership,
  validateTaskOwnership,
  
  // 用户数据管理
  getUserDataExists,
  
  // 同步相关
  getUpdatedTasks,
  getUpdatedTaskLists
};

// 导出默认对象
export default SupabaseDB;