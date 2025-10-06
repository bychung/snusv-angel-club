-- document_templates와 fund_documents에서 brand 컬럼 제거
-- document_templates: 템플릿은 전체 브랜드 공통
-- fund_documents: fund_id를 통해 brand를 알 수 있으므로 중복

-- 1. 인덱스 먼저 삭제 (brand 컬럼 사용하는 인덱스)
DROP INDEX IF EXISTS idx_templates_brand_type_active;
DROP INDEX IF EXISTS idx_fund_docs_brand;

-- 2. document_templates에서 brand 제거 (UNIQUE 제약조건도 자동 삭제됨)
ALTER TABLE document_templates DROP COLUMN IF EXISTS brand;

-- 3. fund_documents에서 brand 제거
ALTER TABLE fund_documents DROP COLUMN IF EXISTS brand;

-- 4. document_templates에 새로운 UNIQUE 제약조건 추가 (brand 없이)
ALTER TABLE document_templates ADD CONSTRAINT document_templates_type_version_key UNIQUE(type, version);

-- 5. 새로운 인덱스 생성 (brand 제거된 버전)
CREATE INDEX idx_templates_type_active ON document_templates(type, is_active);

-- 5. 코멘트 업데이트
COMMENT ON TABLE document_templates IS '문서 템플릿 버전 관리 테이블 (전체 브랜드 공통)';
COMMENT ON TABLE fund_documents IS '펀드별 생성된 문서 기록 테이블 (fund를 통해 brand 확인)';

