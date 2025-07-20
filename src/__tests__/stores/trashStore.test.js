import { renderHook, act } from '@testing-library/react'
import { useTrashStore } from '@/stores/trashStore'
import * as indexeddb from '@/lib/indexeddb'

// Mock IndexedDB operations
jest.mock('@/lib/indexeddb', () => ({
  getAllDeletedTasks: jest.fn(),
}))

describe('trashStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // 重置store状态
    useTrashStore.setState({ deletedTaskCount: 0 })
  })

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const { result } = renderHook(() => useTrashStore())
      
      expect(result.current.deletedTaskCount).toBe(0)
    })
  })

  describe('updateDeletedTaskCount', () => {
    it('应该成功更新删除任务计数', async () => {
      const mockDeletedTasks = [
        { id: '1', deleted: 1 },
        { id: '2', deleted: 1 },
        { id: '3', deleted: 1 }
      ]
      
      indexeddb.getAllDeletedTasks.mockResolvedValue(mockDeletedTasks)
      
      const { result } = renderHook(() => useTrashStore())
      
      await act(async () => {
        await result.current.updateDeletedTaskCount()
      })
      
      expect(result.current.deletedTaskCount).toBe(3)
      expect(indexeddb.getAllDeletedTasks).toHaveBeenCalled()
    })

    it('应该处理获取失败的情况', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      indexeddb.getAllDeletedTasks.mockRejectedValue(new Error('Database error'))
      
      const { result } = renderHook(() => useTrashStore())
      
      await act(async () => {
        await result.current.updateDeletedTaskCount()
      })
      
      expect(result.current.deletedTaskCount).toBe(0) // 保持原状态
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to update deleted task count:',
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('incrementDeletedCount', () => {
    it('应该增加删除任务计数', () => {
      const { result } = renderHook(() => useTrashStore())
      
      act(() => {
        result.current.incrementDeletedCount()
      })
      
      expect(result.current.deletedTaskCount).toBe(1)
    })

    it('应该能连续增加', () => {
      const { result } = renderHook(() => useTrashStore())
      
      act(() => {
        result.current.incrementDeletedCount()
        result.current.incrementDeletedCount()
        result.current.incrementDeletedCount()
      })
      
      expect(result.current.deletedTaskCount).toBe(3)
    })
  })

  describe('decrementDeletedCount', () => {
    beforeEach(() => {
      // 设置一个初始值
      useTrashStore.setState({ deletedTaskCount: 5 })
    })

    it('应该减少删除任务计数', () => {
      const { result } = renderHook(() => useTrashStore())
      
      act(() => {
        result.current.decrementDeletedCount()
      })
      
      expect(result.current.deletedTaskCount).toBe(4)
    })

    it('应该不允许计数小于0', () => {
      // 重置为0
      useTrashStore.setState({ deletedTaskCount: 0 })
      
      const { result } = renderHook(() => useTrashStore())
      
      act(() => {
        result.current.decrementDeletedCount()
      })
      
      expect(result.current.deletedTaskCount).toBe(0)
    })

    it('应该从1减少到0', () => {
      useTrashStore.setState({ deletedTaskCount: 1 })
      
      const { result } = renderHook(() => useTrashStore())
      
      act(() => {
        result.current.decrementDeletedCount()
      })
      
      expect(result.current.deletedTaskCount).toBe(0)
    })
  })

  describe('resetDeletedCount', () => {
    it('应该重置删除任务计数为0', () => {
      // 设置一个非零值
      useTrashStore.setState({ deletedTaskCount: 10 })
      
      const { result } = renderHook(() => useTrashStore())
      
      act(() => {
        result.current.resetDeletedCount()
      })
      
      expect(result.current.deletedTaskCount).toBe(0)
    })
  })

  describe('decrementDeletedCountBy', () => {
    beforeEach(() => {
      useTrashStore.setState({ deletedTaskCount: 10 })
    })

    it('应该按指定数量减少计数', () => {
      const { result } = renderHook(() => useTrashStore())
      
      act(() => {
        result.current.decrementDeletedCountBy(3)
      })
      
      expect(result.current.deletedTaskCount).toBe(7)
    })

    it('应该不允许计数小于0', () => {
      const { result } = renderHook(() => useTrashStore())
      
      act(() => {
        result.current.decrementDeletedCountBy(15)
      })
      
      expect(result.current.deletedTaskCount).toBe(0)
    })

    it('应该处理0值输入', () => {
      const { result } = renderHook(() => useTrashStore())
      
      act(() => {
        result.current.decrementDeletedCountBy(0)
      })
      
      expect(result.current.deletedTaskCount).toBe(10) // 减少0应该保持不变
    })
  })

  describe('initializeTrashStore', () => {
    it('应该调用updateDeletedTaskCount进行初始化', async () => {
      const mockDeletedTasks = [
        { id: '1', deleted: 1 },
        { id: '2', deleted: 1 }
      ]
      
      indexeddb.getAllDeletedTasks.mockResolvedValue(mockDeletedTasks)
      
      const { result } = renderHook(() => useTrashStore())
      
      await act(async () => {
        await result.current.initializeTrashStore()
      })
      
      expect(result.current.deletedTaskCount).toBe(2)
      expect(indexeddb.getAllDeletedTasks).toHaveBeenCalled()
    })
  })

  describe('边界情况', () => {
    it('应该处理数据库返回空数组', async () => {
      indexeddb.getAllDeletedTasks.mockResolvedValue([])
      
      const { result } = renderHook(() => useTrashStore())
      
      await act(async () => {
        await result.current.updateDeletedTaskCount()
      })
      
      expect(result.current.deletedTaskCount).toBe(0)
    })
  })

  describe('并发操作', () => {
    it('应该正确处理连续的增减操作', () => {
      const { result } = renderHook(() => useTrashStore())
      
      act(() => {
        result.current.incrementDeletedCount()
        result.current.incrementDeletedCount()
        result.current.incrementDeletedCount()
        result.current.decrementDeletedCount()
        result.current.decrementDeletedCountBy(1)
      })
      
      expect(result.current.deletedTaskCount).toBe(1)
    })

    it('应该正确处理重置操作', () => {
      const { result } = renderHook(() => useTrashStore())
      
      act(() => {
        result.current.incrementDeletedCount()
        result.current.incrementDeletedCount()
        result.current.resetDeletedCount()
        result.current.incrementDeletedCount()
      })
      
      expect(result.current.deletedTaskCount).toBe(1)
    })
  })
})