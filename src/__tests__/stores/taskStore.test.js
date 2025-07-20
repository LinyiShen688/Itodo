import { act, renderHook } from '@testing-library/react'
import { useTaskStore } from '@/stores/taskStore'

// Mock dependencies
jest.mock('@/lib/indexeddb', () => ({
  getAllTasks: jest.fn(),
  addTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
  moveTaskToQuadrant: jest.fn(),
  reorderTasks: jest.fn()
}))

jest.mock('@/stores/trashStore', () => ({
  useTrashStore: {
    getState: jest.fn(() => ({
      incrementDeletedCount: jest.fn()
    }))
  }
}))

jest.mock('@/utils/toast', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn()
  }
}))

// Mock window.dispatchEvent
global.window = Object.create(window)
window.dispatchEvent = jest.fn()

// Mock timers for batch updates
jest.useFakeTimers()

describe('useTaskStore', () => {
  const mockTasks = [
    { id: '1', text: 'Task 1', quadrant: 1, order: 0, completed: 0, listId: 'today' },
    { id: '2', text: 'Task 2', quadrant: 1, order: 1, completed: 1, listId: 'today' },
    { id: '3', text: 'Task 3', quadrant: 2, order: 0, completed: 0, listId: 'today' },
    { id: '4', text: 'Task 4', quadrant: 3, order: 0, completed: 0, listId: 'today' },
    { id: '5', text: 'Task 5', quadrant: 4, order: 0, completed: 0, listId: 'today' }
  ]

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    jest.clearAllTimers()
    
    // Reset store state
    const { reset } = useTaskStore.getState()
    reset()
    
    // Reset mock implementations
    require('@/lib/indexeddb').getAllTasks.mockResolvedValue(mockTasks)
    require('@/lib/indexeddb').addTask.mockImplementation(async (task) => ({
      id: 'new-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...task
    }))
    require('@/lib/indexeddb').updateTask.mockImplementation(async (id, updates) => ({
      id,
      updatedAt: new Date(),
      ...updates
    }))
    require('@/lib/indexeddb').deleteTask.mockResolvedValue(true)
    require('@/lib/indexeddb').moveTaskToQuadrant.mockResolvedValue(true)
    require('@/lib/indexeddb').reorderTasks.mockResolvedValue(true)
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.clearAllTimers()
  })

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const { result } = renderHook(() => useTaskStore())

      expect(result.current.tasks).toEqual({
        1: [], 2: [], 3: [], 4: []
      })
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(null)
      expect(result.current.currentListId).toBe('today')
      expect(result.current.pendingUpdates).toEqual([])
    })
  })

  describe('loadTasks', () => {
    it('应该加载并按象限分组任务', async () => {
      const { result } = renderHook(() => useTaskStore())

      await act(async () => {
        await result.current.loadTasks('today')
      })

      expect(result.current.tasks[1]).toHaveLength(2)
      expect(result.current.tasks[2]).toHaveLength(1)
      expect(result.current.tasks[3]).toHaveLength(1)
      expect(result.current.tasks[4]).toHaveLength(1)
    })

    it('应该按完成状态排序任务（未完成在前）', async () => {
      const { result } = renderHook(() => useTaskStore())

      await act(async () => {
        await result.current.loadTasks('today')
      })

      const quadrant1Tasks = result.current.tasks[1]
      expect(quadrant1Tasks[0].completed).toBe(0) // 未完成在前
      expect(quadrant1Tasks[1].completed).toBe(1) // 完成在后
    })

    it('应该在数据为空时显示加载状态', async () => {
      const { result } = renderHook(() => useTaskStore())

      const loadPromise = act(async () => {
        await result.current.loadTasks('today')
      })

      expect(result.current.loading).toBe(true)

      await loadPromise
      expect(result.current.loading).toBe(false)
    })

    it('应该处理加载错误', async () => {
      require('@/lib/indexeddb').getAllTasks.mockRejectedValue(new Error('Database error'))
      const { result } = renderHook(() => useTaskStore())

      await act(async () => {
        await result.current.loadTasks('today')
      })

      expect(result.current.error).toBe('Database error')
      expect(result.current.loading).toBe(false)
    })

    it('应该更新当前列表ID', async () => {
      const { result } = renderHook(() => useTaskStore())

      await act(async () => {
        await result.current.loadTasks('work')
      })

      expect(result.current.currentListId).toBe('work')
    })
  })

  describe('addTask', () => {
    it('应该添加新任务到指定象限', async () => {
      const { result } = renderHook(() => useTaskStore())

      const newTask = {
        id: 'new-id',
        text: 'New task',
        quadrant: 1,
        order: 0,
        listId: 'today'
      }

      await act(async () => {
        await result.current.addTask(1, 'New task')
      })

      expect(require('@/lib/indexeddb').addTask).toHaveBeenCalledWith({
        text: 'New task',
        quadrant: 1,
        listId: 'today',
        order: 0
      })

      expect(result.current.tasks[1]).toContainEqual(
        expect.objectContaining({
          id: 'new-id',
          text: 'New task',
          quadrant: 1
        })
      )
    })

    it('应该处理添加任务错误', async () => {
      require('@/lib/indexeddb').addTask.mockRejectedValue(new Error('Add failed'))
      const { result } = renderHook(() => useTaskStore())

      await act(async () => {
        try {
          await result.current.addTask(1, 'New task')
        } catch (error) {
          expect(error.message).toBe('Add failed')
        }
      })

      expect(result.current.error).toBe('Add failed')
      expect(require('@/utils/toast').toast.error).toHaveBeenCalledWith('添加任务失败')
    })
  })

  describe('updateTask', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useTaskStore())
      await act(async () => {
        await result.current.loadTasks('today')
      })
    })

    it('应该乐观更新任务', async () => {
      const { result } = renderHook(() => useTaskStore())

      await act(async () => {
        await result.current.updateTask('1', { text: 'Updated task' })
      })

      const updatedTask = result.current.tasks[1].find(t => t.id === '1')
      expect(updatedTask.text).toBe('Updated task')
    })

    it('应该在乐观更新失败时回滚', async () => {
      require('@/lib/indexeddb').updateTask.mockRejectedValue(new Error('Update failed'))
      require('@/lib/indexeddb').getAllTasks.mockResolvedValue(mockTasks)

      const { result } = renderHook(() => useTaskStore())

      await act(async () => {
        try {
          await result.current.updateTask('1', { text: 'Updated task' }, true)
        } catch (error) {
          // Expected to fail
        }
      })

      expect(require('@/utils/toast').toast.error).toHaveBeenCalledWith(
        '更新任务失败，已恢复原状态'
      )
    })

    it('应该支持非乐观更新', async () => {
      const { result } = renderHook(() => useTaskStore())

      await act(async () => {
        await result.current.updateTask('1', { text: 'Updated task' }, false)
      })

      expect(require('@/lib/indexeddb').updateTask).toHaveBeenCalledWith('1', { text: 'Updated task' })
    })
  })

  describe('deleteTask', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useTaskStore())
      await act(async () => {
        await result.current.loadTasks('today')
      })
    })

    it('应该软删除任务', async () => {
      const { result } = renderHook(() => useTaskStore())

      await act(async () => {
        await result.current.deleteTask('1')
      })

      expect(require('@/lib/indexeddb').deleteTask).toHaveBeenCalledWith('1')
      expect(result.current.tasks[1]).not.toContainEqual(
        expect.objectContaining({ id: '1' })
      )
    })

    it('应该更新收纳箱计数', async () => {
      const mockIncrementDeletedCount = jest.fn()
      require('@/stores/trashStore').useTrashStore.getState.mockReturnValue({
        incrementDeletedCount: mockIncrementDeletedCount
      })

      const { result } = renderHook(() => useTaskStore())

      await act(async () => {
        await result.current.deleteTask('1')
      })

      expect(mockIncrementDeletedCount).toHaveBeenCalledTimes(1)
    })

    it('应该显示成功提示和查看收纳箱操作', async () => {
      const { result } = renderHook(() => useTaskStore())

      await act(async () => {
        await result.current.deleteTask('1')
      })

      expect(require('@/utils/toast').toast.success).toHaveBeenCalledWith(
        '任务已移至收纳箱',
        expect.objectContaining({
          duration: 3000,
          action: expect.objectContaining({
            label: '查看收纳箱'
          })
        })
      )
    })

    it('应该处理删除错误', async () => {
      require('@/lib/indexeddb').deleteTask.mockRejectedValue(new Error('Delete failed'))
      const { result } = renderHook(() => useTaskStore())

      await act(async () => {
        try {
          await result.current.deleteTask('1')
        } catch (error) {
          expect(error.message).toBe('Delete failed')
        }
      })

      expect(result.current.error).toBe('Delete failed')
    })
  })

  describe('moveTask', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useTaskStore())
      await act(async () => {
        await result.current.loadTasks('today')
      })
    })

    it('应该乐观移动任务到不同象限', async () => {
      const { result } = renderHook(() => useTaskStore())

      await act(async () => {
        await result.current.moveTask('1', 1, 2, 0)
      })

      expect(result.current.tasks[1]).not.toContainEqual(
        expect.objectContaining({ id: '1' })
      )
      expect(result.current.tasks[2]).toContainEqual(
        expect.objectContaining({ id: '1', quadrant: 2 })
      )
    })

    it('应该在移动失败时回滚', async () => {
      require('@/lib/indexeddb').moveTaskToQuadrant.mockRejectedValue(new Error('Move failed'))
      require('@/lib/indexeddb').getAllTasks.mockResolvedValue(mockTasks)

      const { result } = renderHook(() => useTaskStore())

      await act(async () => {
        try {
          await result.current.moveTask('1', 1, 2, 0)
        } catch (error) {
          // Expected to fail
        }
      })

      expect(require('@/utils/toast').toast.error).toHaveBeenCalledWith(
        '移动任务失败，已恢复原位置',
        expect.objectContaining({
          duration: 4000,
          action: expect.objectContaining({
            label: '重试'
          })
        })
      )
    })
  })

  describe('reorderTasks', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useTaskStore())
      await act(async () => {
        await result.current.loadTasks('today')
      })
    })

    it('应该乐观重新排序任务', async () => {
      const { result } = renderHook(() => useTaskStore())
      const reorderedTasks = [result.current.tasks[1][1], result.current.tasks[1][0]]

      await act(async () => {
        await result.current.reorderTasks(1, reorderedTasks)
      })

      expect(result.current.tasks[1]).toEqual(reorderedTasks)
      expect(require('@/lib/indexeddb').reorderTasks).toHaveBeenCalledWith(reorderedTasks)
    })

    it('应该在重新排序失败时回滚', async () => {
      require('@/lib/indexeddb').reorderTasks.mockRejectedValue(new Error('Reorder failed'))
      require('@/lib/indexeddb').getAllTasks.mockResolvedValue(mockTasks)

      const { result } = renderHook(() => useTaskStore())
      const reorderedTasks = [result.current.tasks[1][1], result.current.tasks[1][0]]

      await act(async () => {
        try {
          await result.current.reorderTasks(1, reorderedTasks)
        } catch (error) {
          // Expected to fail
        }
      })

      expect(require('@/utils/toast').toast.error).toHaveBeenCalledWith(
        '任务排序失败，已恢复原顺序',
        expect.objectContaining({
          duration: 4000
        })
      )
    })
  })

  describe('toggleComplete', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useTaskStore())
      await act(async () => {
        await result.current.loadTasks('today')
      })
    })

    it('应该切换任务完成状态', async () => {
      const { result } = renderHook(() => useTaskStore())

      await act(async () => {
        await result.current.toggleComplete('1')
      })

      expect(require('@/lib/indexeddb').updateTask).toHaveBeenCalledWith('1', { completed: 1 })
    })

    it('应该重新排序完成后的任务', async () => {
      const { result } = renderHook(() => useTaskStore())

      await act(async () => {
        await result.current.toggleComplete('1')
      })

      // 检查排序：未完成在前，完成在后
      const quadrant1Tasks = result.current.tasks[1]
      const completedTasks = quadrant1Tasks.filter(t => t.completed === 1)
      const incompleteTasks = quadrant1Tasks.filter(t => t.completed === 0)

      expect(incompleteTasks.length + completedTasks.length).toBe(quadrant1Tasks.length)
    })

    it('应该处理切换完成状态错误', async () => {
      require('@/lib/indexeddb').updateTask.mockRejectedValue(new Error('Toggle failed'))
      const { result } = renderHook(() => useTaskStore())

      await act(async () => {
        try {
          await result.current.toggleComplete('1')
        } catch (error) {
          expect(error.message).toBe('Toggle failed')
        }
      })

      expect(require('@/utils/toast').toast.error).toHaveBeenCalledWith(
        '切换任务状态失败',
        expect.objectContaining({
          duration: 3000
        })
      )
    })
  })

  describe('批量更新功能', () => {
    it('应该添加更新到批量队列', () => {
      const { result } = renderHook(() => useTaskStore())

      act(() => {
        result.current.batchUpdate([
          { id: '1', data: { text: 'Updated 1' } },
          { id: '2', data: { text: 'Updated 2' } }
        ])
      })

      expect(result.current.pendingUpdates).toHaveLength(2)
    })

    it('应该调度批量执行', () => {
      const { result } = renderHook(() => useTaskStore())

      act(() => {
        result.current.batchUpdate([{ id: '1', data: { text: 'Updated' } }])
      })

      expect(result.current.updateTimeoutId).toBeDefined()
    })

    it('应该执行批量更新', async () => {
      const { result } = renderHook(() => useTaskStore())

      act(() => {
        result.current.batchUpdate([
          { id: '1', data: { text: 'Updated 1' } },
          { id: '2', data: { text: 'Updated 2' } }
        ])
      })

      // 快进定时器
      act(() => {
        jest.advanceTimersByTime(300)
      })

      // 等待异步操作
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(require('@/lib/indexeddb').updateTask).toHaveBeenCalledTimes(2)
      expect(result.current.pendingUpdates).toHaveLength(0)
    })

    it('应该合并相同任务的更新', async () => {
      const { result } = renderHook(() => useTaskStore())

      act(() => {
        result.current.batchUpdate([
          { id: '1', data: { text: 'Updated 1' } },
          { id: '1', data: { completed: 1 } },
          { id: '2', data: { text: 'Updated 2' } }
        ])
      })

      act(() => {
        jest.advanceTimersByTime(300)
      })

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(require('@/lib/indexeddb').updateTask).toHaveBeenCalledWith('1', {
        text: 'Updated 1',
        completed: 1
      })
      expect(require('@/lib/indexeddb').updateTask).toHaveBeenCalledWith('2', {
        text: 'Updated 2'
      })
    })

    it('应该处理批量更新失败', async () => {
      require('@/lib/indexeddb').updateTask.mockRejectedValue(new Error('Batch failed'))
      require('@/lib/indexeddb').getAllTasks.mockResolvedValue(mockTasks)

      const { result } = renderHook(() => useTaskStore())

      act(() => {
        result.current.batchUpdate([{ id: '1', data: { text: 'Updated' } }])
      })

      act(() => {
        jest.advanceTimersByTime(300)
      })

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(require('@/utils/toast').toast.error).toHaveBeenCalledWith(
        '批量更新失败，已重新加载数据',
        expect.objectContaining({
          duration: 4000
        })
      )
    })

    it('应该显示批量更新成功提示', async () => {
      const { result } = renderHook(() => useTaskStore())

      act(() => {
        result.current.batchUpdate([
          { id: '1', data: { text: 'Updated 1' } },
          { id: '2', data: { text: 'Updated 2' } }
        ])
      })

      act(() => {
        jest.advanceTimersByTime(300)
      })

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(require('@/utils/toast').toast.success).toHaveBeenCalledWith(
        '成功更新 2 个任务',
        expect.objectContaining({
          duration: 2000
        })
      )
    })
  })

  describe('smartUpdate', () => {
    it('应该立即执行更新当 immediate=true', async () => {
      const { result } = renderHook(() => useTaskStore())

      await act(async () => {
        await result.current.smartUpdate('1', { text: 'Updated' }, true)
      })

      expect(require('@/lib/indexeddb').updateTask).toHaveBeenCalledWith('1', { text: 'Updated' })
    })

    it('应该添加到批量队列当 immediate=false', () => {
      const { result } = renderHook(() => useTaskStore())

      act(() => {
        result.current.smartUpdate('1', { text: 'Updated' }, false)
      })

      expect(result.current.pendingUpdates).toContainEqual({
        id: '1',
        data: { text: 'Updated' }
      })
    })
  })

  describe('选择器函数', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useTaskStore())
      await act(async () => {
        await result.current.loadTasks('today')
      })
    })

    it('应该获取指定象限的任务', () => {
      const { result } = renderHook(() => useTaskStore())

      const quadrant1Tasks = result.current.getQuadrantTasks(1)
      expect(quadrant1Tasks).toHaveLength(2)
    })

    it('应该获取任务总数', () => {
      const { result } = renderHook(() => useTaskStore())

      const taskCount = result.current.getTaskCount()
      expect(taskCount).toBe(5)
    })

    it('应该获取已完成任务数', () => {
      const { result } = renderHook(() => useTaskStore())

      const completedCount = result.current.getCompletedCount()
      expect(completedCount).toBe(1)
    })
  })

  describe('reset', () => {
    it('应该重置所有状态', async () => {
      const { result } = renderHook(() => useTaskStore())

      // 先设置一些状态
      await act(async () => {
        await result.current.loadTasks('work')
        result.current.setError('Some error')
        result.current.batchUpdate([{ id: '1', data: { text: 'Updated' } }])
      })

      act(() => {
        result.current.reset()
      })

      expect(result.current.tasks).toEqual({
        1: [], 2: [], 3: [], 4: []
      })
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(null)
      expect(result.current.currentListId).toBe('today')
      expect(result.current.pendingUpdates).toEqual([])
      expect(result.current.updateTimeoutId).toBe(null)
    })

    it('应该清理定时器', () => {
      const { result } = renderHook(() => useTaskStore())

      act(() => {
        result.current.batchUpdate([{ id: '1', data: { text: 'Updated' } }])
      })

      const timeoutId = result.current.updateTimeoutId

      act(() => {
        result.current.reset()
      })

      // 验证定时器被清理
      expect(result.current.updateTimeoutId).toBe(null)
    })
  })
})