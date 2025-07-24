'use client';

import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function AuthCodeErrorPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[var(--parchment)] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white/50 border-2 border-red-200 rounded-lg p-8 shadow-lg">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-[var(--ink-black)] mb-4 font-['Caveat']">
            登录失败
          </h1>
          
          <p className="text-[var(--ink-brown)] mb-6 font-['Noto_Serif_SC']">
            登录链接已过期或无效。请返回首页重新尝试登录。
          </p>
          
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 bg-[var(--accent-gold)] text-white px-6 py-3 rounded-lg font-medium hover:bg-[var(--accent-gold)]/90 transition-colors font-['Noto_Serif_SC']"
          >
            <ArrowLeft size={16} />
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
}