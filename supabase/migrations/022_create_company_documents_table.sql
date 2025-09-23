-- Create company_documents table for company-specific document management
-- Created: 2024-01-22
-- Description: Creates company_documents table and related enums for company document categories

-- -- 회사 문서 카테고리 enum 생성
-- CREATE TYPE company_document_category AS ENUM (
--   'ir_deck',              -- IR 자료
--   'pitch_deck',           -- 피치덱  
--   'business_plan',        -- 사업계획서
--   'financial_statement',  -- 재무제표
--   'audit_report',         -- 감사보고서
--   'board_minutes',        -- 이사회 의사록
--   'shareholder_agreement',-- 주주간 계약서
--   'articles_incorporation'-- 정관
-- );

-- 회사 문서 테이블 생성
CREATE TABLE company_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  -- category company_document_category NOT NULL,
  category TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- company_documents 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_company_documents_company ON company_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_company_documents_category ON company_documents(category);
CREATE INDEX IF NOT EXISTS idx_company_documents_company_category ON company_documents(company_id, category);
CREATE INDEX IF NOT EXISTS idx_company_documents_uploaded_by ON company_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_company_documents_created_at ON company_documents(created_at DESC);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_company_documents_updated_at
  BEFORE UPDATE ON company_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 코멘트 추가
COMMENT ON TABLE company_documents IS '회사별 공통 문서 관리';
COMMENT ON COLUMN company_documents.company_id IS '회사 ID';
COMMENT ON COLUMN company_documents.category IS '문서 카테고리';
COMMENT ON COLUMN company_documents.file_name IS '파일명';
COMMENT ON COLUMN company_documents.file_type IS 'MIME 타입';
COMMENT ON COLUMN company_documents.file_size IS '파일 크기 (bytes)';
COMMENT ON COLUMN company_documents.file_url IS '파일 URL';
COMMENT ON COLUMN company_documents.uploaded_by IS '업로드한 관리자 ID';

-- 회사 문서 상세 뷰 생성 (조인된 정보 포함)
CREATE VIEW company_document_details AS
SELECT 
  cd.*,
  c.name as company_name,
  c.category as company_category,
  p.name as uploader_name,
  p.email as uploader_email
FROM company_documents cd
LEFT JOIN companies c ON cd.company_id = c.id
LEFT JOIN profiles p ON cd.uploaded_by = p.id;

COMMENT ON VIEW company_document_details IS '회사 문서 상세 정보 뷰 (조인된 정보 포함)';
