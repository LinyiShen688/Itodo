import { renderHook, act } from '@testing-library/react'
import { useTaskStore } from '@/stores/taskStore'
import * as indexeddb from '@/lib/indexeddb'

// Mock IndexedDB operations
jest.mock('@/lib/indexeddb', () => ({
  getAllTasks: jest.fn(),
  addTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
  moveTaskToQuadrant: jest.fn(),
  reorderTasks: jest.fn(),
}))

// Mock trash store
jest.mock('@/stores/trashStore', () => ({
  useTrashStore: {
    getState: () => ({
      incrementDeletedCount: jest.fn()
    })
  }
}))

describe('taskStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useTaskStore.setState({
      tasks: { 1: [], 2: [], 3: [], 4: [] },
      loading: false,
      error: null,
      currentListId: 'today'
    })
    jest.clearAllMocks()
  })

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const { result } = renderHook(() => useTaskStore())
      
      expect(result.current.tasks).toEqual({
        1: [],
        2: [],
        3: [],
        4: []
      })
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.currentListId).toBe('today')
    })
  })

  describe('loadTasks', () => {
    it('应该成功加载任务', async () => {
      const mockTasks = [
        { id: '1', text: 'Task 1', quadrant: 1, completed: 0, order: 0 },
        { id: '2', text: 'Task 2', quadrant: 2, completed: 1, order: 1 },
        { id: '3', text: 'Task 3', quadrant: 1, completed: 0, order: 1 }
      ]
      
      indexeddb.getAllTasks.mockResolvedValue(mockTasks)
      
      const { result } = renderHook(() => useTaskStore())
      
      await act(async () => {
        await result.current.loadTasks('test-list')
      })
      
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.currentListId).toBe('test-list')
      expect(result.current.tasks[1]).toHaveLength(2) // 两个第一象限任务
      expect(result.current.tasks[2]).toHaveLength(1) // 一个第二象限任务
      
      // 验证排序：未完成任务在前
      expect(result.current.tasks[1][0].completed).toBe(0)
      expect(result.current.tasks[1][1].completed).toBe(0)
    })

    it('应该处理加载错误', async () => {
      const errorMessage = 'Database error'
      indexeddb.getAllTasks.mockRejectedValue(new Error(errorMessage))
      
      const { result } = renderHook(() => useTaskStore())
      
      await act(async () => {
        await result.current.loadTasks('test-list')
      })
      
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(errorMessage)
    })

    it('应该正确设置loading状态', async () => {
      indexeddb.getAllTasks.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 100))
      )
      
      const { result } = renderHook(() => useTaskStore())
      
      const loadPromise = act(async () => {
        await result.current.loadTasks('test-list', true) // forceLoading = true
      })
      
      // 立即检查loading状态
      expect(result.current.loading).toBe(true)
      
      await loadPromise
      
      expect(result.current.loading).toBe(false)
    })
  })

  describe('addTask', () => {
    it('应该成功添加任务', async () => {
      const newTask = {
        id: 'new-task',
        text: 'New Task',
        quadrant: 1,
        completed: 0,
        order: 0
      }
      
      indexeddb.addTask.mockResolvedValue(newTask)
      
      const { result } = renderHook(() => useTaskStore())
      
      let addedTask
      await act(async () => {
        addedTask = await result.current.addTask(1, 'New Task')
      })
      
      expect(addedTask).toEqual(newTask)
      expect(result.current.tasks[1]).toContain(newTask)
      expect(indexeddb.addTask).toHaveBeenCalledWith({
        text: 'New Task',
        quadrant: 1,
        listId: 'today',
        order: 0
      })
    })

    it('应该处理添加错误', async () => {
      const errorMessage = 'Add task failed'
      indexeddb.addTask.mockRejectedValue(new Error(errorMessage))
      
      const { result } = renderHook(() => useTaskStore())
      
      // Store the error in a variable since the store state might be reset
      let thrownError = null
      
      try {
        await act(async () => {
          await result.current.addTask(1, 'New Task')
        })
      } catch (error) {
        thrownError = error
        // Check that error state was set in the store during the operation
        expect(result.current.error).toBe(errorMessage)
      }
      
      // Verify the error was thrown
      expect(thrownError).not.toBeNull()
      expect(thrownError.message).toBe(errorMessage)
    })
  })

  describe('updateTask', () => {
    beforeEach(() => {
      // 设置初始任务
      const initialTask = {
        id: 'task-1',
        text: 'Initial Task',
        quadrant: 1,
        completed: 0,
        order: 0
      }
      
      useTaskStore.setState({
        tasks: {
          1: [initialTask],
          2: [],
          3: [],
          4: []
        },
        loading: false,
        error: null,
        currentListId: 'today'
      })
    })

    it('应该成功更新任务（乐观更新）', async () => {
      const updatedTask = {
        id: 'task-1',
        text: 'Updated Task',
        quadrant: 1,
        completed: 0,
        order: 0,
        updatedAt: new Date()
      }
      
      indexeddb.updateTask.mockResolvedValue(updatedTask)
      
      const { result } = renderHook(() => useTaskStore())
      
      await act(async () => {
        await result.current.updateTask('task-1', { text: 'Updated Task' })
      })
      
      // 验证乐观更新生效
      expect(result.current.tasks[1][0].text).toBe('Updated Task')
      expect(indexeddb.updateTask).toHaveBeenCalledWith('task-1', { text: 'Updated Task' })
    })

    it('应该在失败时回滚乐观更新', async () => {
      indexeddb.updateTask.mockRejectedValue(new Error('Update failed'))
      indexeddb.getAllTasks.mockResolvedValue([]) // 用于回滚
      
      const { result } = renderHook(() => useTaskStore())
      
      let thrownError = null
      
      try {
        await act(async () => {
          await result.current.updateTask('task-1', { text: 'Failed Update' })
        })
      } catch (error) {
        thrownError = error
      }
      
      expect(thrownError).not.toBeNull()
      expect(thrownError.message).toBe('Update failed')
      
      // 验证调用了loadTasks进行回滚
      expect(indexeddb.getAllTasks).toHaveBeenCalled()
    })
  })

  describe('deleteTask', () => {
    beforeEach(() => {
      const initialTask = {
        id: 'task-1',
        text: 'Task to delete',
        quadrant: 1,
        completed: 0,
        order: 0
      }
      
      useTaskStore.setState({
        tasks: {
          1: [initialTask],
          2: [],
          3: [],
          4: []
        },
        loading: false,
        error: null,
        currentListId: 'today'
      })
    })

    it('应该成功删除任务', async () => {
      indexeddb.deleteTask.mockResolvedValue()
      
      const { result } = renderHook(() => useTaskStore())
      
      await act(async () => {
        await result.current.deleteTask('task-1')
      })
      
      expect(result.current.tasks[1]).toHaveLength(0)
      expect(indexeddb.deleteTask).toHaveBeenCalledWith('task-1')
    })
  })

  describe('moveTask', () => {
    beforeEach(() => {
      const task = {
        id: 'task-1',
        text: 'Task to move',
        quadrant: 1,
        completed: 0,
        order: 0
      }
      
      useTaskStore.setState({
        tasks: {
          1: [task],
          2: [],
          3: [],
          4: []
        },
        loading: false,
        error: null,
        currentListId: 'today'
      })
    })

    it('应该成功移动任务到不同象限', async () => {
      indexeddb.moveTaskToQuadrant.mockResolvedValue()
      
      const { result } = renderHook(() => useTaskStore())
      
      await act(async () => {
        await result.current.moveTask('task-1', 1, 2, 0)
      })
      
      expect(result.current.tasks[1]).toHaveLength(0)
      expect(result.current.tasks[2]).toHaveLength(1)
      expect(result.current.tasks[2][0].quadrant).toBe(2)
      expect(indexeddb.moveTaskToQuadrant).toHaveBeenCalledWith('task-1', 2, 0)
    })
  })

  describe('toggleComplete', () => {
    beforeEach(() => {
      const task = {
        id: 'task-1',
        text: 'Task to toggle',
        quadrant: 1,
        completed: 0,
        order: 0
      }
      
      useTaskStore.setState({
        tasks: {
          1: [task],
          2: [],
          3: [],
          4: []
        },
        loading: false,
        error: null,
        currentListId: 'today'
      })
    })

    it('应该切换任务完成状态', async () => {
      const updatedTask = {
        id: 'task-1',
        text: 'Task to toggle',
        quadrant: 1,
        completed: 1,
        order: 0,
        updatedAt: new Date()
      }
      
      indexeddb.updateTask.mockResolvedValue(updatedTask)
      indexeddb.reorderTasks.mockResolvedValue()
      
      const { result } = renderHook(() => useTaskStore())
      
      await act(async () => {
        await result.current.toggleComplete('task-1')
      })
      
      expect(indexeddb.updateTask).toHaveBeenCalledWith('task-1', { completed: 1 })
    })
  })

  describe('选择器函数', () => {
    beforeEach(() => {
      const tasks = [
        { id: '1', quadrant: 1, completed: 0 },
        { id: '2', quadrant: 1, completed: 1 },
        { id: '3', quadrant: 2, completed: 0 }
      ]
      
      useTaskStore.setState({
        tasks: {
          1: [tasks[0], tasks[1]],
          2: [tasks[2]],
          3: [],
          4: []
        },
        loading: false,
        error: null,
        currentListId: 'today'
      })
    })

    it('getQuadrantTasks 应该返回指定象限的任务', () => {
      const { result } = renderHook(() => useTaskStore())
      
      const quadrant1Tasks = result.current.getQuadrantTasks(1)
      expect(quadrant1Tasks).toHaveLength(2)
      expect(quadrant1Tasks[0].id).toBe('1')
    })

    it('getTaskCount 应该返回总任务数', () => {
      const { result } = renderHook(() => useTaskStore())
      
      const taskCount = result.current.getTaskCount()
      expect(taskCount).toBe(3)
    })

    it('getCompletedCount 应该返回已完成任务数', () => {
      const { result } = renderHook(() => useTaskStore())
      
      const completedCount = result.current.getCompletedCount()
      expect(completedCount).toBe(1)
    })
  })

  describe('基础操作', () => {
    it('setLoading 应该更新loading状态', () => {
      const { result } = renderHook(() => useTaskStore())
      
      act(() => {
        result.current.setLoading(true)
      })
      
      expect(result.current.loading).toBe(true)
    })

    it('setError 应该更新error状态', () => {
      const { result } = renderHook(() => useTaskStore())
      
      act(() => {
        result.current.setError('Test error')
      })
      
      expect(result.current.error).toBe('Test error')
    })

    it('reset 应该重置所有状态', () => {
      const { result } = renderHook(() => useTaskStore())
      
      // 设置一些状态
      act(() => {
        result.current.setLoading(true)
        result.current.setError('Some error')
        result.current.setCurrentListId('custom-list')
      })
      
      // 重置
      act(() => {
        result.current.reset()
      })
      
      expect(result.current.tasks).toEqual({ 1: [], 2: [], 3: [], 4: [] })
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.currentListId).toBe('today')
    })
  })
})