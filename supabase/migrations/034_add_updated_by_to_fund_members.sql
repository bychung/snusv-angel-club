-- Migration: Add updated_by to fund_members
-- Description: 
-- Add updated_by column to fund_members table to track who made the last update
-- This helps distinguish between self-updates and admin updates

-- Step 1: Add updated_by column to fund_members table (nullable)
ALTER TABLE fund_members 
ADD COLUMN updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN fund_members.updated_by IS '최종 수정자 프로필 ID (Last updated by profile ID)';

-- Step 2: Create index on updated_by for performance
CREATE INDEX IF NOT EXISTS idx_fund_members_updated_by ON fund_members(updated_by);

-- Note: Existing records will have NULL for updated_by
-- New updates should set this field to the profile ID of the user making the update

