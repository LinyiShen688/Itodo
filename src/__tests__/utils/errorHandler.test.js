import { RetryableError, handleError, withRetry, withOptimisticUpdate } from '@/utils/errorHandler'

// Mock toast
jest.mock('@/utils/toast', () => ({
  toast: {
    error: jest.fn()
  }
}))

// Mock timers for retry delays
jest.useFakeTimers()

describe('RetryableError', () => {
  describe('基础功能', () => {
    it('应该正确创建 RetryableError 实例', () => {
      const retryAction = jest.fn()
      const error = new RetryableError('Test error', retryAction, 1, 3)

      expect(error.name).toBe('RetryableError')
      expect(error.message).toBe('Test error')
      expect(error.retryAction).toBe(retryAction)
      expect(error.retryCount).toBe(1)
      expect(error.maxRetries).toBe(3)
    })

    it('应该使用默认参数', () => {
      const retryAction = jest.fn()
      const error = new RetryableError('Test error', retryAction)

      expect(error.retryCount).toBe(0)
      expect(error.maxRetries).toBe(3)
    })
  })

  describe('canRetry 方法', () => {
    it('应该在未达到最大重试次数时返回 true', () => {
      const error = new RetryableError('Test', jest.fn(), 2, 3)
      expect(error.canRetry()).toBe(true)
    })

    it('应该在达到最大重试次数时返回 false', () => {
      const error = new RetryableError('Test', jest.fn(), 3, 3)
      expect(error.canRetry()).toBe(false)
    })

    it('应该在超过最大重试次数时返回 false', () => {
      const error = new RetryableError('Test', jest.fn(), 4, 3)
      expect(error.canRetry()).toBe(false)
    })
  })

  describe('retry 方法', () => {
    it('应该在成功时返回结果并增加重试计数', async () => {
      const retryAction = jest.fn().mockResolvedValue('success')
      const error = new RetryableError('Test', retryAction, 1, 3)

      const result = await error.retry()

      expect(result).toBe('success')
      expect(error.retryCount).toBe(2)
      expect(retryAction).toHaveBeenCalledTimes(1)
    })

    it('应该在超过最大重试次数时抛出错误', async () => {
      const retryAction = jest.fn()
      const error = new RetryableError('Test', retryAction, 3, 3)

      await expect(error.retry()).rejects.toThrow('Max retries exceeded')
      expect(retryAction).not.toHaveBeenCalled()
    })

    it('应该在 retryAction 失败时传播 RetryableError', async () => {
      const originalError = new RetryableError('Original', jest.fn(), 0, 3)
      const retryAction = jest.fn().mockRejectedValue(originalError)
      const error = new RetryableError('Test', retryAction, 1, 3)

      try {
        await error.retry()
      } catch (thrownError) {
        expect(thrownError).toBe(originalError)
        expect(thrownError.retryCount).toBe(2) // 应该更新重试计数
      }
    })

    it('应该在 retryAction 抛出普通错误时创建新的 RetryableError', async () => {
      const normalError = new Error('Normal error')
      const retryAction = jest.fn().mockRejectedValue(normalError)
      const error = new RetryableError('Test', retryAction, 1, 3)

      try {
        await error.retry()
      } catch (thrownError) {
        expect(thrownError).toBeInstanceOf(RetryableError)
        expect(thrownError.message).toBe('Test')
        expect(thrownError.retryCount).toBe(2)
        expect(thrownError.maxRetries).toBe(3)
      }
    })
  })
})

