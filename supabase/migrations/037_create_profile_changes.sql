-- profile_changes 테이블 생성
-- 프로필 정보 변경 이력을 추적하기 위한 테이블
-- Phase 1: 중요 필드만 추적 (role, email, phone, name)

-- 테이블 생성
CREATE TABLE profile_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  changed_by UUID,  -- 수정한 사람 (본인 또는 관리자, FK 없음 - 감사 로그용)
  field_name TEXT NOT NULL,  -- 변경된 필드명
  old_value TEXT,  -- 이전 값
  new_value TEXT,  -- 새로운 값
  changed_at TIMESTAMPTZ DEFAULT NOW(),  -- 변경 시각
  brand TEXT NOT NULL,  -- 브랜드 구분
  
  -- field_name은 중요 필드만 허용
  CONSTRAINT profile_changes_field_check 
    CHECK (field_name IN ('role', 'email', 'phone', 'name'))
);

-- 인덱스 생성
-- 특정 프로필의 변경 이력 조회용
CREATE INDEX idx_profile_changes_profile_id 
  ON profile_changes(profile_id);

-- 최근 변경 이력 조회용 (관리자 대시보드)
CREATE INDEX idx_profile_changes_changed_at 
  ON profile_changes(changed_at DESC);

-- 특정 사용자가 변경한 이력 조회용
CREATE INDEX idx_profile_changes_changed_by 
  ON profile_changes(changed_by);

-- 브랜드별 필터링용
CREATE INDEX idx_profile_changes_brand 
  ON profile_changes(brand);

-- 브랜드별 최근 변경 이력 조회용 (복합 인덱스, 가장 많이 사용될 쿼리)
CREATE INDEX idx_profile_changes_brand_changed_at 
  ON profile_changes(brand, changed_at DESC);

-- 특정 필드 변경 이력 조회용
CREATE INDEX idx_profile_changes_field_name 
  ON profile_changes(field_name);

-- 테이블 및 인덱스에 대한 설명
COMMENT ON TABLE profile_changes IS '프로필 정보 변경 이력 추적 테이블 (감사 로그)';
COMMENT ON COLUMN profile_changes.profile_id IS '변경된 프로필의 ID';
COMMENT ON COLUMN profile_changes.changed_by IS '변경한 사용자의 profile_id (본인 또는 관리자)';
COMMENT ON COLUMN profile_changes.field_name IS '변경된 필드명 (role, email, phone, name)';
COMMENT ON COLUMN profile_changes.old_value IS '변경 전 값';
COMMENT ON COLUMN profile_changes.new_value IS '변경 후 값';
COMMENT ON COLUMN profile_changes.changed_at IS '변경 시각';
COMMENT ON COLUMN profile_changes.brand IS '브랜드 구분 (snusv 또는 propel)';

