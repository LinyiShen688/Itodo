import { render, screen, fireEvent } from '@testing-library/react'
import LoadingState, { LoadingWrapper } from '@/components/LoadingState'

// Mock LoadingSpinner components
jest.mock('@/components/LoadingSpinner', () => ({
  LoadingSpinner: ({ size, className }) => (
    <div data-testid="loading-spinner" className={className} data-size={size}>
      Spinner
    </div>
  ),
  LoadingDots: ({ className }) => (
    <div data-testid="loading-dots" className={className}>
      Dots
    </div>
  ),
  QuadrantSkeleton: () => (
    <div data-testid="quadrant-skeleton">
      Quadrant Skeleton
    </div>
  ),
  TaskSkeleton: ({ count }) => (
    <div data-testid="task-skeleton" data-count={count}>
      Task Skeleton
    </div>
  )
}))

describe('LoadingState', () => {
  describe('基础渲染功能', () => {
    it('应该渲染默认的 spinner 类型', () => {
      render(<LoadingState />)
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      expect(screen.getByText('加载中...')).toBeInTheDocument()
    })

    it('应该渲染自定义消息', () => {
      render(<LoadingState message="正在处理..." />)
      
      expect(screen.getByText('正在处理...')).toBeInTheDocument()
    })

    it('应该支持隐藏消息', () => {
      render(<LoadingState message="" />)
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      expect(screen.queryByText('加载中...')).not.toBeInTheDocument()
    })

    it('应该应用自定义 className', () => {
      render(<LoadingState className="custom-class" />)
      
      const container = screen.getByTestId('loading-spinner').parentElement.parentElement
      expect(container).toHaveClass('custom-class')
    })

    it('应该渲染子元素', () => {
      render(
        <LoadingState>
          <div data-testid="child-element">Child content</div>
        </LoadingState>
      )
      
      expect(screen.getByTestId('child-element')).toBeInTheDocument()
    })
  })

  describe('不同的加载类型', () => {
    it('应该渲染 dots 类型', () => {
      render(<LoadingState type="dots" message="Loading with dots" />)
      
      expect(screen.getByTestId('loading-dots')).toBeInTheDocument()
      expect(screen.getByText('Loading with dots')).toBeInTheDocument()
    })

    it('应该渲染 skeleton-task 类型', () => {
      render(<LoadingState type="skeleton-task" />)
      
      expect(screen.getByTestId('task-skeleton')).toBeInTheDocument()
      expect(screen.getByTestId('task-skeleton')).toHaveAttribute('data-count', '3')
    })

    it('应该渲染 skeleton-quadrant 类型', () => {
      render(<LoadingState type="skeleton-quadrant" />)
      
      expect(screen.getByTestId('quadrant-skeleton')).toBeInTheDocument()
    })

    it('应该渲染 minimal 类型', () => {
      render(<LoadingState type="minimal" message="简洁模式" />)
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      expect(screen.getByTestId('loading-spinner')).toHaveAttribute('data-size', 'sm')
      expect(screen.getByText('简洁模式')).toBeInTheDocument()
    })

    it('应该对未知类型回退到默认 spinner', () => {
      render(<LoadingState type="unknown-type" />)
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      expect(screen.getByTestId('loading-spinner')).toHaveAttribute('data-size', 'md')
    })
  })

  describe('尺寸配置', () => {
    it('应该传递正确的尺寸给 spinner', () => {
      render(<LoadingState size="lg" />)
      
      expect(screen.getByTestId('loading-spinner')).toHaveAttribute('data-size', 'lg')
    })

    it('应该在 minimal 模式下使用小尺寸', () => {
      render(<LoadingState type="minimal" size="xl" />)
      
      // minimal 模式强制使用 sm 尺寸
      expect(screen.getByTestId('loading-spinner')).toHaveAttribute('data-size', 'sm')
    })
  })

  describe('覆盖层模式', () => {
    it('应该渲染覆盖层', () => {
      render(<LoadingState overlay message="覆盖层加载" />)
      
      const overlay = screen.getByTestId('loading-spinner').parentElement.parentElement
      expect(overlay).toHaveClass('fixed', 'inset-0', 'z-50')
      expect(screen.getByText('覆盖层加载')).toBeInTheDocument()
    })

    it('应该在覆盖层模式下渲染子元素', () => {
      render(
        <LoadingState overlay>
          <div data-testid="overlay-child">Overlay child</div>
        </LoadingState>
      )
      
      expect(screen.getByTestId('overlay-child')).toBeInTheDocument()
    })

    it('应该应用覆盖层特定的样式类', () => {
      render(<LoadingState overlay className="custom-overlay" />)
      
      const overlay = screen.getByTestId('loading-spinner').parentElement.parentElement
      expect(overlay).toHaveClass('bg-white', 'bg-opacity-80', 'backdrop-blur-sm', 'custom-overlay')
    })
  })
})

