-- profile_changes와 fund_member_changes 테이블의 CHECK CONSTRAINT 제거
-- 개발 단계에서는 TypeScript 타입 체크만으로도 충분하며,
-- DB constraint는 빠른 반복 개발을 방해할 수 있음

-- profile_changes의 field_name CHECK constraint 제거
ALTER TABLE profile_changes 
  DROP CONSTRAINT IF EXISTS profile_changes_field_check;

-- fund_member_changes의 field_name CHECK constraint 제거
ALTER TABLE fund_member_changes 
  DROP CONSTRAINT IF EXISTS fund_member_changes_field_check;

-- TypeScript에서 타입이 정의되어 있으므로 코드 레벨에서 필드명 검증

