-- 004: Check for email duplicates before applying unique constraint
-- Created: 2024-01-02
-- Description: This is a safety check to identify potential email duplicates before migration 005

-- This query will help identify any duplicate emails in the profiles table
-- Run this BEFORE running migration 005 to ensure no conflicts

DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    -- Check for duplicate emails
    SELECT COUNT(*)
    INTO duplicate_count
    FROM (
        SELECT email, COUNT(*) as count
        FROM profiles
        GROUP BY email
        HAVING COUNT(*) > 1
    ) duplicates;
    
    -- If duplicates exist, raise an exception
    IF duplicate_count > 0 THEN
        RAISE EXCEPTION 'Found % email duplicates. Please resolve these before applying unique constraint:', duplicate_count;
    ELSE
        RAISE NOTICE 'No email duplicates found. Safe to apply unique constraint.';
    END IF;
END $$;
