-- 문서 템플릿 버전 관리 시스템
-- Phase 1: 템플릿 버전 관리 및 생성 문서 기록

-- 1. 템플릿 테이블 생성
CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 템플릿 식별
  type VARCHAR(50) NOT NULL,  -- 'lpa', 'plan', 'certificate' 등
  version VARCHAR(20) NOT NULL,  -- '1.0.0', '1.1.0', '2.0.0'
  
  -- 템플릿 내용
  content JSONB NOT NULL,  -- 전체 템플릿 구조 (sections 등)
  
  -- 메타데이터
  is_active BOOLEAN DEFAULT false,  -- 현재 활성 버전인지
  description TEXT,  -- 변경 사항 설명
  
  -- 브랜드
  brand VARCHAR(50) NOT NULL,
  
  -- 감사 추적
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  UNIQUE(brand, type, version)
);

-- 인덱스
CREATE INDEX idx_templates_brand_type_active ON document_templates(brand, type, is_active);
CREATE INDEX idx_templates_created_at ON document_templates(created_at DESC);

-- 2. 생성된 문서 기록 테이블 생성
CREATE TABLE IF NOT EXISTS fund_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 연관 관계
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,  -- 문서 타입 ('lpa', 'plan')
  
  -- 템플릿 추적
  template_id UUID REFERENCES document_templates(id),
  template_version VARCHAR(20) NOT NULL,
  
  -- 생성된 최종 콘텐츠 (변수 치환 완료)
  processed_content JSONB NOT NULL,
  
  -- 생성 컨텍스트 (재생성용)
  generation_context JSONB,  -- { fundSnapshot, membersCount, generatedDate 등 }
  
  -- PDF 저장 경로
  pdf_storage_path TEXT,  -- Supabase Storage 경로
  
  -- 브랜드
  brand VARCHAR(50) NOT NULL,
  
  -- 감사 추적
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES profiles(id),
  
  UNIQUE(fund_id, type)  -- 펀드당 타입별 최신 1개만 유지
);

-- 인덱스
CREATE INDEX idx_fund_docs_fund ON fund_documents(fund_id, type);
CREATE INDEX idx_fund_docs_brand ON fund_documents(brand);
CREATE INDEX idx_fund_docs_generated ON fund_documents(generated_at DESC);

-- 3. 코멘트 추가
COMMENT ON TABLE document_templates IS '문서 템플릿 버전 관리 테이블 (LPA, 결성계획서 등)';
COMMENT ON TABLE fund_documents IS '펀드별 생성된 문서 기록 테이블';

COMMENT ON COLUMN document_templates.type IS '문서 유형: lpa, plan, certificate 등';
COMMENT ON COLUMN document_templates.version IS '템플릿 버전 (시맨틱 버저닝)';
COMMENT ON COLUMN document_templates.content IS '템플릿 전체 구조 (JSONB)';
COMMENT ON COLUMN document_templates.is_active IS '현재 활성 템플릿 여부 (type당 1개만 true)';

COMMENT ON COLUMN fund_documents.processed_content IS '변수 치환이 완료된 최종 문서 내용';
COMMENT ON COLUMN fund_documents.generation_context IS '재생성을 위한 컨텍스트 정보';
COMMENT ON COLUMN fund_documents.pdf_storage_path IS 'Supabase Storage에 저장된 PDF 경로';

