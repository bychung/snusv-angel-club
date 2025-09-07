-- Inquiries tables for startup IR and angel club membership
-- Created: 2024-01-02
-- Description: Creates tables for storing startup IR inquiries and angel club membership inquiries

-- startup_inquiries 테이블 생성 (스타트업 IR 문의)
CREATE TABLE IF NOT EXISTS startup_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  position TEXT NOT NULL,
  company_description TEXT NOT NULL,
  ir_deck_url TEXT, -- Supabase Storage의 파일 URL
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- angel_inquiries 테이블 생성 (엔젤클럽 가입 문의)
CREATE TABLE IF NOT EXISTS angel_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  self_introduction TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 검색 성능을 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_startup_inquiries_created_at ON startup_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_startup_inquiries_company_name ON startup_inquiries(company_name);

CREATE INDEX IF NOT EXISTS idx_angel_inquiries_created_at ON angel_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_angel_inquiries_email ON angel_inquiries(email);

-- updated_at 자동 업데이트 트리거 설정
CREATE TRIGGER update_startup_inquiries_updated_at
  BEFORE UPDATE ON startup_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_angel_inquiries_updated_at
  BEFORE UPDATE ON angel_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Supabase Storage 버킷 생성을 위한 준비 (실제 버킷은 Supabase 콘솔에서 생성)
-- 필요한 버킷: 'ir-decks' (공개 읽기 허용, 인증된 사용자만 업로드)