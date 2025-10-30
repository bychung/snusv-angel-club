-- fund_documents 테이블에 개별 문서 지원 필드 추가
-- LPA 규약 동의서 개별 PDF 생성 지원

-- 신규 컬럼 추가
ALTER TABLE fund_documents
ADD COLUMN IF NOT EXISTS is_split_parent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_document_id UUID REFERENCES fund_documents(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES profiles(id);

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_fund_documents_parent
ON fund_documents(parent_document_id)
WHERE parent_document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fund_documents_member
ON fund_documents(member_id)
WHERE member_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fund_documents_active_version
ON fund_documents(fund_id, type, is_active, version_number);

-- 컬럼 설명 추가
COMMENT ON COLUMN fund_documents.is_split_parent IS '통합 문서 여부 (true: 통합 문서, false: 개별 문서)';
COMMENT ON COLUMN fund_documents.parent_document_id IS '개별 문서의 경우 통합 문서 ID 참조';
COMMENT ON COLUMN fund_documents.member_id IS '개별 문서의 경우 해당 조합원 profile_id';

