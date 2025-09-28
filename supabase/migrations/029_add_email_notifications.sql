-- Add email notifications functionality
-- Created: 2025-01-XX
-- Description: Adds email notification system for inquiry alerts to admin users

-- 이메일 알림 타입 ENUM 생성
CREATE TYPE email_notification_type AS ENUM (
  'startup_inquiry',      -- 스타트업 IR 문의
  'angel_inquiry',        -- 엔젤클럽 가입 문의
  'signup_inquiry'        -- 회원가입 문의
);

-- profiles 테이블에 email_notifications 컬럼 추가
ALTER TABLE profiles 
ADD COLUMN email_notifications email_notification_type[] DEFAULT '{}';

-- startup_inquiries 테이블에 contact_email 컬럼 추가 (이메일 알림을 위한 담당자 이메일)
ALTER TABLE startup_inquiries 
ADD COLUMN contact_email TEXT NOT NULL DEFAULT '';

-- 기본값 제거 (새 레코드에는 반드시 이메일이 필요)
ALTER TABLE startup_inquiries 
ALTER COLUMN contact_email DROP DEFAULT;

-- 성능 최적화를 위한 인덱스 추가
CREATE INDEX idx_profiles_email_notifications ON profiles USING GIN (email_notifications);
CREATE INDEX IF NOT EXISTS idx_startup_inquiries_contact_email ON startup_inquiries(contact_email);
