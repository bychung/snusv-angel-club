-- Migration: Allow zero investment_units
-- Description: 
-- investment_units를 0으로 허용하도록 CHECK 제약 조건 변경
-- 약정출자 후 실제 납입 전까지는 investment_units가 0일 수 있음

-- Step 1: 기존의 investment_units > 0 제약 조건 제거
-- 001_initial_schema.sql에서 생성된 제약 조건은 테이블 레벨이 아닌 컬럼 레벨이므로
-- 제약 조건 이름을 확인하고 삭제해야 함

-- 제약 조건 이름 찾기 (fund_members_investment_units_check)
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN
    -- investment_units > 0 제약 조건 찾기
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'fund_members'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%investment_units > 0%';
    
    -- 제약 조건이 존재하면 삭제
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE fund_members DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No constraint with investment_units > 0 found';
    END IF;
END $$;

-- Step 2: 새로운 제약 조건 추가 (investment_units >= 0)
ALTER TABLE fund_members 
ADD CONSTRAINT fund_members_investment_units_non_negative 
CHECK (investment_units >= 0);

COMMENT ON CONSTRAINT fund_members_investment_units_non_negative ON fund_members 
IS '출자좌수는 0 이상이어야 함 (0 = 미납입)';

-- Step 3: total_units > 0 제약 조건도 확인 및 업데이트
-- 026_add_par_value_and_total_units.sql에서 생성된 제약 조건
-- total_units는 최소 1 이상이어야 하므로 그대로 유지
-- (약정출자좌수는 항상 1 이상이어야 함)

-- Step 4: total_units >= investment_units 제약 조건 유지
-- 이미 026_add_par_value_and_total_units.sql에서 생성되었으므로 변경 불필요

-- 기존 데이터 확인 쿼리 (참고용)
-- SELECT id, investment_units, total_units 
-- FROM fund_members 
-- WHERE investment_units = 0 OR investment_units < 0;

