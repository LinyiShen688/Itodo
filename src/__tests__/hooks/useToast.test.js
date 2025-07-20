import { renderHook, act } from '@testing-library/react'
import { useToast, useToastList, useToastActions } from '@/hooks/useToast'

describe('useToast', () => {
  let clearAllToasts

  beforeEach(() => {
    // 获取清空函数并重置状态
    const { result } = renderHook(() => useToastActions())
    clearAllToasts = result.current.clearAllToasts
    
    act(() => {
      clearAllToasts()
    })
  })

  describe('基础 toast 功能', () => {
    it('应该能添加成功类型的 toast', () => {
      const { result: toastResult } = renderHook(() => useToast())
      const { result: listResult } = renderHook(() => useToastList())

      act(() => {
        toastResult.current.success('操作成功')
      })

      expect(listResult.current).toHaveLength(1)
      expect(listResult.current[0]).toMatchObject({
        message: '操作成功',
        type: 'success'
      })
    })

    it('应该能添加错误类型的 toast', () => {
      const { result: toastResult } = renderHook(() => useToast())
      const { result: listResult } = renderHook(() => useToastList())

      act(() => {
        toastResult.current.error('操作失败')
      })

      expect(listResult.current).toHaveLength(1)
      expect(listResult.current[0]).toMatchObject({
        message: '操作失败',
        type: 'error',
        duration: 5000 // 错误提示显示更久
      })
    })

    it('应该能添加警告类型的 toast', () => {
      const { result: toastResult } = renderHook(() => useToast())
      const { result: listResult } = renderHook(() => useToastList())

      act(() => {
        toastResult.current.warning('警告信息')
      })

      expect(listResult.current).toHaveLength(1)
      expect(listResult.current[0]).toMatchObject({
        message: '警告信息',
        type: 'warning',
        duration: 4000
      })
    })

    it('应该能添加信息类型的 toast', () => {
      const { result: toastResult } = renderHook(() => useToast())
      const { result: listResult } = renderHook(() => useToastList())

      act(() => {
        toastResult.current.info('信息提示')
      })

      expect(listResult.current).toHaveLength(1)
      expect(listResult.current[0]).toMatchObject({
        message: '信息提示',
        type: 'info',
        duration: 3000
      })
    })

    it('应该能添加自定义 toast', () => {
      const { result: toastResult } = renderHook(() => useToast())
      const { result: listResult } = renderHook(() => useToastList())

      const customOptions = {
        message: '自定义消息',
        type: 'success',
        duration: 2000,
        showProgress: false
      }

      act(() => {
        toastResult.current.custom(customOptions)
      })

      expect(listResult.current).toHaveLength(1)
      expect(listResult.current[0]).toMatchObject(customOptions)
    })
  })

  describe('toast 管理功能', () => {
    it('应该能移除特定的 toast', () => {
      const { result: toastResult } = renderHook(() => useToast())
      const { result: listResult } = renderHook(() => useToastList())

      let toastId
      act(() => {
        toastId = toastResult.current.success('测试消息')
      })

      expect(listResult.current).toHaveLength(1)

      act(() => {
        toastResult.current.dismiss(toastId)
      })

      expect(listResult.current).toHaveLength(0)
    })

    it('应该能清空所有 toast', () => {
      const { result: toastResult } = renderHook(() => useToast())
      const { result: listResult } = renderHook(() => useToastList())

      act(() => {
        toastResult.current.success('消息1')
        toastResult.current.error('消息2')
        toastResult.current.warning('消息3')
      })

      expect(listResult.current).toHaveLength(3)

      act(() => {
        toastResult.current.clear()
      })

      expect(listResult.current).toHaveLength(0)
    })

    it('应该为每个 toast 生成唯一 ID', () => {
      const { result: toastResult } = renderHook(() => useToast())
      const { result: listResult } = renderHook(() => useToastList())

      let id1, id2, id3
      act(() => {
        id1 = toastResult.current.success('消息1')
        id2 = toastResult.current.success('消息2')
        id3 = toastResult.current.success('消息3')
      })

      expect(id1).not.toBe(id2)
      expect(id2).not.toBe(id3)
      expect(id1).not.toBe(id3)

      const ids = listResult.current.map(toast => toast.id)
      expect(new Set(ids).size).toBe(3) // 所有 ID 都应该是唯一的
    })
  })

  describe('toast 选项配置', () => {
    it('应该支持自定义持续时间', () => {
      const { result: toastResult } = renderHook(() => useToast())
      const { result: listResult } = renderHook(() => useToastList())

      act(() => {
        toastResult.current.success('消息', { duration: 1000 })
      })

      expect(listResult.current[0].duration).toBe(1000)
    })

    it('应该支持自定义 showProgress', () => {
      const { result: toastResult } = renderHook(() => useToast())
      const { result: listResult } = renderHook(() => useToastList())

      act(() => {
        toastResult.current.success('消息', { showProgress: false })
      })

      expect(listResult.current[0].showProgress).toBe(false)
    })

    it('应该支持操作按钮', () => {
      const { result: toastResult } = renderHook(() => useToast())
      const { result: listResult } = renderHook(() => useToastList())

      const action = {
        label: '重试',
        onClick: jest.fn()
      }

      act(() => {
        toastResult.current.success('消息', { action })
      })

      expect(listResult.current[0].action).toEqual(action)
    })
  })

  describe('默认值处理', () => {
    it('应该为 toast 设置正确的默认值', () => {
      const { result: toastResult } = renderHook(() => useToast())
      const { result: listResult } = renderHook(() => useToastList())

      act(() => {
        toastResult.current.info('测试消息')
      })

      const toast = listResult.current[0]
      expect(toast).toMatchObject({
        type: 'info',
        duration: 3000,
        showProgress: true
      })
      expect(toast.id).toBeDefined()
    })

    it('应该正确覆盖默认值', () => {
      const { result: toastResult } = renderHook(() => useToast())
      const { result: listResult } = renderHook(() => useToastList())

      act(() => {
        toastResult.current.info('测试消息', {
          duration: 2000,
          showProgress: false
        })
      })

      const toast = listResult.current[0]
      expect(toast).toMatchObject({
        type: 'info',
        duration: 2000,
        showProgress: false
      })
    })
  })

  describe('多个 toast 处理', () => {
    it('应该能同时显示多个 toast', () => {
      const { result: toastResult } = renderHook(() => useToast())
      const { result: listResult } = renderHook(() => useToastList())

      act(() => {
        toastResult.current.success('成功消息')
        toastResult.current.error('错误消息')
        toastResult.current.warning('警告消息')
        toastResult.current.info('信息消息')
      })

      expect(listResult.current).toHaveLength(4)

      const types = listResult.current.map(toast => toast.type)
      expect(types).toEqual(['success', 'error', 'warning', 'info'])
    })

    it('应该按添加顺序维护 toast 列表', () => {
      const { result: toastResult } = renderHook(() => useToast())
      const { result: listResult } = renderHook(() => useToastList())

      act(() => {
        toastResult.current.success('第一个')
        toastResult.current.error('第二个')
        toastResult.current.warning('第三个')
      })

      const messages = listResult.current.map(toast => toast.message)
      expect(messages).toEqual(['第一个', '第二个', '第三个'])
    })
  })
})

