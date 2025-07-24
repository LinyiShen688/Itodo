"use client";

import { useState, useEffect } from "react";
import { User, LogOut } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/stores/authStore";
import PomodoroTimer from "./PomodoroTimer";
import SummaryModal from "./SummaryModal";
import AuthModal from "./AuthModal";

export default function Header({ currentTaskName = "今日待办" }) {
  const { theme, setTheme, themes } = useTheme();
  const { user, isAuthenticated, signOut, initialize, initialized } =
    useAuthStore();
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

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
  };

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

        {/* 右侧图标组 */}
        <div className="flex items-center space-x-4">
          <button
            onClick={togglePomodoro}
            title="番茄钟"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[20px] shadow-[0_2px_8px_var(--shadow-soft)] transition-transform duration-300 ease-in-out hover:scale-[1.15] hover:rotate-6 hover:shadow-[0_4px_12px_var(--shadow-soft)]"
            style={{
              background:
                "linear-gradient(135deg, var(--accent-gold), var(--ink-brown))",
            }}
          >
            🍅
          </button>

          <button
            onClick={handleThemeChange}
            title="切换主题"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[20px] shadow-[0_2px_8px_var(--shadow-soft)] transition-transform duration-300 ease-in-out hover:scale-[1.15] hover:rotate-6 hover:shadow-[0_4px_12px_var(--shadow-soft)]"
            style={{ background: "linear-gradient(135deg, var(--accent-gold), var(--ink-brown))" }}
          >
            🎨
          </button>
          <button
            onClick={toggleSummary}
            title="任务总结"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[20px] shadow-[0_2px_8px_var(--shadow-soft)] transition-transform duration-300 ease-in-out hover:scale-[1.15] hover:rotate-6 hover:shadow-[0_4px_12px_var(--shadow-soft)]"
            style={{ background: "linear-gradient(135deg, var(--accent-gold), var(--ink-brown))" }}
          >
            📊
          </button>

          {/* 用户认证按钮 */}
          <div className="flex items-center">
            {user && (
              <span className="hidden md:block text-sm text-[var(--ink-brown)] mr-3 font-['Noto_Serif_SC']">
                {user.email}
              </span>
            )}
            <button
              onClick={handleAuthAction}
              title={isAuthenticated() ? "退出登录" : "邮箱登录"}
              className="flex h-9 w-9 items-center justify-center rounded-full shadow-[0_2px_8px_var(--shadow-soft)] transition-transform duration-300 ease-in-out hover:scale-[1.15] hover:rotate-6 hover:shadow-[0_4px_12px_var(--shadow-soft)]"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent-gold), var(--ink-brown))",
              }}
            >
              {isAuthenticated() ? (
                <LogOut size={16} className="text-white" />
              ) : (
                <User size={16} className="text-white" />
              )}
            </button>
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
    </>
  );
}
