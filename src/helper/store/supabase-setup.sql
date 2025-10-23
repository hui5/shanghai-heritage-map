-- 创建收藏表
CREATE TABLE IF NOT EXISTS favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail TEXT,
  title TEXT,
  description TEXT,
  category TEXT NOT NULL,
  location_name TEXT NOT NULL,
  location_info JSONB,
  favorite_id TEXT NOT NULL,
  tags TEXT[],
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 确保每个用户的 favorite_id 是唯一的
  UNIQUE(user_id, favorite_id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_category ON favorites(category);
CREATE INDEX IF NOT EXISTS idx_favorites_timestamp ON favorites(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_favorite_id ON favorites(favorite_id);

-- 启用行级安全策略
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能访问自己的收藏
CREATE POLICY "Users can view their own favorites" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites" ON favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorites" ON favorites
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" ON favorites
  FOR DELETE USING (auth.uid() = user_id);

-- 创建更新 updated_at 的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 为 favorites 表创建触发器
CREATE TRIGGER update_favorites_updated_at
  BEFORE UPDATE ON favorites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
