'use client';

import { useEffect } from 'react';
import Header from '@/components/Header';
import QuadrantGrid from '@/components/QuadrantGrid';
import Sidebar from '@/components/Sidebar';
import LoadingState from '@/components/LoadingState';
import { useTrashStore } from '@/stores/trashStore';
import { useTaskStore } from '@/stores/taskStore';
import { useTaskListStore } from '@/stores/taskListStore';

export default function Home() {
  const { activeList, loading: listsLoading } = useTaskListStore();
  const initializeTrashStore = useTrashStore((state) => state.initializeTrashStore);
  const initializeTaskListStore = useTaskListStore((state) => state.initialize);

  // 初始化Zustand stores
  useEffect(() => {
    const initStores = async () => {
      await initializeTrashStore();
      await initializeTaskListStore();
    };
    initStores();
  }, [initializeTrashStore, initializeTaskListStore]);

  if (listsLoading) {
    return (
      <LoadingState 
        type="skeleton-quadrant"
        message="正在加载应用数据..."
        className="min-h-screen"
      />
    );
  }

  return (
    <>
      <Header currentTaskName={activeList?.name || "今日待办"} />
      <QuadrantGrid />
      <Sidebar />
    </>
  );
}
