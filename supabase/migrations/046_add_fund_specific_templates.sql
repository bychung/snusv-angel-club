-- 펀드별 템플릿 시스템 구축
-- document_templates 테이블에 fund_id 컬럼 추가하여 펀드별 템플릿 지원

-- 1. document_templates 테이블에 fund_id 컬럼 추가
ALTER TABLE document_templates 
  ADD COLUMN fund_id UUID REFERENCES funds(id) ON DELETE CASCADE;

-- 2. 기존 UNIQUE 제약조건 삭제
ALTER TABLE document_templates 
  DROP CONSTRAINT IF EXISTS document_templates_type_version_key;

-- 3. 새로운 UNIQUE 제약조건: (type, version, fund_id)
-- fund_id가 NULL인 경우(글로벌)와 특정 펀드인 경우를 모두 고려
-- PostgreSQL에서 NULL은 UNIQUE 제약에서 서로 다른 것으로 취급되므로
-- 글로벌 템플릿 여러 버전과 펀드별 템플릿 여러 버전이 공존 가능
ALTER TABLE document_templates 
  ADD CONSTRAINT document_templates_type_version_fund_unique 
  UNIQUE (type, version, fund_id);

-- 4. 펀드별 활성 템플릿 인덱스 (성능 최적화)
CREATE INDEX idx_templates_fund_type_active 
  ON document_templates(fund_id, type, is_active)
  WHERE fund_id IS NOT NULL;

-- 5. 글로벌 템플릿 인덱스 (성능 최적화)
CREATE INDEX idx_templates_global_type_active 
  ON document_templates(type, is_active) 
  WHERE fund_id IS NULL;

-- 6. 타입별 인덱스 (버전 리스트 조회 최적화)
CREATE INDEX idx_templates_type_created 
  ON document_templates(type, created_at DESC);

-- 7. 펀드별 타입 인덱스 (펀드의 버전 리스트 조회 최적화)
CREATE INDEX idx_templates_fund_type_created 
  ON document_templates(fund_id, type, created_at DESC)
  WHERE fund_id IS NOT NULL;

-- 8. 코멘트 업데이트
COMMENT ON COLUMN document_templates.fund_id IS '펀드별 템플릿 (NULL이면 글로벌 템플릿, SYSTEM_ADMIN만 수정 가능)';
COMMENT ON TABLE document_templates IS '문서 템플릿 버전 관리 (글로벌 + 펀드별 계층 구조)';

-- 9. 기존 데이터는 fund_id가 NULL로 유지됨 (글로벌 템플릿)
-- 새로운 펀드 생성시 글로벌 템플릿을 복사하여 펀드별 템플릿 생성

