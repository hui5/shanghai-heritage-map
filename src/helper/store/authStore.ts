import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { create } from "zustand";
import { supabase, type User } from "./supabase";

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;

  // actions
  initialize: () => Promise<void>;
  signInWithGithub: () => Promise<{ error: any }>;
  signInWithEmailOTP: (email: string) => Promise<{ error: any }>;
  verifyEmailOTP: (email: string, token: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

export const useAuthStore = create<AuthState>((set, _get) => ({
  user: null,
  session: null,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    try {
      // 获取当前会话
      const {
        data: { session },
      } = await supabase.auth.getSession();

      set({
        user: session?.user || null,
        session,
        isLoading: false,
        isInitialized: true,
      });

      // 监听认证状态变化
      supabase.auth.onAuthStateChange(
        (_event: AuthChangeEvent, session: Session | null) => {
          set({
            user: session?.user || null,
            session,
            isLoading: false,
          });
        },
      );
    } catch (err) {
      console.error("Auth initialization error:", err);
      set({
        user: null,
        session: null,
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  signInWithGithub: async () => {
    try {
      set({ isLoading: true });
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: typeof window !== "undefined" ? window.location.href : "",
        },
      });

      // 如果有错误，立即停止 loading
      if (error) {
        set({ isLoading: false });
        return { error };
      }

      // 如果没有错误，保持 loading 状态
      // 页面会重定向到 GitHub，然后重定向回来
      // loading 状态会在页面重新加载后通过 initialize() 重置
      return { error };
    } catch (error) {
      set({ isLoading: false });
      return { error };
    }
  },

  signInWithEmailOTP: async (email: string) => {
    try {
      set({ isLoading: true });
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo:
            typeof window !== "undefined" ? window.location.href : "",
        },
      });

      if (error) {
        set({ isLoading: false });
        return { error };
      }

      // 发送成功，停止 loading
      set({ isLoading: false });
      return { error };
    } catch (error) {
      set({ isLoading: false });
      return { error };
    }
  },

  verifyEmailOTP: async (email: string, token: string) => {
    try {
      set({ isLoading: true });
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });

      if (error) {
        set({ isLoading: false });
        return { error };
      }

      // 验证成功，用户状态会通过 auth state change 自动更新
      set({ isLoading: false });
      return { error };
    } catch (error) {
      set({ isLoading: false });
      return { error };
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true });
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error };
    } finally {
      set({ isLoading: false });
    }
  },
}));
