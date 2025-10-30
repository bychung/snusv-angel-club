-- 057_rename_member_id_to_profile_id.sql
-- assembly_documents와 fund_documents 테이블의 member_id를 profile_id로 리네임
-- 실제로는 profiles.id를 참조하므로 컬럼명을 의미에 맞게 변경

-- 1. assembly_documents.member_id → profile_id
ALTER TABLE assembly_documents 
RENAME COLUMN member_id TO profile_id;

-- 2. fund_documents.member_id → profile_id  
ALTER TABLE fund_documents 
RENAME COLUMN member_id TO profile_id;

-- 3. 코멘트 추가 (의미 명확화)
COMMENT ON COLUMN assembly_documents.profile_id IS '개별 문서의 경우 조합원의 프로필 ID (profiles.id)';
COMMENT ON COLUMN fund_documents.profile_id IS '개별 문서의 경우 조합원의 프로필 ID (profiles.id)';

