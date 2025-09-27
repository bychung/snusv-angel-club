-- Migration: Add par_value to funds and total_units to fund_members
-- Description: 
-- 1. Add par_value (좌당가격) column to funds table with default 1,000,000 KRW
-- 2. Remove total_amount generated column from fund_members table  
-- 3. Add total_units (약정출자좌수) column to fund_members table
-- 4. Set default values for existing data and add necessary constraints

-- Step 1: Add par_value column to funds table
ALTER TABLE funds 
ADD COLUMN par_value BIGINT NOT NULL DEFAULT 1000000;

COMMENT ON COLUMN funds.par_value IS '좌당가격 (Price per unit in KRW)';

-- Step 2: Remove the generated total_amount column from fund_members table
ALTER TABLE fund_members 
DROP COLUMN IF EXISTS total_amount;

-- Step 3: Add total_units column to fund_members table (nullable first)
ALTER TABLE fund_members 
ADD COLUMN total_units INTEGER;

COMMENT ON COLUMN fund_members.total_units IS '약정출자좌수 (Total committed units)';

-- Step 4: Update all existing fund_members records to set total_units equal to investment_units
UPDATE fund_members 
SET total_units = investment_units 
WHERE total_units IS NULL;

-- Step 5: Now make the column NOT NULL with investment_units as effective default
ALTER TABLE fund_members 
ALTER COLUMN total_units SET NOT NULL;

-- Step 6: Add constraint to ensure total_units >= investment_units
ALTER TABLE fund_members 
ADD CONSTRAINT fund_members_total_units_gte_investment_units 
CHECK (total_units >= investment_units);

-- Step 7: Add constraint to ensure total_units > 0
ALTER TABLE fund_members 
ADD CONSTRAINT fund_members_total_units_positive 
CHECK (total_units > 0);

-- Step 8: Add constraint to ensure par_value >= 1000000  
ALTER TABLE funds 
ADD CONSTRAINT funds_par_value_positive 
CHECK (par_value >= 1000000);

-- Step 9: Create index on par_value for performance
CREATE INDEX IF NOT EXISTS idx_funds_par_value ON funds(par_value);

-- Step 10: Create index on total_units for performance  
CREATE INDEX IF NOT EXISTS idx_fund_members_total_units ON fund_members(total_units);

-- Step 11: Update schema comments for clarity
COMMENT ON TABLE funds IS '펀드 정보 테이블';
COMMENT ON TABLE fund_members IS '펀드 조합원 정보 테이블';
COMMENT ON COLUMN fund_members.investment_units IS '실제 출자좌수 (Actual invested units)';
COMMENT ON COLUMN funds.name IS '펀드명';
COMMENT ON COLUMN funds.status IS '펀드 상태 (ready/processing/applied/active/closing/closed)';
