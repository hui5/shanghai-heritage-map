import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 数据库表类型定义
export interface FavoriteImage {
  id?: string;
  user_id: string;
  image_url: string;
  thumbnail?: string;
  title?: string;
  description?: string;
  ref?: string;
  category: string;
  location_name: string;
  location_info?: any; // JSON 存储位置信息
  favorite_id: string;
  tags?: string[];
  timestamp: number;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    user_name?: string; // GitHub username
    avatar_url?: string;
  };
  created_at?: string;
}
