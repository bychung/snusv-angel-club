-- Migration: Add ceo to profiles
-- Description: 법인 조합원의 대표이사명을 저장하기 위한 컬럼 추가
-- Created: 2025-10-24

-- Add ceo column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS ceo TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN profiles.ceo IS '법인 대표이사명 (법인만 해당)';

-- Create index for better query performance (optional, but recommended)
CREATE INDEX IF NOT EXISTS idx_profiles_ceo ON profiles(ceo)
WHERE ceo IS NOT NULL;

