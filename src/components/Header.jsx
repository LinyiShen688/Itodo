"use client";

import { useState, useEffect, useRef } from "react";
import { User, LogOut, Menu, Clock, BarChart3, Palette, RefreshCw } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/stores/authStore";
import PomodoroTimer from "./PomodoroTimer";
import SummaryModal from "./SummaryModal";
import AuthModal from "./AuthModal";
import SyncProgressModal from "./SyncProgressModal";

export default function Header({ currentTaskName = "今日待办" }) {
  const { theme, setTheme, themes } = useTheme();
  const { user, isAuthenticated, signOut, initialize, initialized } =
    useAuthStore();
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSyncProgress, setShowSyncProgress] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  
  const menuDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);

  // 初始化认证状态
  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialize, initialized]);

  const handleThemeChange = () => {
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const handleAuthAction = () => {
    if (isAuthenticated()) {
      // 已登录则退出
      signOut();
    } else {
      // 未登录则显示登录弹窗
      setShowAuthModal(true);
    }
    setShowUserDropdown(false);
  };

  const handleMenuAction = (action) => {
    switch (action) {
      case 'pomodoro':
        setShowPomodoro(true);
        break;
      case 'summary':
        setShowSummary(true);
        break;
      case 'theme':
        const currentIndex = themes.indexOf(theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        setTheme(themes[nextIndex]);
        break;
    }
    setShowMenuDropdown(false);
  };

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuDropdownRef.current && !menuDropdownRef.current.contains(event.target)) {
        setShowMenuDropdown(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const togglePomodoro = () => {
    setShowPomodoro(!showPomodoro);
  };

  const closePomodoro = () => {
    setShowPomodoro(false);
  };

  const toggleSummary = () => {
    setShowSummary(!showSummary);
  };

  const closeSummary = () => {
    setShowSummary(false);
  };

  return (
    <>
      <header className="sticky top-0 z-[100] flex items-center justify-between px-4 py-4 md:px-8 md:py-6 backdrop-blur-lg border-b [border-bottom-color:rgba(212,165,116,0.2)] bg-gradient-to-b from-[rgba(255,255,255,0.6)] to-transparent">
        {/* 左侧标题与当前任务名 */}
        <div className="flex items-baseline">
          <h1
            className="text-[2.5rem] font-bold text-[var(--ink-brown)]"
            style={{
              fontFamily: "'Caveat', cursive",
              textShadow: "2px 2px 4px var(--shadow-soft)",
            }}
          >
            Itodo
          </h1>
          <span
            className="ml-8 text-[1.2rem] italic opacity-80 text-[var(--ink-brown)]"
            style={{ fontFamily: "'Noto Serif SC', serif" }}
          >
            {currentTaskName}
          </span>
        </div>

        {/* 右侧按钮组 */}
        <div className="flex items-center space-x-4">
          {/* 菜单下拉 */}
          <div className="relative" ref={menuDropdownRef}>
            <button
              onClick={() => setShowMenuDropdown(!showMenuDropdown)}
              title="菜单"
              className="flex h-9 w-9 items-center justify-center rounded-full shadow-[0_2px_8px_var(--shadow-soft)] transition-transform duration-300 ease-in-out hover:scale-[1.15] hover:rotate-6 hover:shadow-[0_4px_12px_var(--shadow-soft)]"
              style={{
                background: "linear-gradient(135deg, var(--accent-gold), var(--ink-brown))",
              }}
            >
              <Menu size={16} className="text-white" />
            </button>
            
            {/* 菜单下拉内容 */}
            {showMenuDropdown && (
              <div className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg border border-[var(--accent-gold)]/20 z-50">
                <div className="py-2">
                  <button
                    onClick={() => handleMenuAction('pomodoro')}
                    className="w-full px-4 py-2 text-left text-[var(--ink-brown)] hover:bg-[var(--parchment)] transition-colors duration-200 flex items-center space-x-3"
                  >
                    <Clock size={16} />
                    <span className="font-['Noto_Serif_SC']">番茄钟</span>
                  </button>
                  <button
                    onClick={() => handleMenuAction('summary')}
                    className="w-full px-4 py-2 text-left text-[var(--ink-brown)] hover:bg-[var(--parchment)] transition-colors duration-200 flex items-center space-x-3"
                  >
                    <BarChart3 size={16} />
                    <span className="font-['Noto_Serif_SC']">任务总结</span>
                  </button>
                  <button
                    onClick={() => handleMenuAction('theme')}
                    className="w-full px-4 py-2 text-left text-[var(--ink-brown)] hover:bg-[var(--parchment)] transition-colors duration-200 flex items-center space-x-3"
                  >
                    <Palette size={16} />
                    <span className="font-['Noto_Serif_SC']">主题切换</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 用户下拉 */}
          <div className="relative" ref={userDropdownRef}>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              title={isAuthenticated() ? "用户菜单" : "邮箱登录"}
              className="flex h-9 w-9 items-center justify-center rounded-full shadow-[0_2px_8px_var(--shadow-soft)] transition-transform duration-300 ease-in-out hover:scale-[1.15] hover:rotate-6 hover:shadow-[0_4px_12px_var(--shadow-soft)]"
              style={{
                background: "linear-gradient(135deg, var(--accent-gold), var(--ink-brown))",
              }}
            >
              <User size={16} className="text-white" />
            </button>
            
            {/* 用户下拉内容 */}
            {showUserDropdown && (
              <div className="absolute right-0 top-12 w-64 bg-white rounded-lg shadow-lg border border-[var(--accent-gold)]/20 z-50">
                <div className="py-2">
                  {isAuthenticated() ? (
                    <>
                      <div className="px-4 py-3 border-b border-[var(--accent-gold)]/10">
                        <div className="text-sm text-[var(--ink-brown)]/60 font-['Noto_Serif_SC']">账户信息</div>
                        <div className="text-[var(--ink-brown)] font-medium font-['Noto_Serif_SC'] mt-1">
                          {user?.email}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setShowSyncProgress(true);
                          setShowUserDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left text-[var(--ink-brown)] hover:bg-[var(--parchment)] transition-colors duration-200 flex items-center space-x-3"
                      >
                        <RefreshCw size={16} />
                        <span className="font-['Noto_Serif_SC']">同步进度</span>
                      </button>
                      <button
                        onClick={handleAuthAction}
                        className="w-full px-4 py-2 text-left text-[var(--ink-brown)] hover:bg-[var(--parchment)] transition-colors duration-200 flex items-center space-x-3"
                      >
                        <LogOut size={16} />
                        <span className="font-['Noto_Serif_SC']">退出登录</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleAuthAction}
                      className="w-full px-4 py-2 text-left text-[var(--ink-brown)] hover:bg-[var(--parchment)] transition-colors duration-200 flex items-center space-x-3"
                    >
                      <User size={16} />
                      <span className="font-['Noto_Serif_SC']">邮箱登录</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 番茄钟组件 */}
      <PomodoroTimer isVisible={showPomodoro} onClose={closePomodoro} />

      {/* 总结弹窗组件 */}
      <SummaryModal isVisible={showSummary} onClose={closeSummary} />

      {/* 认证弹窗组件 */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* 同步进度弹窗组件 */}
      <SyncProgressModal
        isOpen={showSyncProgress}
        onClose={() => setShowSyncProgress(false)}
      />
    </>
  );
}