describe('handleError', () => {
  const { toast } = require('@/utils/toast')

  beforeEach(() => {
    jest.clearAllMocks()
    console.error = jest.fn() // Mock console.error
  })

  describe('基础错误处理', () => {
    it('应该记录错误到控制台', () => {
      const error = new Error('Test error')
      handleError(error)

      expect(console.error).toHaveBeenCalledWith('操作 failed:', error)
    })

    it('应该使用自定义操作名称', () => {
      const error = new Error('Test error')
      handleError(error, { operation: '保存任务' })

      expect(console.error).toHaveBeenCalledWith('保存任务 failed:', error)
    })

    it('应该返回原始错误', () => {
      const error = new Error('Test error')
      const result = handleError(error)

      expect(result).toBe(error)
    })
  })

  describe('Toast 通知', () => {
    it('应该默认显示 toast 错误提示', () => {
      const error = new Error('Test error')
      handleError(error)

      expect(toast.error).toHaveBeenCalledWith(
        '操作失败，请稍后重试',
        { duration: 4000 }
      )
    })

    it('应该在 showToast=false 时不显示 toast', () => {
      const error = new Error('Test error')
      handleError(error, { showToast: false })

      expect(toast.error).not.toHaveBeenCalled()
    })

    it('应该为网络错误显示特定消息', () => {
      const error = new Error('fetch failed')
      handleError(error, { operation: '加载数据' })

      expect(toast.error).toHaveBeenCalledWith(
        '加载数据失败，请检查网络连接',
        { duration: 4000 }
      )
    })

    it('应该为数据库错误显示特定消息', () => {
      const error = new Error('IDB operation failed')
      handleError(error, { operation: '保存数据' })

      expect(toast.error).toHaveBeenCalledWith(
        '保存数据失败，数据库暂时不可用',
        { duration: 4000 }
      )
    })

    it('应该为权限错误显示特定消息', () => {
      const error = new Error('permission denied')
      handleError(error, { operation: '删除文件' })

      expect(toast.error).toHaveBeenCalledWith(
        '删除文件失败，权限不足',
        { duration: 4000 }
      )
    })

    it('应该为验证错误显示特定消息', () => {
      const error = new Error('validation failed')
      handleError(error, { operation: '提交表单' })

      expect(toast.error).toHaveBeenCalledWith(
        '提交表单失败，数据格式有误',
        { duration: 4000 }
      )
    })
  })

  describe('重试功能', () => {
    it('应该在启用重试时添加重试按钮', () => {
      const error = new Error('Test error')
      const onRetry = jest.fn()

      handleError(error, {
        enableRetry: true,
        onRetry
      })

      expect(toast.error).toHaveBeenCalledWith(
        '操作失败，请稍后重试',
        {
          duration: 4000,
          action: {
            label: '重试',
            onClick: onRetry
          }
        }
      )
    })

    it('应该在没有 onRetry 时不添加重试按钮', () => {
      const error = new Error('Test error')

      handleError(error, { enableRetry: true })

      expect(toast.error).toHaveBeenCalledWith(
        '操作失败，请稍后重试',
        { duration: 4000 }
      )
    })
  })

  describe('回滚操作', () => {
    it('应该执行回滚操作', () => {
      const error = new Error('Test error')
      const rollbackAction = jest.fn()

      handleError(error, { rollbackAction })

      expect(rollbackAction).toHaveBeenCalledTimes(1)
    })

    it('应该处理回滚操作失败', () => {
      const error = new Error('Test error')
      const rollbackError = new Error('Rollback failed')
      const rollbackAction = jest.fn().mockImplementation(() => {
        throw rollbackError
      })

      handleError(error, { rollbackAction })

      expect(console.error).toHaveBeenCalledWith('Rollback failed:', rollbackError)
    })

    it('应该忽略非函数的回滚操作', () => {
      const error = new Error('Test error')

      expect(() => {
        handleError(error, { rollbackAction: 'not a function' })
      }).not.toThrow()
    })
  })
})

