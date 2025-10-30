-- 개별 문서 지원을 위한 유니크 제약 수정
-- 기존: (fund_id, type, version_number) 유니크 → 개별 문서 저장 불가
-- 수정: parent_document_id가 NULL인 경우만 유니크 제약 적용

-- 1. 기존 유니크 제약 삭제
ALTER TABLE fund_documents 
DROP CONSTRAINT IF EXISTS fund_documents_fund_type_version_unique;

-- 2. 조건부 유니크 인덱스 생성
-- parent_document_id가 NULL인 경우만 (fund_id, type, version_number) 유니크 적용
-- 이렇게 하면:
--   - 일반 문서 (LPA, 설립계획서 등): 펀드+타입+버전당 1개만 존재 가능 ✓
--   - 통합 문서 (is_split_parent = true): 펀드+타입+버전당 1개만 존재 가능 ✓
--   - 개별 문서 (parent_document_id 있음): 같은 버전에 여러 개 가능 ✓
CREATE UNIQUE INDEX fund_documents_fund_type_version_unique
ON fund_documents(fund_id, type, version_number)
WHERE parent_document_id IS NULL;

-- 설명 추가
COMMENT ON INDEX fund_documents_fund_type_version_unique IS 
'부모 문서만 (fund_id, type, version_number) 유니크 제약 적용. 개별 문서(parent_document_id 있음)는 여러 개 허용';

