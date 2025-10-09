-- 템플릿 테이블에 별지(appendix) 컬럼 추가
-- 별지는 규약의 말미에 추가되는 부가 문서들 (조합원서명단, 조합원동의서 등)

-- appendix 컬럼 추가
ALTER TABLE document_templates
ADD COLUMN IF NOT EXISTS appendix JSONB;

-- 코멘트 추가
COMMENT ON COLUMN document_templates.appendix IS '별지 정의 (조합원서명단, 조합원동의서 등)';

