-- 005: Change unique constraint from phone to email in profiles table
-- Created: 2024-01-02
-- Description: Changes the unique key from phone to email to support multiple profiles for the same person (individual vs corporate)

BEGIN;

-- Remove the existing unique constraint on phone
ALTER TABLE profiles DROP CONSTRAINT profiles_phone_key;

-- Add unique constraint on email
ALTER TABLE profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);

-- Update indexes
-- Remove the old phone index (it was created for uniqueness, but we still want it for search performance)
-- Keep phone index for search performance but not for uniqueness
DROP INDEX IF EXISTS idx_profiles_phone;
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);

-- Email index should already exist from initial schema, but make sure it exists
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

COMMIT;
