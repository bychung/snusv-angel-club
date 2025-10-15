-- Add memo column to profiles table
-- 관리자가 프로필에 대한 메모를 작성할 수 있도록 메모 컬럼 추가

ALTER TABLE profiles ADD COLUMN memo TEXT;

