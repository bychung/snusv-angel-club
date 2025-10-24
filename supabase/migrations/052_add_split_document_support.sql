-- 개별 문서 지원을 위한 컬럼 추가
-- 의안동의서와 규약동의서에서 통합 PDF + 개별 PDF를 모두 저장하기 위함

ALTER TABLE assembly_documents
ADD COLUMN is_split_parent BOOLEAN DEFAULT false,
ADD COLUMN parent_document_id UUID REFERENCES assembly_documents(id) ON DELETE CASCADE,
ADD COLUMN member_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- 인덱스 추가 (개별 문서 조회 성능 향상)
CREATE INDEX idx_assembly_documents_member_id
ON assembly_documents(member_id)
WHERE member_id IS NOT NULL;

CREATE INDEX idx_assembly_documents_parent_id
ON assembly_documents(parent_document_id)
WHERE parent_document_id IS NOT NULL;

-- 컬럼 설명 추가
COMMENT ON COLUMN assembly_documents.is_split_parent IS '통합 문서 여부 (개별 문서들의 부모)';
COMMENT ON COLUMN assembly_documents.parent_document_id IS '개별 문서의 경우 통합 문서 ID';
COMMENT ON COLUMN assembly_documents.member_id IS '개별 문서의 경우 해당 조합원 ID';

