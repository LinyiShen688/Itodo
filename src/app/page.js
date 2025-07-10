'use client';

import Header from '@/components/Header';
import QuadrantGrid from '@/components/QuadrantGrid';
import Sidebar from '@/components/Sidebar';
import { useTaskLists } from '@/hooks/useTaskLists';

export default function Home() {
  const { activeList, loading: listsLoading } = useTaskLists();

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
