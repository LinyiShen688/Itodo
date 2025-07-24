'use client';

import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/utils/toast';

export const useAuthStore = create((set, get) => ({
  // 状态
  user: null,
  session: null,
  loading: false,
  error: null,
  initialized: false,
  subscription: null,

  // 基础操作
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),

  // 初始化认证状态
  initialize: async () => {
    try {
      set({ loading: true, error: null });
      const supabase = createClient();
      
      // 获取当前会话
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('获取会话失败:', error);
        set({ error: error.message });
        return;
      }

      set({ 
        session, 
        user: session?.user || null,
        initialized: true 
      });

      // 监听认证状态变化
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('认证状态变化:', event, session);
          
          set({ 
            session, 
            user: session?.user || null,
            error: null 
          });

          // 根据事件类型显示相应提示
          switch (event) {
            case 'SIGNED_IN':
              toast.success('登录成功');
              break;
            case 'SIGNED_OUT':
              toast.info('已退出登录');
              break;
            case 'TOKEN_REFRESHED':
              console.log('Token 已刷新');
              break;
            case 'USER_UPDATED':
              toast.success('用户信息已更新');
              break;
          }
        }
      );

      // 存储订阅以便清理
      set({ subscription });

    } catch (error) {
      console.error('初始化认证失败:', error);
      set({ error: error.message });
      toast.error('认证初始化失败');
    } finally {
      set({ loading: false });
    }
  },

  // 发送 Magic Link 登录邮件
  signInWithEmail: async (email) => {
    try {
      set({ loading: true, error: null });
      const supabase = createClient();
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // 可以自定义重定向URL
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error('发送登录邮件失败:', error);
        set({ error: error.message });
        toast.error('发送登录邮件失败: ' + error.message);
        return false;
      }

      toast.success('登录邮件已发送，请检查您的邮箱');
      return true;

    } catch (error) {
      console.error('登录请求失败:', error);
      set({ error: error.message });
      toast.error('登录请求失败');
      return false;
    } finally {
      set({ loading: false });
    }
  },

  // 退出登录
  signOut: async () => {
    try {
      set({ loading: true, error: null });
      const supabase = createClient();
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('退出登录失败:', error);
        set({ error: error.message });
        toast.error('退出登录失败');
        return false;
      }

      // 清理本地状态
      set({ 
        user: null, 
        session: null,
        error: null 
      });
      
      return true;

    } catch (error) {
      console.error('退出登录请求失败:', error);
      set({ error: error.message });
      toast.error('退出登录失败');
      return false;
    } finally {
      set({ loading: false });
    }
  },

  // 检查是否已登录
  isAuthenticated: () => {
    const { user, session } = get();
    return !!(user && session);
  },

  // 获取用户邮箱
  getUserEmail: () => {
    const { user } = get();
    return user?.email || null;
  },

  // 清理订阅
  cleanup: () => {
    const { subscription } = get();
    if (subscription) {
      subscription.unsubscribe();
    }
  },
}));