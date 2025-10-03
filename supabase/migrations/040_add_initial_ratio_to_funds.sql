-- Migration: Add initial payment ratio and duration to funds table
-- Description: 
-- 1. Add initial_numerator and initial_denominator columns to support fractional initial payment ratios
--    For example: 2/3 initial payment = numerator:2, denominator:3
--    Default is 1/1 (100% upfront = lump_sum payment)
-- 2. Add duration column for fund lifespan in years
--    Default is 5 years

-- Step 1: Add initial ratio and duration columns to funds table
ALTER TABLE funds 
  ADD COLUMN initial_numerator INTEGER DEFAULT 1 CHECK (initial_numerator > 0),
  ADD COLUMN initial_denominator INTEGER DEFAULT 1 CHECK (initial_denominator > 0),
  ADD COLUMN duration INTEGER DEFAULT 5 CHECK (duration > 0);

-- Step 2: Add comments for documentation
COMMENT ON COLUMN funds.initial_numerator IS '초기 출자 비율 분자 (예: 2/3의 2) - Initial payment ratio numerator';
COMMENT ON COLUMN funds.initial_denominator IS '초기 출자 비율 분모 (예: 2/3의 3) - Initial payment ratio denominator';
COMMENT ON COLUMN funds.duration IS '펀드 존속기간 (년) - Fund duration in years';

-- Step 3: Update existing records to default values
UPDATE funds 
SET 
  initial_numerator = 1, 
  initial_denominator = 1,
  duration = 5
WHERE initial_numerator IS NULL OR initial_denominator IS NULL OR duration IS NULL;

-- Step 4: Make columns NOT NULL after setting defaults
ALTER TABLE funds 
  ALTER COLUMN initial_numerator SET NOT NULL,
  ALTER COLUMN initial_denominator SET NOT NULL,
  ALTER COLUMN duration SET NOT NULL;

-- Usage examples:
-- Initial ratio:
--   전액 선납 (lump_sum): numerator = 1, denominator = 1
--   2/3 선납: numerator = 2, denominator = 3
--   1/2 선납: numerator = 1, denominator = 2
--
-- Duration:
--   일반적인 조합: 5년
--   장기 조합: 7년 또는 10년

-- Calculation formulas:
-- initial_cap = total_cap × (initial_numerator / initial_denominator)
-- member.initial_amount = member.total_amount × (initial_numerator / initial_denominator)


