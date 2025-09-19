-- Add dissolved_at column to funds table
-- Created: 2025-09-19  
-- Description: Adds dissolved_at (만기일) column to funds table for term management

-- Add dissolved_at column to funds table (펀드 만기일)
ALTER TABLE funds ADD COLUMN IF NOT EXISTS dissolved_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN funds.dissolved_at IS '펀드 만기일';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_funds_dissolved_at ON funds(dissolved_at);
