-- fund_documents 테이블에서 appendix 컬럼 제거
-- appendix는 사용자가 수정할 수 없는 데이터이므로 document_templates에서만 관리
-- fund_documents는 사용자가 수정한 content만 저장하고, appendix는 항상 템플릿에서 가져옴

-- appendix 컬럼 삭제
ALTER TABLE fund_documents
DROP COLUMN IF EXISTS appendix;

