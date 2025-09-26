-- 025: Change email unique constraint to brand+email composite unique constraint
-- Created: 2025-01-XX
-- Description: Changes the unique constraint from email only to (brand, email) combination
--              This allows the same email to exist across different brands

BEGIN;

-- Remove the existing unique constraint on email only
ALTER TABLE profiles DROP CONSTRAINT profiles_email_key;

-- Add composite unique constraint on (brand, email)
ALTER TABLE profiles ADD CONSTRAINT profiles_brand_email_key UNIQUE (brand, email);

-- Update indexes for better query performance
-- Keep the existing email index for general email lookups
-- The new composite unique constraint will automatically create an index on (brand, email)

-- Optionally, you can create additional indexes if needed:
-- CREATE INDEX IF NOT EXISTS idx_profiles_brand_email ON profiles(brand, email);
-- (Note: This is redundant as the unique constraint already creates this index)

COMMIT;
