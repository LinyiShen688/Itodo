import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SyncProgressModal from '@/components/SyncProgressModal';
import { useUnifiedStorage } from '@/lib/unified-storage';

// Mock the unified storage hook
jest.mock('@/lib/unified-storage');

// Mock the lucide-react icons
jest.mock('lucide-react', () => ({
  X: ({ size }) => <div data-testid="x-icon" data-size={size} />,
  RefreshCw: ({ size }) => <div data-testid="refresh-icon" data-size={size} />,
  Trash2: ({ size }) => <div data-testid="trash-icon" data-size={size} />,
  Clock: ({ size }) => <div data-testid="clock-icon" data-size={size} />,
  AlertCircle: ({ size }) => <div data-testid="alert-icon" data-size={size} />,
  CheckCircle: ({ size }) => <div data-testid="check-icon" data-size={size} />,
  Loader2: ({ size }) => <div data-testid="loader-icon" data-size={size} />,
}));

describe('SyncProgressModal', () => {
  const mockGetSyncStatus = jest.fn();
  const mockRetryFailedItem = jest.fn();
  const mockDeleteQueueItem = jest.fn();
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup default mock implementation
    useUnifiedStorage.mockReturnValue({
      getSyncStatus: mockGetSyncStatus,
      retryFailedItem: mockRetryFailedItem,
      deleteQueueItem: mockDeleteQueueItem,
    });
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(<SyncProgressModal isOpen={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render loading state when first opened', async () => {
    mockGetSyncStatus.mockResolvedValue({
      pending: [],
      processing: [],
      failed: [],
      completed: []
    });

    render(<SyncProgressModal isOpen={true} onClose={() => {}} />);
    
    // Should show loading spinner initially
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
    });
  });

  it('should display empty state when no sync records exist', async () => {
    mockGetSyncStatus.mockResolvedValue({
      pending: [],
      processing: [],
      failed: [],
      completed: []
    });

    render(<SyncProgressModal isOpen={true} onClose={() => {}} />);
    
    await waitFor(() => {
      expect(screen.getByText('暂无同步记录')).toBeInTheDocument();
    });
  });

  it('should display processing items correctly', async () => {
    mockGetSyncStatus.mockResolvedValue({
      pending: [],
      processing: [{
        id: '1',
        action: 'add',
        entityType: 'task',
        createdAt: new Date().toISOString()
      }],
      failed: [],
      completed: []
    });

    render(<SyncProgressModal isOpen={true} onClose={() => {}} />);
    
    await waitFor(() => {
      expect(screen.getByText('正在同步 (1)')).toBeInTheDocument();
      expect(screen.getByText('新增 任务')).toBeInTheDocument();
      expect(screen.getByText('处理中...')).toBeInTheDocument();
    });
  });

  it('should display pending items correctly', async () => {
    mockGetSyncStatus.mockResolvedValue({
      pending: [{
        id: '1',
        action: 'update',
        entityType: 'taskList',
        createdAt: new Date().toISOString()
      }],
      processing: [],
      failed: [],
      completed: []
    });

    render(<SyncProgressModal isOpen={true} onClose={() => {}} />);
    
    await waitFor(() => {
      expect(screen.getByText('等待同步 (1)')).toBeInTheDocument();
      expect(screen.getByText('更新 任务列表')).toBeInTheDocument();
    });
  });

  it('should display failed items with retry and delete buttons', async () => {
    mockGetSyncStatus.mockResolvedValue({
      pending: [],
      processing: [],
      failed: [{
        id: '1',
        action: 'add',
        entityType: 'task',
        createdAt: new Date().toISOString(),
        error: '网络错误',
        retryCount: 2
      }],
      completed: []
    });

    render(<SyncProgressModal isOpen={true} onClose={() => {}} />);
    
    await waitFor(() => {
      expect(screen.getByText('同步失败 (1)')).toBeInTheDocument();
      expect(screen.getByText('错误: 网络错误')).toBeInTheDocument();
      expect(screen.getByText('重试次数: 2 |', { exact: false })).toBeInTheDocument();
      expect(screen.getByText('重试')).toBeInTheDocument();
      expect(screen.getByText('删除')).toBeInTheDocument();
    });
  });

  it('should handle retry action for failed items', async () => {
    mockGetSyncStatus.mockResolvedValue({
      pending: [],
      processing: [],
      failed: [{
        id: '1',
        action: 'add',
        entityType: 'task',
        createdAt: new Date().toISOString(),
        error: '网络错误',
        retryCount: 1
      }],
      completed: []
    });

    render(<SyncProgressModal isOpen={true} onClose={() => {}} />);
    
    await waitFor(() => {
      const retryButton = screen.getByText('重试');
      fireEvent.click(retryButton);
    });

    expect(mockRetryFailedItem).toHaveBeenCalledWith('1');
    expect(mockGetSyncStatus).toHaveBeenCalledTimes(2); // Initial load + after retry
  });

  it('should handle delete action for queue items', async () => {
    mockGetSyncStatus.mockResolvedValue({
      pending: [],
      processing: [],
      failed: [{
        id: '1',
        action: 'add',
        entityType: 'task',
        createdAt: new Date().toISOString(),
        error: '错误',
        retryCount: 1
      }],
      completed: []
    });

    render(<SyncProgressModal isOpen={true} onClose={() => {}} />);
    
    await waitFor(() => {
      const deleteButton = screen.getByText('删除');
      fireEvent.click(deleteButton);
    });

    expect(mockDeleteQueueItem).toHaveBeenCalledWith('1');
    expect(mockGetSyncStatus).toHaveBeenCalledTimes(2); // Initial load + after delete
  });

  it('should handle retry all failed items', async () => {
    mockGetSyncStatus.mockResolvedValue({
      pending: [],
      processing: [],
      failed: [
        { id: '1', action: 'add', entityType: 'task', createdAt: new Date().toISOString(), error: '错误1', retryCount: 1 },
        { id: '2', action: 'update', entityType: 'task', createdAt: new Date().toISOString(), error: '错误2', retryCount: 2 }
      ],
      completed: []
    });

    render(<SyncProgressModal isOpen={true} onClose={() => {}} />);
    
    await waitFor(() => {
      const retryAllButton = screen.getByText('重试全部');
      fireEvent.click(retryAllButton);
    });

    expect(mockRetryFailedItem).toHaveBeenCalledTimes(2);
    expect(mockRetryFailedItem).toHaveBeenCalledWith('1');
    expect(mockRetryFailedItem).toHaveBeenCalledWith('2');
  });

  it('should display completed items correctly', async () => {
    mockGetSyncStatus.mockResolvedValue({
      pending: [],
      processing: [],
      failed: [],
      completed: [{
        id: '1',
        action: 'add',
        entityType: 'task',
        completedAt: new Date().toISOString()
      }]
    });

    render(<SyncProgressModal isOpen={true} onClose={() => {}} />);
    
    await waitFor(() => {
      expect(screen.getByText('已同步 (1)')).toBeInTheDocument();
      expect(screen.getByText('新增 任务')).toBeInTheDocument();
    });
  });

  it('should show confirmation dialog when clearing completed items', async () => {
    const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
    
    mockGetSyncStatus.mockResolvedValue({
      pending: [],
      processing: [],
      failed: [],
      completed: [
        { id: '1', action: 'add', entityType: 'task', completedAt: new Date().toISOString() },
        { id: '2', action: 'update', entityType: 'taskList', completedAt: new Date().toISOString() }
      ]
    });

    render(<SyncProgressModal isOpen={true} onClose={() => {}} />);
    
    await waitFor(() => {
      const clearButton = screen.getByText('清空已完成记录');
      fireEvent.click(clearButton);
    });

    expect(mockConfirm).toHaveBeenCalledWith('确定要清空所有已完成的同步记录吗？');
    expect(mockDeleteQueueItem).toHaveBeenCalledTimes(2);
    
    mockConfirm.mockRestore();
  });

  it('should handle close button click', async () => {
    const mockOnClose = jest.fn();
    mockGetSyncStatus.mockResolvedValue({
      pending: [],
      processing: [],
      failed: [],
      completed: []
    });

    render(<SyncProgressModal isOpen={true} onClose={mockOnClose} />);
    
    await waitFor(() => {
      const closeButton = screen.getByText('关闭');
      fireEvent.click(closeButton);
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should limit display of completed items to 10 and show count for remaining', async () => {
    const completedItems = Array.from({ length: 15 }, (_, i) => ({
      id: `${i + 1}`,
      action: 'add',
      entityType: 'task',
      completedAt: new Date().toISOString()
    }));

    mockGetSyncStatus.mockResolvedValue({
      pending: [],
      processing: [],
      failed: [],
      completed: completedItems
    });

    render(<SyncProgressModal isOpen={true} onClose={() => {}} />);
    
    await waitFor(() => {
      expect(screen.getByText('已同步 (15)')).toBeInTheDocument();
      expect(screen.getByText('还有 5 项...')).toBeInTheDocument();
    });
  });

  it('should reload sync status when modal is reopened', async () => {
    const { rerender } = render(<SyncProgressModal isOpen={false} onClose={() => {}} />);
    
    mockGetSyncStatus.mockResolvedValue({
      pending: [],
      processing: [],
      failed: [],
      completed: []
    });

    // Open the modal
    rerender(<SyncProgressModal isOpen={true} onClose={() => {}} />);
    
    await waitFor(() => {
      expect(mockGetSyncStatus).toHaveBeenCalledTimes(1);
    });

    // Close the modal
    rerender(<SyncProgressModal isOpen={false} onClose={() => {}} />);
    
    // Reopen the modal
    rerender(<SyncProgressModal isOpen={true} onClose={() => {}} />);
    
    await waitFor(() => {
      expect(mockGetSyncStatus).toHaveBeenCalledTimes(2);
    });
  });
});