'use client';

import { useEffect } from 'react';
import Header from '@/components/Header';
import QuadrantGrid from '@/components/QuadrantGrid';
import Sidebar from '@/components/Sidebar';
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--ink-brown)] text-xl">加载中...</div>
      </div>
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