describe('useToastActions', () => {
  it('应该提供 removeToast 和 clearAllToasts 方法', () => {
    const { result } = renderHook(() => useToastActions())

    expect(typeof result.current.removeToast).toBe('function')
    expect(typeof result.current.clearAllToasts).toBe('function')
  })

  it('removeToast 应该能正确移除指定的 toast', () => {
    const { result: actionsResult } = renderHook(() => useToastActions())
    const { result: toastResult } = renderHook(() => useToast())
    const { result: listResult } = renderHook(() => useToastList())

    let toastId
    act(() => {
      toastId = toastResult.current.success('测试消息')
    })

    expect(listResult.current).toHaveLength(1)

    act(() => {
      actionsResult.current.removeToast(toastId)
    })

    expect(listResult.current).toHaveLength(0)
  })

  it('clearAllToasts 应该能清空所有 toast', () => {
    const { result: actionsResult } = renderHook(() => useToastActions())
    const { result: toastResult } = renderHook(() => useToast())
    const { result: listResult } = renderHook(() => useToastList())

    act(() => {
      toastResult.current.success('消息1')
      toastResult.current.error('消息2')
    })

    expect(listResult.current).toHaveLength(2)

    act(() => {
      actionsResult.current.clearAllToasts()
    })

    expect(listResult.current).toHaveLength(0)
  })
})