describe('withRetry', () => {
  beforeEach(() => {
    jest.clearAllTimers()
    console.log = jest.fn() // Mock console.log
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.clearAllTimers()
  })

  describe('成功场景', () => {
    it('应该在第一次尝试成功时返回结果', async () => {
      const asyncFunction = jest.fn().mockResolvedValue('success')
      const retryWrapper = withRetry(asyncFunction)

      const result = await retryWrapper('arg1', 'arg2')

      expect(result).toBe('success')
      expect(asyncFunction).toHaveBeenCalledTimes(1)
      expect(asyncFunction).toHaveBeenCalledWith('arg1', 'arg2')
    })
  })

  describe('重试机制', () => {
    it('应该使用默认配置进行重试', async () => {
      const asyncFunction = jest.fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValueOnce('success')

      const retryWrapper = withRetry(asyncFunction)

      // 开始异步操作
      const resultPromise = retryWrapper()

      // 等待第一次延迟
      jest.advanceTimersByTime(1000)
      await Promise.resolve()

      // 等待第二次延迟
      jest.advanceTimersByTime(2000)
      await Promise.resolve()

      const result = await resultPromise

      expect(result).toBe('success')
      expect(asyncFunction).toHaveBeenCalledTimes(3)
    })

    it('应该使用自定义配置进行重试', async () => {
      const asyncFunction = jest.fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockResolvedValueOnce('success')

      const retryWrapper = withRetry(asyncFunction, 2, 500)

      const resultPromise = retryWrapper()

      // 等待自定义延迟
      jest.advanceTimersByTime(500)
      await Promise.resolve()

      const result = await resultPromise

      expect(result).toBe('success')
      expect(asyncFunction).toHaveBeenCalledTimes(2)
    })

    it('应该在达到最大重试次数后抛出最后一个错误', async () => {
      const lastError = new Error('Final error')
      const asyncFunction = jest.fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockRejectedValueOnce(lastError)

      const retryWrapper = withRetry(asyncFunction, 3)

      const resultPromise = retryWrapper()

      // 快进所有延迟
      jest.advanceTimersByTime(6000) // 1000 + 2000 + 3000
      await Promise.resolve()

      await expect(resultPromise).rejects.toBe(lastError)
      expect(asyncFunction).toHaveBeenCalledTimes(3)
    })

    it('应该记录重试尝试', async () => {
      const asyncFunction = jest.fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockResolvedValueOnce('success')

      // 给函数一个名称用于日志
      Object.defineProperty(asyncFunction, 'name', { value: 'testFunction' })

      const retryWrapper = withRetry(asyncFunction)

      const resultPromise = retryWrapper()

      jest.advanceTimersByTime(1000)
      await Promise.resolve()

      await resultPromise

      expect(console.log).toHaveBeenCalledWith('Retry attempt 2/3 for:', 'testFunction')
    })

    it('应该增加延迟时间', async () => {
      const asyncFunction = jest.fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValueOnce('success')

      const retryWrapper = withRetry(asyncFunction, 3, 100)

      const start = Date.now()
      const resultPromise = retryWrapper()

      // 第一次重试：100ms
      jest.advanceTimersByTime(100)
      await Promise.resolve()

      // 第二次重试：200ms
      jest.advanceTimersByTime(200)
      await Promise.resolve()

      await resultPromise

      expect(asyncFunction).toHaveBeenCalledTimes(3)
    })
  })

  describe('边界情况', () => {
    it('应该处理同步错误', async () => {
      const asyncFunction = jest.fn().mockImplementation(() => {
        throw new Error('Sync error')
      })

      const retryWrapper = withRetry(asyncFunction, 2)

      const resultPromise = retryWrapper()

      jest.advanceTimersByTime(1000)
      await Promise.resolve()

      await expect(resultPromise).rejects.toThrow('Sync error')
      expect(asyncFunction).toHaveBeenCalledTimes(2)
    })

    it('应该处理 maxRetries = 1', async () => {
      const asyncFunction = jest.fn().mockRejectedValue(new Error('Always fails'))
      const retryWrapper = withRetry(asyncFunction, 1)

      await expect(retryWrapper()).rejects.toThrow('Always fails')
      expect(asyncFunction).toHaveBeenCalledTimes(1)
    })
  })
})

