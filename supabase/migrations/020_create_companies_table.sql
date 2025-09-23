-- Create companies table for portfolio management
-- Created: 2024-01-20
-- Description: Creates companies table with basic company information and industry categories

-- 회사 테이블 생성
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  website TEXT,
  business_number TEXT UNIQUE, -- 사업자등록번호
  registration_number TEXT, -- 법인등록번호
  category TEXT[], -- 산업 카테고리 배열
  established_at DATE, -- 설립일
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- companies 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_category ON companies USING gin(category);
CREATE INDEX IF NOT EXISTS idx_companies_business_number ON companies(business_number) WHERE business_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_registration_number ON companies(registration_number) WHERE registration_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_established_at ON companies(established_at);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 코멘트 추가
COMMENT ON TABLE companies IS '포트폴리오 회사 정보';
COMMENT ON COLUMN companies.name IS '회사명';
COMMENT ON COLUMN companies.description IS '회사 설명';
COMMENT ON COLUMN companies.website IS '웹사이트 URL';
COMMENT ON COLUMN companies.business_number IS '사업자등록번호';
COMMENT ON COLUMN companies.registration_number IS '법인등록번호';
COMMENT ON COLUMN companies.category IS '산업 카테고리 배열';
COMMENT ON COLUMN companies.established_at IS '설립일';
