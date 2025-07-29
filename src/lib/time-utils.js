/**
 * 时区处理工具函数
 * 
 * 在多设备、多时区环境下，确保时间戳比较的一致性
 * 核心原则：所有时间戳统一转换为 UTC 毫秒数进行比较
 */

/**
 * 创建UTC时间戳
 * @returns {Date} 当前UTC时间的Date对象
 */
export function nowUTC() {
  return new Date(); // JavaScript Date 内部就是 UTC
}

/**
 * 标准化时间戳为UTC毫秒数
 * 支持多种输入格式：Date对象、ISO字符串、毫秒时间戳
 * 
 * @param {Date|string|number} timestamp - 时间戳
 * @returns {number} UTC毫秒数
 */
export function toUTCMillis(timestamp) {
  if (timestamp instanceof Date) {
    const time = timestamp.getTime();
    if (isNaN(time)) {
      throw new Error('Invalid timestamp format');
    }
    return time;
  }
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    const time = date.getTime();
    if (isNaN(time)) {
      throw new Error('Invalid timestamp format');
    }
    return time;
  }
  if (typeof timestamp === 'number') {
    if (isNaN(timestamp)) {
      throw new Error('Invalid timestamp format');
    }
    return timestamp;
  }
  throw new Error('Invalid timestamp format');
}

/**
 * 统一时间戳格式为UTC毫秒数
 * 这是 applyRemoteChange 中使用的时区统一函数
 * 
 * @param {Date|string|number} timestamp - 时间戳
 * @returns {number} UTC毫秒数
 */
export function normalizeToUTC(timestamp) {
  if (timestamp instanceof Date) {
    return timestamp.getTime(); // 返回UTC毫秒数
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp).getTime(); // ISO字符串自动解析为UTC
  }
  if (typeof timestamp === 'number') {
    return timestamp; // 假设已经是毫秒时间戳
  }
  throw new Error('Invalid timestamp format');
}

/**
 * 安全的时间戳比较
 * 确保两个时间戳都转换为相同格式后比较
 * 
 * @param {Date|string|number} timestamp1 - 第一个时间戳
 * @param {Date|string|number} timestamp2 - 第二个时间戳
 * @returns {number} 比较结果：> 0 表示 timestamp1 更新，< 0 表示 timestamp2 更新，= 0 表示相同
 */
export function compareTimestamps(timestamp1, timestamp2) {
  const t1 = toUTCMillis(timestamp1);
  const t2 = toUTCMillis(timestamp2);
  return t1 - t2;
}

/**
 * 格式化时间戳为ISO字符串（用于数据传输）
 * 
 * @param {Date|string|number} timestamp - 时间戳
 * @returns {string} ISO 8601 格式的UTC时间字符串
 */
export function toISOString(timestamp) {
  if (timestamp instanceof Date) {
    if (isNaN(timestamp.getTime())) {
      throw new Error('Invalid timestamp format');
    }
    return timestamp.toISOString();
  }
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid timestamp format');
    }
    return date.toISOString();
  }
  if (typeof timestamp === 'number') {
    if (isNaN(timestamp)) {
      throw new Error('Invalid timestamp format');
    }
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid timestamp format');
    }
    return date.toISOString();
  }
  throw new Error('Invalid timestamp format');
}

/**
 * 检查时间戳是否有效
 * 
 * @param {any} timestamp - 待检查的时间戳
 * @returns {boolean} 是否为有效时间戳
 */
export function isValidTimestamp(timestamp) {
  try {
    const millis = toUTCMillis(timestamp);
    return !isNaN(millis) && millis > 0;
  } catch {
    return false;
  }
}

/**
 * 为数据操作创建带时间戳的更新对象
 * 确保使用 UTC 时间
 * 
 * @param {Object} data - 原始数据
 * @returns {Object} 带有 updatedAt UTC 时间戳的数据
 */
export function withUpdatedTimestamp(data) {
  return {
    ...data,
    updatedAt: nowUTC()
  };
}

/**
 * 为数据操作创建带创建时间戳的新对象
 * 确保使用 UTC 时间
 * 
 * @param {Object} data - 原始数据
 * @returns {Object} 带有 createdAt 和 updatedAt UTC 时间戳的数据
 */
export function withTimestamps(data) {
  const now = nowUTC();
  return {
    ...data,
    createdAt: now,
    updatedAt: now
  };
}