describe('withOptimisticUpdate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    console.error = jest.fn()
  })

  describe('成功场景', () => {
    it('应该执行乐观更新和实际更新', async () => {
      const optimisticUpdate = jest.fn().mockReturnValue('rollback-data')
      const actualUpdate = jest.fn().mockResolvedValue('success')
      const rollbackUpdate = jest.fn()

      const wrapper = withOptimisticUpdate(
        optimisticUpdate,
        actualUpdate,
        rollbackUpdate
      )

      const result = await wrapper('arg1', 'arg2')

      expect(optimisticUpdate).toHaveBeenCalledWith('arg1', 'arg2')
      expect(actualUpdate).toHaveBeenCalledWith('arg1', 'arg2')
      expect(rollbackUpdate).not.toHaveBeenCalled()
      expect(result).toBe('success')
    })
  })

  describe('失败和回滚', () => {
    it('应该在实际更新失败时执行回滚', async () => {
      const optimisticUpdate = jest.fn().mockReturnValue('rollback-data')
      const actualUpdate = jest.fn().mockRejectedValue(new Error('Update failed'))
      const rollbackUpdate = jest.fn()

      const wrapper = withOptimisticUpdate(
        optimisticUpdate,
        actualUpdate,
        rollbackUpdate
      )

      await expect(wrapper('arg1')).rejects.toThrow('Update failed')

      expect(optimisticUpdate).toHaveBeenCalledWith('arg1')
      expect(actualUpdate).toHaveBeenCalledWith('arg1')
      expect(rollbackUpdate).toHaveBeenCalledWith('rollback-data')
    })

    it('应该处理回滚失败', async () => {
      const optimisticUpdate = jest.fn().mockReturnValue('rollback-data')
      const actualUpdate = jest.fn().mockRejectedValue(new Error('Update failed'))
      const rollbackUpdate = jest.fn().mockImplementation(() => {
        throw new Error('Rollback failed')
      })

      const wrapper = withOptimisticUpdate(
        optimisticUpdate,
        actualUpdate,
        rollbackUpdate
      )

      await expect(wrapper()).rejects.toThrow('Update failed')

      expect(console.error).toHaveBeenCalledWith('Rollback failed:', expect.any(Error))
    })

    it('应该在没有回滚数据时跳过回滚', async () => {
      const optimisticUpdate = jest.fn().mockReturnValue(null)
      const actualUpdate = jest.fn().mockRejectedValue(new Error('Update failed'))
      const rollbackUpdate = jest.fn()

      const wrapper = withOptimisticUpdate(
        optimisticUpdate,
        actualUpdate,
        rollbackUpdate
      )

      await expect(wrapper()).rejects.toThrow('Update failed')

      expect(rollbackUpdate).not.toHaveBeenCalled()
    })

    it('应该在没有回滚函数时跳过回滚', async () => {
      const optimisticUpdate = jest.fn().mockReturnValue('rollback-data')
      const actualUpdate = jest.fn().mockRejectedValue(new Error('Update failed'))

      const wrapper = withOptimisticUpdate(
        optimisticUpdate,
        actualUpdate,
        null
      )

      await expect(wrapper()).rejects.toThrow('Update failed')
      // 不应该抛出额外的错误
    })
  })

  describe('错误处理集成', () => {
    const { toast } = require('@/utils/toast')

    it('应该使用默认错误处理上下文', async () => {
      const optimisticUpdate = jest.fn().mockReturnValue('rollback-data')
      const actualUpdate = jest.fn().mockRejectedValue(new Error('Update failed'))
      const rollbackUpdate = jest.fn()

      const wrapper = withOptimisticUpdate(
        optimisticUpdate,
        actualUpdate,
        rollbackUpdate
      )

      await expect(wrapper()).rejects.toThrow('Update failed')

      expect(toast.error).toHaveBeenCalledWith(
        '更新失败，请稍后重试',
        expect.objectContaining({
          duration: 4000
        })
      )
    })

    it('应该使用自定义错误处理上下文', async () => {
      const optimisticUpdate = jest.fn().mockReturnValue('rollback-data')
      const actualUpdate = jest.fn().mockRejectedValue(new Error('Update failed'))
      const rollbackUpdate = jest.fn()
      const onRetry = jest.fn()

      const wrapper = withOptimisticUpdate(
        optimisticUpdate,
        actualUpdate,
        rollbackUpdate,
        {
          operation: '保存任务',
          enableRetry: true,
          onRetry,
          showToast: true
        }
      )

      await expect(wrapper()).rejects.toThrow('Update failed')

      expect(toast.error).toHaveBeenCalledWith(
        '保存任务失败，请稍后重试',
        expect.objectContaining({
          duration: 4000,
          action: {
            label: '重试',
            onClick: onRetry
          }
        })
      )
    })

    it('应该在 showToast=false 时不显示错误提示', async () => {
      const optimisticUpdate = jest.fn().mockReturnValue('rollback-data')
      const actualUpdate = jest.fn().mockRejectedValue(new Error('Update failed'))
      const rollbackUpdate = jest.fn()

      const wrapper = withOptimisticUpdate(
        optimisticUpdate,
        actualUpdate,
        rollbackUpdate,
        { showToast: false }
      )

      await expect(wrapper()).rejects.toThrow('Update failed')

      expect(toast.error).not.toHaveBeenCalled()
    })
  })
})