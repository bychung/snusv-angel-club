-- Add display_locations column to funds table
-- Created: 2025-09-28
-- Description: Adds display_locations array column to funds table for managing link display positions

-- Create enum for display locations
CREATE TYPE display_location AS ENUM ('dashboard', 'homepage');

-- Add display_locations column to funds table
ALTER TABLE funds ADD COLUMN IF NOT EXISTS display_locations display_location[];

-- Add comment for documentation
COMMENT ON COLUMN funds.display_locations IS '펀드 신청 링크를 노출할 위치 - dashboard, homepage 중 멀티 선택 가능';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_funds_display_locations ON funds USING gin(display_locations);
