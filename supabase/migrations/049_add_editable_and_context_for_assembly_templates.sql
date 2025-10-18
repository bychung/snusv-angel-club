-- 조합원 총회 문서 템플릿 시스템 구축
-- Phase 1: document_templates에 editable 컬럼 추가
--         assembly_documents에 context 컬럼 추가

-- 1. document_templates 테이블에 editable 컬럼 추가
-- 사용자가 문서 생성 시 내용을 편집할 수 있는지 여부
ALTER TABLE document_templates
  ADD COLUMN IF NOT EXISTS editable BOOLEAN DEFAULT true;

COMMENT ON COLUMN document_templates.editable IS '사용자가 문서 생성 시 편집 가능 여부 (false면 자동 생성)';

-- 2. assembly_documents 테이블에 context 컬럼 추가
-- 자동 생성 데이터 (DB 스냅샷, 펀드명, 총회일시, 조합원 목록 등) 저장
ALTER TABLE assembly_documents
  ADD COLUMN IF NOT EXISTS context JSONB;

COMMENT ON COLUMN assembly_documents.content IS '템플릿 기반 데이터 (사용자 편집 가능)';
COMMENT ON COLUMN assembly_documents.context IS '자동 생성 데이터 (DB 스냅샷, 펀드명, 총회일시, 조합원 목록 등)';

-- 3. 인덱스 추가 (템플릿 조회 성능 최적화)
-- 글로벌 조합원 총회 템플릿 조회용
CREATE INDEX IF NOT EXISTS idx_templates_type_active_global
  ON document_templates(type, is_active)
  WHERE fund_id IS NULL;

-- 4. 기존 데이터는 editable이 NULL에서 true로 설정됨
-- 기존 규약 템플릿(lpa, plan)은 editable = true 유지


