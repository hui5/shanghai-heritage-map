-- 迁移脚本：为 favorites 表添加 ref 列
-- 执行日期：请在执行前记录
-- 说明：为现有的 favorites 表添加 ref 字段以支持图片引用信息

-- 1. 添加 ref 列（允许 NULL 值，因为现有数据没有 ref 信息）
ALTER TABLE favorites 
ADD COLUMN IF NOT EXISTS ref TEXT;

-- 2. 验证列是否添加成功
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'favorites' 
AND column_name = 'ref';

-- 3. 检查现有数据（可选，用于验证）
SELECT COUNT(*) as total_favorites, 
       COUNT(ref) as favorites_with_ref 
FROM favorites;

-- 4. 如果需要，可以为现有数据设置默认的 ref 值（可选）
-- UPDATE favorites 
-- SET ref = 'legacy' 
-- WHERE ref IS NULL;

-- 注意：执行此迁移前请确保：
-- 1. 备份数据库
-- 2. 在测试环境先验证
-- 3. 确认应用已更新以支持 ref 字段
