'use client';

import { useState } from 'react';
import { Mail, X, Send } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function AuthModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const { signInWithEmail, loading, error } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      return;
    }

    const success = await signInWithEmail(email.trim());
    if (success) {
      setEmailSent(true);
    }
  };

  const handleClose = () => {
    setEmail('');
    setEmailSent(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--parchment)] border-2 border-[var(--ink-brown)]/20 rounded-lg shadow-2xl max-w-md w-full relative">
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 p-1 rounded-full hover:bg-[var(--parchment-dark)] transition-colors"
        >
          <X size={20} className="text-[var(--ink-brown)]" />
        </button>

        <div className="p-6">
          {!emailSent ? (
            <>
              {/* 标题 */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[var(--accent-gold)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail size={32} className="text-[var(--accent-gold)]" />
                </div>
                <h2 className="text-2xl font-bold text-[var(--ink-black)] font-['Caveat']">
                  邮箱登录
                </h2>
                <p className="text-[var(--ink-brown)] mt-2 text-sm font-['Noto_Serif_SC']">
                  我们将向您的邮箱发送一个登录链接
                </p>
              </div>

              {/* 登录表单 */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[var(--ink-brown)] mb-2 font-['Noto_Serif_SC']">
                    邮箱地址
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="请输入您的邮箱地址"
                    className="w-full px-4 py-3 bg-[var(--white-trans)] border border-[var(--ink-brown)]/20 rounded-lg 
                             text-[var(--ink-black)] placeholder-[var(--ink-brown)]/60
                             focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50 focus:border-[var(--accent-gold)]
                             transition-all duration-200 font-['Noto_Serif_SC']"
                    required
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3 font-['Noto_Serif_SC']">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full bg-[var(--accent-gold)] text-white py-3 px-4 rounded-lg font-medium
                           hover:bg-[var(--accent-gold)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50
                           disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
                           flex items-center justify-center gap-2 font-['Noto_Serif_SC']"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      发送中...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      发送登录链接
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-xs text-[var(--ink-brown)]/70 font-['Noto_Serif_SC']">
                  点击登录即表示您同意我们的服务条款和隐私政策
                </p>
              </div>
            </>
          ) : (
            /* 邮件发送成功状态 */
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail size={32} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--ink-black)] mb-4 font-['Caveat']">
                邮件已发送！
              </h2>
              <p className="text-[var(--ink-brown)] mb-6 font-['Noto_Serif_SC']">
                我们已向 <span className="font-medium text-[var(--ink-black)]">{email}</span> 发送了登录链接。
                <br />
                请检查您的邮箱并点击链接完成登录。
              </p>
              
              <button
                onClick={() => setEmailSent(false)}
                className="text-[var(--accent-gold)] hover:text-[var(--accent-gold)]/80 text-sm font-medium font-['Noto_Serif_SC']"
              >
                重新发送或更换邮箱
              </button>
              
              <div className="mt-6 p-4 bg-[var(--accent-gold)]/10 rounded-lg">
                <p className="text-xs text-[var(--ink-brown)] font-['Noto_Serif_SC']">
                  💡 提示：如果没有收到邮件，请检查垃圾邮件文件夹，或稍等片刻再试。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}