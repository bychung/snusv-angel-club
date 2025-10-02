i-- Migration: Create fund_member_changes table for audit trail
-- Description: 
-- Create a comprehensive audit log table to track all changes to fund_members
-- This enables complete history tracking and rollback capabilities

-- Step 1: Create fund_member_changes table
CREATE TABLE IF NOT EXISTS fund_member_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_member_id UUID NOT NULL,
  changed_by UUID,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  brand TEXT NOT NULL,
  
  CONSTRAINT fund_member_changes_field_check 
    CHECK (field_name IN ('investment_units', 'total_units', 'both'))
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fund_member_changes_fund_member_id 
  ON fund_member_changes(fund_member_id);

CREATE INDEX IF NOT EXISTS idx_fund_member_changes_changed_at 
  ON fund_member_changes(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_fund_member_changes_changed_by 
  ON fund_member_changes(changed_by);

CREATE INDEX IF NOT EXISTS idx_fund_member_changes_brand 
  ON fund_member_changes(brand);

-- Composite index for recent activity queries (optimized for brand-based queries)
CREATE INDEX IF NOT EXISTS idx_fund_member_changes_brand_changed_at 
  ON fund_member_changes(brand, changed_at DESC);

-- Step 3: Add comments for documentation
COMMENT ON TABLE fund_member_changes IS '펀드 조합원 정보 변경 이력 테이블 (감사 로그)';
COMMENT ON COLUMN fund_member_changes.fund_member_id IS '변경된 fund_members 레코드 ID (외래 키 없음)';
COMMENT ON COLUMN fund_member_changes.changed_by IS '수정자 프로필 ID (외래 키 없음, NULL = 시스템/본인)';
COMMENT ON COLUMN fund_member_changes.field_name IS '변경된 필드명 (investment_units, total_units, both)';
COMMENT ON COLUMN fund_member_changes.old_value IS '이전 값 (단일 필드: 숫자 문자열, 복수 필드: JSON 문자열)';
COMMENT ON COLUMN fund_member_changes.new_value IS '새 값 (단일 필드: 숫자 문자열, 복수 필드: JSON 문자열)';
COMMENT ON COLUMN fund_member_changes.changed_at IS '변경 시각';
COMMENT ON COLUMN fund_member_changes.brand IS '브랜드 구분';

-- Note:
-- - No foreign key constraints to avoid query ambiguity and ensure history preservation
-- - Even if fund_members or profiles are deleted, history is retained
-- - Application layer is responsible for maintaining data consistency

