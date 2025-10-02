-- Migration: Add min_units to funds table
-- Description: 최소 출자좌수(min_units) 컬럼 추가
-- Date: 2025-10-02

-- Step 1: Add min_units column to funds table (nullable first)
ALTER TABLE funds 
ADD COLUMN min_units INTEGER;

COMMENT ON COLUMN funds.min_units IS '최소 출자좌수 (Minimum investment units required)';

-- Step 2: Update all existing funds to set min_units to 1 (default)
UPDATE funds 
SET min_units = 1
WHERE min_units IS NULL;

-- Step 3: Now make the column NOT NULL with default value of 1
ALTER TABLE funds 
ALTER COLUMN min_units SET NOT NULL,
ALTER COLUMN min_units SET DEFAULT 1;

-- Step 4: Add constraint to ensure min_units >= 1
ALTER TABLE funds 
ADD CONSTRAINT funds_min_units_positive 
CHECK (min_units >= 1);

-- Step 5: Create index on min_units for performance  
CREATE INDEX IF NOT EXISTS idx_funds_min_units ON funds(min_units);

