-- Add fund dates (closed_at and registered_at) to funds table
-- Created: 2025-09-19
-- Description: Adds closed_at (결성일) and registered_at (등록일) columns to funds table for better date management

-- Add closed_at column to funds table (펀드 결성일)
ALTER TABLE funds ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Add registered_at column to funds table (펀드 등록일) 
ALTER TABLE funds ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN funds.closed_at IS '펀드 결성일 - 실제 펀드가 결성된 날짜';
COMMENT ON COLUMN funds.registered_at IS '펀드 등록일 - 펀드가 공식적으로 등록된 날짜';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_funds_closed_at ON funds(closed_at);
CREATE INDEX IF NOT EXISTS idx_funds_registered_at ON funds(registered_at);
