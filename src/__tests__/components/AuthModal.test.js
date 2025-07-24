import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AuthModal from '@/components/AuthModal';
import { useAuthStore } from '@/stores/authStore';

// Mock the auth store
jest.mock('@/stores/authStore');

// Mock toast utility
jest.mock('@/utils/toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('AuthModal', () => {
  const mockSignInWithPassword = jest.fn();
  const mockSignUp = jest.fn();
  const mockResetPassword = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    useAuthStore.mockReturnValue({
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      resetPassword: mockResetPassword,
      loading: false,
      error: null,
    });

    jest.clearAllMocks();
  });

  describe('Modal Visibility', () => {
    it('should not render when isOpen is false', () => {
      render(<AuthModal isOpen={false} onClose={mockOnClose} />);
      expect(screen.queryByText('登录')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByText('登录')).toBeInTheDocument();
    });
  });

  describe('Login Mode', () => {
    beforeEach(() => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
    });

    it('should display login form by default', () => {
      expect(screen.getByText('登录')).toBeInTheDocument();
      expect(screen.getByText('使用您的邮箱和密码登录')).toBeInTheDocument();
      expect(screen.getByLabelText('邮箱地址')).toBeInTheDocument();
      expect(screen.getByLabelText('密码')).toBeInTheDocument();
      expect(screen.getByLabelText('记住我')).toBeInTheDocument();
    });

    it('should toggle password visibility', async () => {
      const user = userEvent.setup();
      const passwordInput = screen.getByLabelText('密码');
      // Find the toggle button by its parent structure since it has no specific label
      const toggleButton = passwordInput.parentElement.querySelector('button');

      expect(passwordInput).toHaveAttribute('type', 'password');
      
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');
      
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should call signInWithPassword when login form is submitted', async () => {
      const user = userEvent.setup();
      mockSignInWithPassword.mockResolvedValue(true);

      const emailInput = screen.getByLabelText('邮箱地址');
      const passwordInput = screen.getByLabelText('密码');
      const rememberMeCheckbox = screen.getByLabelText('记住我');
      const submitButton = screen.getByRole('button', { name: '登录' });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(rememberMeCheckbox);
      await user.click(submitButton);

      expect(mockSignInWithPassword).toHaveBeenCalledWith('test@example.com', 'password123', true);
    });

    it('should close modal on successful login', async () => {
      const user = userEvent.setup();
      mockSignInWithPassword.mockResolvedValue(true);

      const emailInput = screen.getByLabelText('邮箱地址');
      const passwordInput = screen.getByLabelText('密码');
      const submitButton = screen.getByRole('button', { name: '登录' });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should not submit form with empty fields', async () => {
      const user = userEvent.setup();
      const submitButton = screen.getByRole('button', { name: '登录' });

      expect(submitButton).toBeDisabled();

      await user.type(screen.getByLabelText('邮箱地址'), 'test@example.com');
      expect(submitButton).toBeDisabled();

      await user.type(screen.getByLabelText('密码'), 'password123');
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Registration Mode', () => {
    beforeEach(() => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
    });

    it('should switch to registration mode', async () => {
      const user = userEvent.setup();
      const switchButton = screen.getByText('没有账户？点击注册');

      await user.click(switchButton);

      expect(screen.getByText('注册')).toBeInTheDocument();
      expect(screen.getByText('创建新账户来使用iTodo')).toBeInTheDocument();
      expect(screen.getByLabelText('确认密码')).toBeInTheDocument();
      expect(screen.queryByLabelText('记住我')).not.toBeInTheDocument();
    });

    it('should show password mismatch error', async () => {
      const user = userEvent.setup();
      
      // Switch to registration mode
      await user.click(screen.getByText('没有账户？点击注册'));

      const passwordInput = screen.getByLabelText('密码');
      const confirmPasswordInput = screen.getByLabelText('确认密码');

      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'different');

      expect(screen.getByText('密码不匹配')).toBeInTheDocument();
    });

    it('should call signUp when registration form is submitted', async () => {
      const user = userEvent.setup();
      mockSignUp.mockResolvedValue(true);

      // Switch to registration mode
      await user.click(screen.getByText('没有账户？点击注册'));

      const emailInput = screen.getByLabelText('邮箱地址');
      const passwordInput = screen.getByLabelText('密码');
      const confirmPasswordInput = screen.getByLabelText('确认密码');
      const submitButton = screen.getByRole('button', { name: '注册' });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should switch back to login mode after successful registration', async () => {
      const user = userEvent.setup();
      mockSignUp.mockResolvedValue(true);

      // Switch to registration mode
      await user.click(screen.getByText('没有账户？点击注册'));

      const emailInput = screen.getByLabelText('邮箱地址');
      const passwordInput = screen.getByLabelText('密码');
      const confirmPasswordInput = screen.getByLabelText('确认密码');
      const submitButton = screen.getByRole('button', { name: '注册' });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('登录')).toBeInTheDocument();
      });
    });
  });

  describe('Password Reset Mode', () => {
    beforeEach(() => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
    });

    it('should switch to password reset mode', async () => {
      const user = userEvent.setup();
      const resetButton = screen.getByText('忘记密码？');

      await user.click(resetButton);

      expect(screen.getByText('重置密码')).toBeInTheDocument();
      expect(screen.getByText('我们将向您的邮箱发送密码重置链接')).toBeInTheDocument();
      expect(screen.queryByLabelText('密码')).not.toBeInTheDocument();
    });

    it('should call resetPassword when reset form is submitted', async () => {
      const user = userEvent.setup();
      mockResetPassword.mockResolvedValue(true);

      // Switch to reset mode
      await user.click(screen.getByText('忘记密码？'));

      const emailInput = screen.getByLabelText('邮箱地址');
      const submitButton = screen.getByRole('button', { name: '发送重置链接' });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      expect(mockResetPassword).toHaveBeenCalledWith('test@example.com');
    });

    it('should return to login mode after successful reset', async () => {
      const user = userEvent.setup();
      mockResetPassword.mockResolvedValue(true);

      // Switch to reset mode
      await user.click(screen.getByText('忘记密码？'));

      const emailInput = screen.getByLabelText('邮箱地址');
      const submitButton = screen.getByRole('button', { name: '发送重置链接' });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('登录')).toBeInTheDocument();
      });
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state when submitting', () => {
      useAuthStore.mockReturnValue({
        signInWithPassword: mockSignInWithPassword,
        signUp: mockSignUp,
        resetPassword: mockResetPassword,
        loading: true,
        error: null,
      });

      render(<AuthModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('登录中...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /登录中/ })).toBeDisabled();
    });

    it('should display error message', () => {
      useAuthStore.mockReturnValue({
        signInWithPassword: mockSignInWithPassword,
        signUp: mockSignUp,
        resetPassword: mockResetPassword,
        loading: false,
        error: '邮箱或密码错误',
      });

      render(<AuthModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('邮箱或密码错误')).toBeInTheDocument();
    });

    it('should disable inputs when loading', () => {
      useAuthStore.mockReturnValue({
        signInWithPassword: mockSignInWithPassword,
        signUp: mockSignUp,
        resetPassword: mockResetPassword,
        loading: true,
        error: null,
      });

      render(<AuthModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByLabelText('邮箱地址')).toBeDisabled();
      expect(screen.getByLabelText('密码')).toBeDisabled();
    });
  });

  describe('Modal Interactions', () => {
    it('should close modal when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);

      // Find the X close button by its content since it doesn't have a specific role/label
      const closeButton = screen.getByRole('button').parentElement.querySelector('button[class*="absolute"]');
      await user.click(closeButton || screen.getAllByRole('button')[0]);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should reset form state when modal closes and reopens', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<AuthModal isOpen={true} onClose={mockOnClose} />);

      // Fill form and switch to registration
      await user.type(screen.getByLabelText('邮箱地址'), 'test@example.com');
      await user.click(screen.getByText('没有账户？点击注册'));

      // Close modal
      rerender(<AuthModal isOpen={false} onClose={mockOnClose} />);

      // Reopen modal
      rerender(<AuthModal isOpen={true} onClose={mockOnClose} />);

      // Should be back to login mode with empty form
      expect(screen.getByText('登录')).toBeInTheDocument();
      expect(screen.getByLabelText('邮箱地址')).toHaveValue('');
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
    });

    it('should require email field', async () => {
      const emailInput = screen.getByLabelText('邮箱地址');
      expect(emailInput).toBeRequired();
    });

    it('should require password field', async () => {
      const passwordInput = screen.getByLabelText('密码');
      expect(passwordInput).toBeRequired();
    });

    it('should have email type for email input', () => {
      const emailInput = screen.getByLabelText('邮箱地址');
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should have password type for password input by default', () => {
      const passwordInput = screen.getByLabelText('密码');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  // Auto-focus test removed due to jsdom limitations with focus events
});