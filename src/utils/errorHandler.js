import { toast } from './toast';

/**
 * 错误处理和重试机制
 */
export class RetryableError extends Error {
  constructor(message, retryAction, retryCount = 0, maxRetries = 3) {
    super(message);
    this.name = 'RetryableError';
    this.retryAction = retryAction;
    this.retryCount = retryCount;
    this.maxRetries = maxRetries;
  }

  canRetry() {
    return this.retryCount < this.maxRetries;
  }

  async retry() {
    if (!this.canRetry()) {
      throw new Error('Max retries exceeded');
    }
    
    try {
      this.retryCount++;
      return await this.retryAction();
    } catch (error) {
      if (error instanceof RetryableError) {
        error.retryCount = this.retryCount;
        throw error;
      }
      throw new RetryableError(
        this.message, 
        this.retryAction, 
        this.retryCount, 
        this.maxRetries
      );
    }
  }
}

/**
 * 智能错误处理器
 */
export function handleError(error, context = {}) {
  const {
    operation = '操作',
    showToast = true,
    enableRetry = false,
    onRetry = null,
    rollbackAction = null
  } = context;

  console.error(`${operation} failed:`, error);

  // 执行回滚操作
  if (rollbackAction && typeof rollbackAction === 'function') {
    try {
      rollbackAction();
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
  }

  // 显示用户友好的错误提示
  if (showToast) {
    const message = getErrorMessage(error, operation);
    const toastOptions = {
      duration: 4000
    };

    // 如果支持重试，添加重试按钮
    if (enableRetry && onRetry) {
      toastOptions.action = {
        label: '重试',
        onClick: onRetry
      };
    }

    toast.error(message, toastOptions);
  }

  return error;
}

/**
 * 获取用户友好的错误消息
 */
function getErrorMessage(error, operation) {
  // 网络错误
  if (error.name === 'NetworkError' || error.message.includes('fetch')) {
    return `${operation}失败，请检查网络连接`;
  }

  // 数据库错误
  if (error.message.includes('IDB') || error.message.includes('IndexedDB')) {
    return `${operation}失败，数据库暂时不可用`;
  }

  // 权限错误
  if (error.message.includes('permission') || error.message.includes('unauthorized')) {
    return `${operation}失败，权限不足`;
  }

  // 数据验证错误
  if (error.message.includes('validation') || error.message.includes('invalid')) {
    return `${operation}失败，数据格式有误`;
  }

  // 默认错误消息
  return `${operation}失败，请稍后重试`;
}

/**
 * 创建重试包装器
 */
export function withRetry(asyncFunction, maxRetries = 3, delay = 1000) {
  return async function retryWrapper(...args) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await asyncFunction(...args);
      } catch (error) {
        lastError = error;
        
        // 如果不是最后一次尝试，等待后重试
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
          console.log(`Retry attempt ${attempt + 1}/${maxRetries} for:`, asyncFunction.name);
        }
      }
    }
    
    throw lastError;
  };
}

/**
 * 乐观更新包装器
 */
export function withOptimisticUpdate(
  optimisticUpdate,
  actualUpdate,
  rollbackUpdate,
  context = {}
) {
  return async function optimisticWrapper(...args) {
    // 执行乐观更新
    const rollbackData = optimisticUpdate(...args);
    
    try {
      // 执行实际更新
      const result = await actualUpdate(...args);
      return result;
    } catch (error) {
      // 失败时回滚
      if (rollbackUpdate && rollbackData) {
        try {
          rollbackUpdate(rollbackData);
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
        }
      }
      
      // 处理错误
      handleError(error, {
        operation: context.operation || '更新',
        showToast: context.showToast !== false,
        enableRetry: context.enableRetry || false,
        onRetry: context.onRetry,
        rollbackAction: context.rollbackAction
      });
      
      throw error;
    }
  };
}