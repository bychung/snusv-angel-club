-- Script to set admin role for existing users
-- Run this after the migration to set initial admin users

-- Set admin role for specific emails
-- Replace these emails with actual admin emails
UPDATE profiles
SET role = 'ADMIN'
WHERE email IN (
  'by@decentier.com',
  'by@propel.kr',
  'snusv@angel-club.kr'
);

-- Verify the update
SELECT id, name, email, role
FROM profiles
WHERE role = 'ADMIN';