describe('LoadingWrapper', () => {
  const mockChildren = <div data-testid="wrapper-children">Content</div>

  describe('加载状态处理', () => {
    it('应该在加载时显示 LoadingState', () => {
      render(
        <LoadingWrapper loading>
          {mockChildren}
        </LoadingWrapper>
      )
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      expect(screen.getByText('加载中...')).toBeInTheDocument()
      expect(screen.queryByTestId('wrapper-children')).not.toBeInTheDocument()
    })

    it('应该使用自定义加载配置', () => {
      render(
        <LoadingWrapper 
          loading 
          loadingType="dots" 
          loadingMessage="自定义加载消息"
        >
          {mockChildren}
        </LoadingWrapper>
      )
      
      expect(screen.getByTestId('loading-dots')).toBeInTheDocument()
      expect(screen.getByText('自定义加载消息')).toBeInTheDocument()
    })
  })

  describe('错误状态处理', () => {
    it('应该在错误时显示错误消息', () => {
      render(
        <LoadingWrapper error="Network error">
          {mockChildren}
        </LoadingWrapper>
      )
      
      expect(screen.getByText('❌ 加载失败')).toBeInTheDocument()
      expect(screen.queryByTestId('wrapper-children')).not.toBeInTheDocument()
    })

    it('应该使用自定义错误消息', () => {
      render(
        <LoadingWrapper 
          error="Network error" 
          errorMessage="网络连接失败"
        >
          {mockChildren}
        </LoadingWrapper>
      )
      
      expect(screen.getByText('❌ 网络连接失败')).toBeInTheDocument()
    })

    it('应该显示重试按钮并处理点击', () => {
      const mockRetry = jest.fn()
      
      render(
        <LoadingWrapper 
          error="Network error" 
          onRetry={mockRetry}
        >
          {mockChildren}
        </LoadingWrapper>
      )
      
      const retryButton = screen.getByText('重试')
      expect(retryButton).toBeInTheDocument()
      
      fireEvent.click(retryButton)
      expect(mockRetry).toHaveBeenCalledTimes(1)
    })

    it('应该在没有 onRetry 时不显示重试按钮', () => {
      render(
        <LoadingWrapper error="Network error">
          {mockChildren}
        </LoadingWrapper>
      )
      
      expect(screen.queryByText('重试')).not.toBeInTheDocument()
    })
  })

  describe('空状态处理', () => {
    it('应该在空数据时显示空状态消息', () => {
      render(
        <LoadingWrapper empty>
          {mockChildren}
        </LoadingWrapper>
      )
      
      expect(screen.getByText('📝 暂无数据')).toBeInTheDocument()
      expect(screen.queryByTestId('wrapper-children')).not.toBeInTheDocument()
    })

    it('应该使用自定义空状态消息', () => {
      render(
        <LoadingWrapper 
          empty 
          emptyMessage="还没有任务，快来添加吧！"
        >
          {mockChildren}
        </LoadingWrapper>
      )
      
      expect(screen.getByText('📝 还没有任务，快来添加吧！')).toBeInTheDocument()
    })
  })

  describe('正常状态处理', () => {
    it('应该在没有加载、错误或空状态时显示子元素', () => {
      render(
        <LoadingWrapper>
          {mockChildren}
        </LoadingWrapper>
      )
      
      expect(screen.getByTestId('wrapper-children')).toBeInTheDocument()
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
    })

    it('应该在 loading=false 时显示子元素', () => {
      render(
        <LoadingWrapper loading={false}>
          {mockChildren}
        </LoadingWrapper>
      )
      
      expect(screen.getByTestId('wrapper-children')).toBeInTheDocument()
    })

    it('应该在 error=null 时显示子元素', () => {
      render(
        <LoadingWrapper error={null}>
          {mockChildren}
        </LoadingWrapper>
      )
      
      expect(screen.getByTestId('wrapper-children')).toBeInTheDocument()
    })

    it('应该在 empty=false 时显示子元素', () => {
      render(
        <LoadingWrapper empty={false}>
          {mockChildren}
        </LoadingWrapper>
      )
      
      expect(screen.getByTestId('wrapper-children')).toBeInTheDocument()
    })
  })

  describe('状态优先级', () => {
    it('应该优先显示加载状态', () => {
      render(
        <LoadingWrapper 
          loading 
          error="Some error" 
          empty
        >
          {mockChildren}
        </LoadingWrapper>
      )
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      expect(screen.queryByText('❌')).not.toBeInTheDocument()
      expect(screen.queryByText('📝')).not.toBeInTheDocument()
    })

    it('应该在无加载时优先显示错误状态', () => {
      render(
        <LoadingWrapper 
          loading={false}
          error="Some error" 
          empty
        >
          {mockChildren}
        </LoadingWrapper>
      )
      
      expect(screen.getByText('❌ 加载失败')).toBeInTheDocument()
      expect(screen.queryByText('📝')).not.toBeInTheDocument()
      expect(screen.queryByTestId('wrapper-children')).not.toBeInTheDocument()
    })

    it('应该在无加载和错误时显示空状态', () => {
      render(
        <LoadingWrapper 
          loading={false}
          error={null}
          empty
        >
          {mockChildren}
        </LoadingWrapper>
      )
      
      expect(screen.getByText('📝 暂无数据')).toBeInTheDocument()
      expect(screen.queryByTestId('wrapper-children')).not.toBeInTheDocument()
    })
  })

  describe('边界情况', () => {
    it('应该处理 falsy 的错误值', () => {
      render(
        <LoadingWrapper error="">
          {mockChildren}
        </LoadingWrapper>
      )
      
      expect(screen.getByTestId('wrapper-children')).toBeInTheDocument()
    })

    it('应该处理复杂的子元素', () => {
      render(
        <LoadingWrapper>
          <div>
            <h1>Title</h1>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </div>
        </LoadingWrapper>
      )
      
      expect(screen.getByText('Title')).toBeInTheDocument()
      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
    })

    it('应该处理多个子元素', () => {
      render(
        <LoadingWrapper>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </LoadingWrapper>
      )
      
      expect(screen.getByTestId('child-1')).toBeInTheDocument()
      expect(screen.getByTestId('child-2')).toBeInTheDocument()
    })
  })
})