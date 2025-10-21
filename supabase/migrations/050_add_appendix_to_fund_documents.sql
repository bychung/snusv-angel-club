-- fund_documents 테이블에 appendix 컬럼 추가
-- (이후 051에서 제거됨 - 설계 변경으로 인해)

-- appendix 컬럼 추가
ALTER TABLE fund_documents
ADD COLUMN IF NOT EXISTS appendix JSONB;

-- 코멘트 추가
COMMENT ON COLUMN fund_documents.appendix IS '별지 정의 (조합원서명단, 조합원동의서 등) - 051에서 제거 예정';

