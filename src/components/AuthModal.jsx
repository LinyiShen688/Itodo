'use client';

import { useState, useRef, useEffect } from 'react';
import { Mail, X, Lock, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function AuthModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true); // true=登录, false=注册
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  
  const emailInputRef = useRef(null);
  const { signInWithPassword, signUp, resetPassword, loading, error } = useAuthStore();

  // 自动聚焦邮箱输入框
  useEffect(() => {
    if (isOpen && emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      return;
    }

    if (isResetMode) {
      // 密码重置模式
      const success = await resetPassword(email.trim());
      if (success) {
        setIsResetMode(false);
        setIsLogin(true);
      }
      return;
    }

    if (isLogin) {
      // 登录模式
      if (!password.trim()) {
        return;
      }
      const success = await signInWithPassword(email.trim(), password.trim(), rememberMe);
      if (success) {
        handleClose();
      }
    } else {
      // 注册模式
      if (!password.trim() || !confirmPassword.trim()) {
        return;
      }
      if (password !== confirmPassword) {
        return;
      }
      const success = await signUp(email.trim(), password.trim());
      if (success) {
        setIsLogin(true);
        setPassword('');
        setConfirmPassword('');
      }
    }
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setIsLogin(true);
    setRememberMe(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsResetMode(false);
    onClose();
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsResetMode(false);
  };

  const enterResetMode = () => {
    setIsResetMode(true);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  };

  if (!isOpen) return null;

  const getTitle = () => {
    if (isResetMode) return '重置密码';
    return isLogin ? '登录' : '注册';
  };

  const getIcon = () => {
    if (isResetMode) return <Mail size={32} className="text-[var(--accent-gold)]" />;
    return isLogin ? <Lock size={32} className="text-[var(--accent-gold)]" /> : <UserPlus size={32} className="text-[var(--accent-gold)]" />;
  };

  const getDescription = () => {
    if (isResetMode) return '我们将向您的邮箱发送密码重置链接';
    return isLogin ? '使用您的邮箱和密码登录' : '创建新账户来使用iTodo';
  };

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
          {/* 标题 */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[var(--accent-gold)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              {getIcon()}
            </div>
            <h2 className="text-2xl font-bold text-[var(--ink-black)] font-['Caveat']">
              {getTitle()}
            </h2>
            <p className="text-[var(--ink-brown)] mt-2 text-sm font-['Noto_Serif_SC']">
              {getDescription()}
            </p>
          </div>

          {/* 登录/注册表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 邮箱输入 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--ink-brown)] mb-2 font-['Noto_Serif_SC']">
                邮箱地址
              </label>
              <input
                ref={emailInputRef}
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

            {/* 密码输入 - 仅在非重置模式显示 */}
            {!isResetMode && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[var(--ink-brown)] mb-2 font-['Noto_Serif_SC']">
                  密码
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="w-full px-4 py-3 pr-12 bg-[var(--white-trans)] border border-[var(--ink-brown)]/20 rounded-lg 
                             text-[var(--ink-black)] placeholder-[var(--ink-brown)]/60
                             focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50 focus:border-[var(--accent-gold)]
                             transition-all duration-200 font-['Noto_Serif_SC']"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-brown)]/60 hover:text-[var(--ink-brown)] transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {/* 确认密码输入 - 仅在注册模式显示 */}
            {!isLogin && !isResetMode && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--ink-brown)] mb-2 font-['Noto_Serif_SC']">
                  确认密码
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入密码"
                    className="w-full px-4 py-3 pr-12 bg-[var(--white-trans)] border border-[var(--ink-brown)]/20 rounded-lg 
                             text-[var(--ink-black)] placeholder-[var(--ink-brown)]/60
                             focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50 focus:border-[var(--accent-gold)]
                             transition-all duration-200 font-['Noto_Serif_SC']"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-brown)]/60 hover:text-[var(--ink-brown)] transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {!isResetMode && password && confirmPassword && password !== confirmPassword && (
                  <p className="text-red-600 text-xs mt-1 font-['Noto_Serif_SC']">密码不匹配</p>
                )}
              </div>
            )}

            {/* 记住我选项 - 仅在登录模式显示 */}
            {isLogin && !isResetMode && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-[var(--accent-gold)] focus:ring-[var(--accent-gold)] border-[var(--ink-brown)]/20 rounded"
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-[var(--ink-brown)] font-['Noto_Serif_SC']">
                  记住我
                </label>
              </div>
            )}

            {/* 错误提示 */}
            {error && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3 font-['Noto_Serif_SC']">
                {error}
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={loading || !email.trim() || (!isResetMode && !password.trim()) || (!isLogin && !isResetMode && password !== confirmPassword)}
              className="w-full bg-[var(--accent-gold)] text-white py-3 px-4 rounded-lg font-medium
                       hover:bg-[var(--accent-gold)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
                       flex items-center justify-center gap-2 font-['Noto_Serif_SC']"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  {isResetMode ? '发送中...' : isLogin ? '登录中...' : '注册中...'}
                </>
              ) : (
                <>
                  {isResetMode ? (
                    <>
                      <Mail size={16} />
                      发送重置链接
                    </>
                  ) : isLogin ? (
                    <>
                      <Lock size={16} />
                      登录
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      注册
                    </>
                  )}
                </>
              )}
            </button>
          </form>

          {/* 底部操作链接 */}
          <div className="mt-6 text-center space-y-2">
            {isResetMode ? (
              <button
                onClick={() => setIsResetMode(false)}
                className="text-[var(--accent-gold)] hover:text-[var(--accent-gold)]/80 text-sm font-medium font-['Noto_Serif_SC']"
              >
                返回登录
              </button>
            ) : (
              <>
                <div>
                  <button
                    onClick={switchMode}
                    className="text-[var(--accent-gold)] hover:text-[var(--accent-gold)]/80 text-sm font-medium font-['Noto_Serif_SC']"
                  >
                    {isLogin ? '没有账户？点击注册' : '已有账户？点击登录'}
                  </button>
                </div>
                {isLogin && (
                  <div>
                    <button
                      onClick={enterResetMode}
                      className="text-[var(--ink-brown)]/70 hover:text-[var(--ink-brown)] text-xs font-['Noto_Serif_SC']"
                    >
                      忘记密码？
                    </button>
                  </div>
                )}
              </>
            )}
            
            {!isResetMode && (
              <p className="text-xs text-[var(--ink-brown)]/70 font-['Noto_Serif_SC'] mt-4">
                点击{isLogin ? '登录' : '注册'}即表示您同意我们的服务条款和隐私政策
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}