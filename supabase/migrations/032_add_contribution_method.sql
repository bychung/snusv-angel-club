-- Add payment_schedule to funds table
-- Created: 2025-10-02
-- Description: Adds payment_schedule (출자방식) column to funds table to distinguish between lump sum and capital call contributions

-- Create payment_schedule enum
CREATE TYPE payment_schedule AS ENUM ('lump_sum', 'capital_call');

-- Add payment_schedule column to funds table
ALTER TABLE funds 
ADD COLUMN payment_schedule payment_schedule NOT NULL DEFAULT 'lump_sum';

-- Add comment for documentation
COMMENT ON COLUMN funds.payment_schedule IS '출자방식 - lump_sum: 일시납, capital_call: 수시납';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_funds_payment_schedule ON funds(payment_schedule);

