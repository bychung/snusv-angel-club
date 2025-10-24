-- 개별 문서 지원을 위한 유니크 제약 수정
-- 기존: (assembly_id, type) 유니크 → 개별 문서 저장 불가
-- 수정: parent_document_id가 NULL인 경우만 유니크 제약 적용

-- 1. 기존 유니크 제약 삭제
ALTER TABLE assembly_documents 
DROP CONSTRAINT IF EXISTS assembly_documents_assembly_id_type_key;

-- 2. 조건부 유니크 인덱스 생성
-- parent_document_id가 NULL인 경우만 (assembly_id, type) 유니크 적용
-- 이렇게 하면:
--   - 일반 문서 (의안, 의사록 등): 1개만 존재 가능 ✓
--   - 통합 문서 (is_split_parent = true): 1개만 존재 가능 ✓
--   - 개별 문서 (parent_document_id 있음): 여러 개 가능 ✓
CREATE UNIQUE INDEX assembly_documents_assembly_id_type_unique
ON assembly_documents(assembly_id, type)
WHERE parent_document_id IS NULL;

-- 설명 추가
COMMENT ON INDEX assembly_documents_assembly_id_type_unique IS 
'부모 문서만 (assembly_id, type) 유니크 제약 적용. 개별 문서(parent_document_id 있음)는 여러 개 허용';

