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
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
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

  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true });
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error };
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email: string, password: string) => {
    try {
      set({ isLoading: true });
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error };
    } finally {
      set({ isLoading: false });
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

  resetPassword: async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return { error };
    } catch (error) {
      return { error };
    }
  },
}));
