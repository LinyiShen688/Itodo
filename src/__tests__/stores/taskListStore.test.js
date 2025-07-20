import { renderHook, act } from '@testing-library/react'
import { useTaskListStore } from '@/stores/taskListStore'
import * as indexeddb from '@/lib/indexeddb'

// Mock IndexedDB operations
jest.mock('@/lib/indexeddb', () => ({
  getAllTaskLists: jest.fn(),
  getActiveTaskList: jest.fn(),
  addTaskList: jest.fn(),
  updateTaskList: jest.fn(),
  setActiveTaskList: jest.fn(),
  deleteTaskList: jest.fn(),
}))

// Mock task store
jest.mock('@/stores/taskStore', () => ({
  useTaskStore: {
    getState: () => ({
      loadTasks: jest.fn()
    })
  }
}))

describe('taskListStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useTaskListStore.setState({
      taskLists: [],
      activeList: null,
      loading: false,
      error: null
    })
    jest.clearAllMocks()
  })

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const { result } = renderHook(() => useTaskListStore())
      
      expect(result.current.taskLists).toEqual([])
      expect(result.current.activeList).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('loadTaskLists', () => {
    it('应该成功加载任务列表', async () => {
      const mockLists = [
        { id: 'list1', name: 'List 1', isActive: 0 },
        { id: 'list2', name: 'List 2', isActive: 0 }
      ]
      const mockActiveList = { id: 'list1', name: 'List 1', isActive: 1 }
      
      indexeddb.getAllTaskLists.mockResolvedValue(mockLists)
      indexeddb.getActiveTaskList.mockResolvedValue(mockActiveList)
      
      const { result } = renderHook(() => useTaskListStore())
      
      await act(async () => {
        await result.current.loadTaskLists()
      })
      
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.taskLists).toEqual(mockLists)
      expect(result.current.activeList).toEqual(mockActiveList)
    })

    it('应该处理加载错误', async () => {
      const errorMessage = 'Failed to load lists'
      indexeddb.getAllTaskLists.mockRejectedValue(new Error(errorMessage))
      
      const { result } = renderHook(() => useTaskListStore())
      
      await act(async () => {
        await result.current.loadTaskLists()
      })
      
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(errorMessage)
    })

    it('应该正确设置loading状态', async () => {
      indexeddb.getAllTaskLists.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 100))
      )
      indexeddb.getActiveTaskList.mockResolvedValue(null)
      
      const { result } = renderHook(() => useTaskListStore())
      
      const loadPromise = act(async () => {
        await result.current.loadTaskLists()
      })
      
      // 立即检查loading状态
      expect(result.current.loading).toBe(true)
      
      await loadPromise
      
      expect(result.current.loading).toBe(false)
    })
  })

  describe('addTaskList', () => {
    it('应该成功添加任务列表', async () => {
      const newList = {
        id: 'new-list',
        name: 'New List',
        isActive: 0,
        layoutMode: 'FOUR',
        showETA: true
      }
      
      indexeddb.addTaskList.mockResolvedValue(newList)
      
      const { result } = renderHook(() => useTaskListStore())
      
      let addedList
      await act(async () => {
        addedList = await result.current.addTaskList('New List')
      })
      
      expect(addedList).toEqual(newList)
      expect(result.current.taskLists).toContain(newList)
      expect(indexeddb.addTaskList).toHaveBeenCalledWith('New List', 'FOUR', true)
    })

    it('应该支持自定义布局模式和ETA显示', async () => {
      const newList = {
        id: 'new-list',
        name: 'Custom List',
        layoutMode: 'SINGLE',
        showETA: false
      }
      
      indexeddb.addTaskList.mockResolvedValue(newList)
      
      const { result } = renderHook(() => useTaskListStore())
      
      await act(async () => {
        await result.current.addTaskList('Custom List', 'SINGLE', false)
      })
      
      expect(indexeddb.addTaskList).toHaveBeenCalledWith('Custom List', 'SINGLE', false)
    })

    it('应该处理添加错误', async () => {
      const errorMessage = 'Add list failed'
      indexeddb.addTaskList.mockRejectedValue(new Error(errorMessage))
      
      const { result } = renderHook(() => useTaskListStore())
      
      // Store the error in a variable since the store state might be reset
      let thrownError = null
      
      try {
        await act(async () => {
          await result.current.addTaskList('New List')
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

  describe('updateTaskList', () => {
    beforeEach(() => {
      const lists = [
        { id: 'list1', name: 'List 1', isActive: 1 },
        { id: 'list2', name: 'List 2', isActive: 0 }
      ]
      
      useTaskListStore.setState({
        taskLists: lists,
        activeList: lists[0],
        loading: false,
        error: null
      })
    })

    it('应该成功更新任务列表', async () => {
      const updatedList = { id: 'list1', name: 'Updated List 1', isActive: 1 }
      
      indexeddb.updateTaskList.mockResolvedValue(updatedList)
      
      const { result } = renderHook(() => useTaskListStore())
      
      await act(async () => {
        await result.current.updateTaskList('list1', { name: 'Updated List 1' })
      })
      
      expect(result.current.taskLists[0]).toEqual(updatedList)
      expect(result.current.activeList).toEqual(updatedList)
      expect(indexeddb.updateTaskList).toHaveBeenCalledWith('list1', { name: 'Updated List 1' })
    })

    it('应该处理更新错误', async () => {
      const errorMessage = 'Update failed'
      indexeddb.updateTaskList.mockRejectedValue(new Error(errorMessage))
      
      const { result } = renderHook(() => useTaskListStore())
      
      let thrownError = null
      
      try {
        await act(async () => {
          await result.current.updateTaskList('list1', { name: 'Failed Update' })
        })
      } catch (error) {
        thrownError = error
        expect(result.current.error).toBe(errorMessage)
      }
      
      expect(thrownError).not.toBeNull()
      expect(thrownError.message).toBe(errorMessage)
    })
  })

  describe('setActiveList', () => {
    beforeEach(() => {
      const lists = [
        { id: 'list1', name: 'List 1', isActive: 0 },
        { id: 'list2', name: 'List 2', isActive: 1 }
      ]
      
      useTaskListStore.setState({
        taskLists: lists,
        activeList: lists[1],
        loading: false,
        error: null
      })
    })

    it('应该成功设置活动列表', async () => {
      const newActiveList = { id: 'list1', name: 'List 1', isActive: 1 }
      
      indexeddb.setActiveTaskList.mockResolvedValue(newActiveList)
      
      const { result } = renderHook(() => useTaskListStore())
      
      await act(async () => {
        await result.current.setActiveList('list1')
      })
      
      expect(result.current.activeList).toEqual(newActiveList)
      expect(result.current.taskLists[0].isActive).toBe(1)
      expect(result.current.taskLists[1].isActive).toBe(0)
      expect(indexeddb.setActiveTaskList).toHaveBeenCalledWith('list1')
    })

    it('应该处理设置错误', async () => {
      const errorMessage = 'Set active failed'
      indexeddb.setActiveTaskList.mockRejectedValue(new Error(errorMessage))
      
      const { result } = renderHook(() => useTaskListStore())
      
      let thrownError = null
      
      try {
        await act(async () => {
          await result.current.setActiveList('list1')
        })
      } catch (error) {
        thrownError = error
        expect(result.current.error).toBe(errorMessage)
      }
      
      expect(thrownError).not.toBeNull()
      expect(thrownError.message).toBe(errorMessage)
    })
  })

  describe('deleteTaskList', () => {
    beforeEach(() => {
      const lists = [
        { id: 'list1', name: 'List 1', isActive: 1 },
        { id: 'list2', name: 'List 2', isActive: 0 },
        { id: 'list3', name: 'List 3', isActive: 0 }
      ]
      
      useTaskListStore.setState({
        taskLists: lists,
        activeList: lists[0],
        loading: false,
        error: null
      })
    })

    it('应该成功删除非活动任务列表', async () => {
      indexeddb.deleteTaskList.mockResolvedValue()
      
      const { result } = renderHook(() => useTaskListStore())
      
      await act(async () => {
        await result.current.deleteTaskList('list2')
      })
      
      expect(result.current.taskLists).toHaveLength(2)
      expect(result.current.taskLists.find(list => list.id === 'list2')).toBeUndefined()
      expect(result.current.activeList.id).toBe('list1') // 活动列表不变
    })

    it('应该删除活动列表并设置新的活动列表', async () => {
      const newActiveList = { id: 'list2', name: 'List 2', isActive: 1 }
      
      indexeddb.deleteTaskList.mockResolvedValue()
      indexeddb.setActiveTaskList.mockResolvedValue(newActiveList)
      
      const { result } = renderHook(() => useTaskListStore())
      
      await act(async () => {
        await result.current.deleteTaskList('list1')
      })
      
      expect(result.current.taskLists).toHaveLength(2)
      expect(result.current.taskLists.find(list => list.id === 'list1')).toBeUndefined()
      expect(result.current.activeList).toEqual(newActiveList)
      expect(indexeddb.setActiveTaskList).toHaveBeenCalledWith('list2')
    })

    it('应该阻止删除最后一个任务列表', async () => {
      // 设置只有一个列表
      useTaskListStore.setState({
        taskLists: [{ id: 'list1', name: 'List 1', isActive: 1 }],
        activeList: { id: 'list1', name: 'List 1', isActive: 1 },
        loading: false,
        error: null
      })
      
      const { result } = renderHook(() => useTaskListStore())
      
      let thrownError = null
      
      try {
        await act(async () => {
          await result.current.deleteTaskList('list1')
        })
      } catch (error) {
        thrownError = error
      }
      
      expect(thrownError).not.toBeNull()
      expect(thrownError.message).toBe('至少需要保留一个任务列表')
      expect(indexeddb.deleteTaskList).not.toHaveBeenCalled()
    })

    it('应该处理删除错误', async () => {
      const errorMessage = 'Delete failed'
      indexeddb.deleteTaskList.mockRejectedValue(new Error(errorMessage))
      
      const { result } = renderHook(() => useTaskListStore())
      
      let thrownError = null
      
      try {
        await act(async () => {
          await result.current.deleteTaskList('list2')
        })
      } catch (error) {
        thrownError = error
        expect(result.current.error).toBe(errorMessage)
      }
      
      expect(thrownError).not.toBeNull()
      expect(thrownError.message).toBe(errorMessage)
    })
  })

  describe('选择器函数', () => {
    beforeEach(() => {
      const lists = [
        { id: 'list1', name: 'List 1', isActive: 1 },
        { id: 'list2', name: 'List 2', isActive: 0 }
      ]
      
      useTaskListStore.setState({
        taskLists: lists,
        activeList: lists[0],
        loading: false,
        error: null
      })
    })

    it('getTaskListById 应该返回指定ID的任务列表', () => {
      const { result } = renderHook(() => useTaskListStore())
      
      const list = result.current.getTaskListById('list1')
      expect(list).toEqual({ id: 'list1', name: 'List 1', isActive: 1 })
      
      const nonExistentList = result.current.getTaskListById('nonexistent')
      expect(nonExistentList).toBeUndefined()
    })

    it('getActiveTaskList 应该返回当前活动的任务列表', () => {
      const { result } = renderHook(() => useTaskListStore())
      
      const activeList = result.current.getActiveTaskList()
      expect(activeList).toEqual({ id: 'list1', name: 'List 1', isActive: 1 })
    })
  })

  describe('基础操作', () => {
    it('setLoading 应该更新loading状态', () => {
      const { result } = renderHook(() => useTaskListStore())
      
      act(() => {
        result.current.setLoading(true)
      })
      
      expect(result.current.loading).toBe(true)
    })

    it('setError 应该更新error状态', () => {
      const { result } = renderHook(() => useTaskListStore())
      
      act(() => {
        result.current.setError('Test error')
      })
      
      expect(result.current.error).toBe('Test error')
    })

    it('reset 应该重置所有状态', () => {
      const { result } = renderHook(() => useTaskListStore())
      
      // 设置一些状态
      act(() => {
        result.current.setLoading(true)
        result.current.setError('Some error')
      })
      
      // 直接通过setState设置状态
      useTaskListStore.setState({
        taskLists: [{ id: 'test' }],
        activeList: { id: 'test' },
        loading: true,
        error: 'Some error'
      })
      
      // 重置
      act(() => {
        result.current.reset()
      })
      
      expect(result.current.taskLists).toEqual([])
      expect(result.current.activeList).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('initialize 应该调用loadTaskLists', async () => {
      indexeddb.getAllTaskLists.mockResolvedValue([])
      indexeddb.getActiveTaskList.mockResolvedValue(null)
      
      const { result } = renderHook(() => useTaskListStore())
      
      await act(async () => {
        await result.current.initialize()
      })
      
      expect(indexeddb.getAllTaskLists).toHaveBeenCalled()
      expect(indexeddb.getActiveTaskList).toHaveBeenCalled()
    })
  })
})