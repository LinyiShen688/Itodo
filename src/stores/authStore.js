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
              // 不显示登录成功提示，因为:
              // 1. 发送邮件时已经有提示
              // 2. Header会显示登录状态
              // 3. 避免页面刷新时的重复提示
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

  // 邮箱密码登录
  signInWithPassword: async (email, password, rememberMe = false) => {
    try {
      set({ loading: true, error: null });
      const supabase = createClient();
      
      const options = {};
      if (rememberMe) {
        // 记住登录状态，设置更长的session过期时间
        options.persistSession = true;
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options
      });

      if (error) {
        console.error('登录失败:', error);
        set({ error: error.message });
        
        // 提供更友好的错误提示
        let errorMessage = '登录失败';
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = '邮箱或密码错误';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = '请先验证您的邮箱';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = '登录尝试过于频繁，请稍后再试';
        }
        
        toast.error(errorMessage);
        return false;
      }

      toast.success('登录成功');
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

  // 用户注册
  signUp: async (email, password) => {
    try {
      set({ loading: true, error: null });
      const supabase = createClient();
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/?confirmed=true`,
        },
      });

      if (error) {
        console.error('注册失败:', error);
        set({ error: error.message });
        
        // 提供更友好的错误提示
        let errorMessage = '注册失败';
        if (error.message.includes('User already registered')) {
          errorMessage = '该邮箱已注册，请直接登录';
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = '密码至少需要6位字符';
        } else if (error.message.includes('Invalid email')) {
          errorMessage = '请输入有效的邮箱地址';
        }
        
        toast.error(errorMessage);
        return false;
      }

      // 如果需要邮箱验证
      if (data.user && !data.user.email_confirmed_at) {
        toast.success('注册成功！请检查您的邮箱并点击验证链接');
      } else {
        toast.success('注册成功！');
      }
      
      return true;

    } catch (error) {
      console.error('注册请求失败:', error);
      set({ error: error.message });
      toast.error('注册请求失败');
      return false;
    } finally {
      set({ loading: false });
    }
  },

  // 密码重置
  resetPassword: async (email) => {
    try {
      set({ loading: true, error: null });
      const supabase = createClient();
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('发送重置邮件失败:', error);
        set({ error: error.message });
        
        // 提供更友好的错误提示
        let errorMessage = '发送重置邮件失败';
        if (error.message.includes('Invalid email')) {
          errorMessage = '请输入有效的邮箱地址';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = '请求过于频繁，请稍后再试';
        }
        
        toast.error(errorMessage);
        return false;
      }

      toast.success('密码重置邮件已发送，请检查您的邮箱');
      return true;

    } catch (error) {
      console.error('密码重置请求失败:', error);
      set({ error: error.message });
      toast.error('密码重置请求失败');
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