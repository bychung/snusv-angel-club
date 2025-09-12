-- Create signup_inquiries table for handling signup requests when email doesn't match
-- Created: 2024-01-07

CREATE TABLE IF NOT EXISTS signup_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  attempted_email TEXT NOT NULL, -- 로그인 시도한 이메일
  searched_email TEXT, -- 검색했던 이메일 (있는 경우)
  provider TEXT, -- 'google', 'kakao', 'email' 등
  inquiry_message TEXT, -- 사용자가 입력한 문의 내용
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'resolved')),
  admin_notes TEXT, -- 관리자 메모
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_signup_inquiries_user_id ON signup_inquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_signup_inquiries_status ON signup_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_signup_inquiries_created_at ON signup_inquiries(created_at);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_signup_inquiries_updated_at
  BEFORE UPDATE ON signup_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
