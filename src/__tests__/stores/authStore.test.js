import { useAuthStore } from '@/stores/authStore';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/utils/toast';

// Mock Supabase client
jest.mock('@/lib/supabase/client');

// Mock toast utility
jest.mock('@/utils/toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
  },
  writable: true,
});

describe('authStore', () => {
  let mockSupabase;

  beforeEach(() => {
    // Reset Zustand store
    useAuthStore.setState({
      user: null,
      session: null,
      loading: false,
      error: null,
      initialized: false,
      subscription: null,
    });

    // Create mock Supabase client
    mockSupabase = {
      auth: {
        getSession: jest.fn(),
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        resetPasswordForEmail: jest.fn(),
        signOut: jest.fn(),
        onAuthStateChange: jest.fn(),
      },
    };

    createClient.mockReturnValue(mockSupabase);
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.initialized).toBe(false);
    });

    it('should initialize auth state successfully', async () => {
      const mockSession = {
        user: { id: '123', email: 'test@example.com' },
        access_token: 'token',
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      const { initialize } = useAuthStore.getState();
      await initialize();

      const state = useAuthStore.getState();
      expect(state.session).toEqual(mockSession);
      expect(state.user).toEqual(mockSession.user);
      expect(state.initialized).toBe(true);
      expect(state.loading).toBe(false);
    });

    it('should handle initialization error', async () => {
      const mockError = new Error('Initialization failed');

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: mockError,
      });

      const { initialize } = useAuthStore.getState();
      await initialize();

      const state = useAuthStore.getState();
      expect(state.error).toBe(mockError.message);
      expect(state.loading).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('认证初始化失败');
    });

    it('should setup auth state change listener', async () => {
      const mockSubscription = { unsubscribe: jest.fn() };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: mockSubscription },
      });

      const { initialize } = useAuthStore.getState();
      await initialize();

      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
      expect(useAuthStore.getState().subscription).toEqual(mockSubscription);
    });
  });

  describe('signInWithPassword', () => {
    it('should sign in successfully', async () => {
      const mockData = {
        user: { id: '123', email: 'test@example.com' },
        session: { access_token: 'token' },
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const { signInWithPassword } = useAuthStore.getState();
      const result = await signInWithPassword('test@example.com', 'password123');

      expect(result).toBe(true);
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {},
      });
      expect(toast.success).toHaveBeenCalledWith('登录成功');
    });

    it('should sign in with remember me option', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: {}, session: {} },
        error: null,
      });

      const { signInWithPassword } = useAuthStore.getState();
      await signInWithPassword('test@example.com', 'password123', true);

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: { persistSession: true },
      });
    });

    it('should handle invalid credentials error', async () => {
      const mockError = { message: 'Invalid login credentials' };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { signInWithPassword } = useAuthStore.getState();
      const result = await signInWithPassword('test@example.com', 'wrong-password');

      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('邮箱或密码错误');
      expect(useAuthStore.getState().error).toBe(mockError.message);
    });

    it('should handle email not confirmed error', async () => {
      const mockError = { message: 'Email not confirmed' };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { signInWithPassword } = useAuthStore.getState();
      await signInWithPassword('test@example.com', 'password123');

      expect(toast.error).toHaveBeenCalledWith('请先验证您的邮箱');
    });

    it('should handle too many requests error', async () => {
      const mockError = { message: 'Too many requests' };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { signInWithPassword } = useAuthStore.getState();
      await signInWithPassword('test@example.com', 'password123');

      expect(toast.error).toHaveBeenCalledWith('登录尝试过于频繁，请稍后再试');
    });

    it('should set loading state during sign in', async () => {
      mockSupabase.auth.signInWithPassword.mockImplementation(() => {
        const state = useAuthStore.getState();
        expect(state.loading).toBe(true);
        return Promise.resolve({ data: { user: {}, session: {} }, error: null });
      });

      const { signInWithPassword } = useAuthStore.getState();
      await signInWithPassword('test@example.com', 'password123');

      expect(useAuthStore.getState().loading).toBe(false);
    });
  });

  describe('signUp', () => {
    it('should sign up successfully', async () => {
      const mockData = {
        user: { id: '123', email: 'test@example.com', email_confirmed_at: null },
        session: null,
      };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const { signUp } = useAuthStore.getState();
      const result = await signUp('test@example.com', 'password123');

      expect(result).toBe(true);
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          emailRedirectTo: 'http://localhost:3000/?confirmed=true',
        },
      });
      expect(toast.success).toHaveBeenCalledWith('注册成功！请检查您的邮箱并点击验证链接');
    });

    it('should handle user already registered error', async () => {
      const mockError = { message: 'User already registered' };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { signUp } = useAuthStore.getState();
      const result = await signUp('test@example.com', 'password123');

      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('该邮箱已注册，请直接登录');
    });

    it('should handle weak password error', async () => {
      const mockError = { message: 'Password should be at least 6 characters' };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { signUp } = useAuthStore.getState();
      await signUp('test@example.com', '123');

      expect(toast.error).toHaveBeenCalledWith('密码至少需要6位字符');
    });

    it('should handle invalid email error', async () => {
      const mockError = { message: 'Invalid email' };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { signUp } = useAuthStore.getState();
      await signUp('invalid-email', 'password123');

      expect(toast.error).toHaveBeenCalledWith('请输入有效的邮箱地址');
    });

    it('should handle already confirmed user', async () => {
      const mockData = {
        user: { id: '123', email: 'test@example.com', email_confirmed_at: '2023-01-01' },
      };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const { signUp } = useAuthStore.getState();
      await signUp('test@example.com', 'password123');

      expect(toast.success).toHaveBeenCalledWith('注册成功！');
    });
  });

  describe('resetPassword', () => {
    it('should send reset password email successfully', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        error: null,
      });

      const { resetPassword } = useAuthStore.getState();
      const result = await resetPassword('test@example.com');

      expect(result).toBe(true);
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        {
          redirectTo: 'http://localhost:3000/reset-password',
        }
      );
      expect(toast.success).toHaveBeenCalledWith('密码重置邮件已发送，请检查您的邮箱');
    });

    it('should handle invalid email error', async () => {
      const mockError = { message: 'Invalid email' };

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        error: mockError,
      });

      const { resetPassword } = useAuthStore.getState();
      const result = await resetPassword('invalid-email');

      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('请输入有效的邮箱地址');
    });

    it('should handle too many requests error', async () => {
      const mockError = { message: 'Too many requests' };

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        error: mockError,
      });

      const { resetPassword } = useAuthStore.getState();
      await resetPassword('test@example.com');

      expect(toast.error).toHaveBeenCalledWith('请求过于频繁，请稍后再试');
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      // Set initial state with user
      useAuthStore.setState({
        user: { id: '123', email: 'test@example.com' },
        session: { access_token: 'token' },
      });

      const { signOut } = useAuthStore.getState();
      const result = await signOut();

      expect(result).toBe(true);
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.error).toBeNull();
    });

    it('should handle sign out error', async () => {
      const mockError = { message: 'Sign out failed' };

      mockSupabase.auth.signOut.mockResolvedValue({
        error: mockError,
      });

      const { signOut } = useAuthStore.getState();
      const result = await signOut();

      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('退出登录失败');
      expect(useAuthStore.getState().error).toBe(mockError.message);
    });
  });

  describe('utility methods', () => {
    it('should check authentication status', () => {
      const { isAuthenticated } = useAuthStore.getState();

      // Not authenticated by default
      expect(isAuthenticated()).toBe(false);

      // Set authenticated state
      useAuthStore.setState({
        user: { id: '123', email: 'test@example.com' },
        session: { access_token: 'token' },
      });

      expect(isAuthenticated()).toBe(true);
    });

    it('should get user email', () => {
      const { getUserEmail } = useAuthStore.getState();

      // No email by default
      expect(getUserEmail()).toBeNull();

      // Set user
      useAuthStore.setState({
        user: { id: '123', email: 'test@example.com' },
      });

      expect(getUserEmail()).toBe('test@example.com');
    });

    it('should cleanup subscription', () => {
      const mockUnsubscribe = jest.fn();
      const mockSubscription = { unsubscribe: mockUnsubscribe };

      useAuthStore.setState({ subscription: mockSubscription });

      const { cleanup } = useAuthStore.getState();
      cleanup();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('auth state change handling', () => {
    it('should handle SIGNED_IN event', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      let authStateCallback;
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      const { initialize } = useAuthStore.getState();
      await initialize();

      // Simulate SIGNED_IN event
      const mockSession = {
        user: { id: '123', email: 'test@example.com' },
        access_token: 'token',
      };

      authStateCallback('SIGNED_IN', mockSession);

      const state = useAuthStore.getState();
      expect(state.session).toEqual(mockSession);
      expect(state.user).toEqual(mockSession.user);
      expect(state.error).toBeNull();
    });

    it('should handle SIGNED_OUT event', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      let authStateCallback;
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      const { initialize } = useAuthStore.getState();
      await initialize();

      // Simulate SIGNED_OUT event
      authStateCallback('SIGNED_OUT', null);

      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
      expect(toast.info).toHaveBeenCalledWith('已退出登录');
    });

    it('should handle USER_UPDATED event', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      let authStateCallback;
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      const { initialize } = useAuthStore.getState();
      await initialize();

      // Simulate USER_UPDATED event
      const mockSession = {
        user: { id: '123', email: 'updated@example.com' },
      };

      authStateCallback('USER_UPDATED', mockSession);

      expect(toast.success).toHaveBeenCalledWith('用户信息已更新');
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockSupabase.auth.signInWithPassword.mockRejectedValue(new Error('Network error'));

      const { signInWithPassword } = useAuthStore.getState();
      const result = await signInWithPassword('test@example.com', 'password123');

      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('登录请求失败');
      expect(useAuthStore.getState().error).toBe('Network error');
    });

    it('should handle unexpected errors gracefully', async () => {
      mockSupabase.auth.signUp.mockRejectedValue(new Error('Unexpected error'));

      const { signUp } = useAuthStore.getState();
      const result = await signUp('test@example.com', 'password123');

      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('注册请求失败');
    });
  });
});