-- Migration: Remove foreign key constraint from updated_by
-- Description: 
-- Remove the foreign key constraint from fund_members.updated_by
-- to avoid query relationship ambiguity issues with multiple profile references

-- Step 1: Drop the foreign key constraint
ALTER TABLE fund_members 
DROP CONSTRAINT IF EXISTS fund_members_updated_by_fkey;

-- Step 2: Update column comment
COMMENT ON COLUMN fund_members.updated_by IS '최종 수정자 프로필 ID (Last updated by profile ID) - 외래 키 없음';

-- Note: 
-- - The column remains as UUID type for storing profile IDs
-- - No referential integrity constraint for flexibility
-- - Application layer should handle validation if needed

