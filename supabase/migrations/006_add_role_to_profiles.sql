-- Add role column to profiles table
-- Created: 2025-09-12
-- Description: Adds role enum column to support admin/user roles

-- Create role enum type
CREATE TYPE user_role AS ENUM ('ADMIN', 'USER');

-- Add role column to profiles table with default value
ALTER TABLE profiles
ADD COLUMN role user_role DEFAULT 'USER' NOT NULL;

-- Create index on role column for faster admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Add comment for clarity
COMMENT ON COLUMN profiles.role IS 'User role: ADMIN for administrators, USER for regular users';
