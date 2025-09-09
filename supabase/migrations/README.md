# Database Migrations

이 디렉토리는 Supabase 데이터베이스 마이그레이션 파일들을 포함합니다.

## 파일 구조

- `001_initial_schema.sql` - 초기 데이터베이스 스키마 (profiles, funds, fund_members 테이블)
- `002_inquiries_tables.sql` - 문의 관련 테이블 추가
- `003_add_fund_abbreviation.sql` - 펀드 약칭 컬럼 추가
- `004_check_email_duplicates_before_migration.sql` - email 중복 체크 (005 실행 전 안전장치)
- `005_change_unique_constraint_to_email.sql` - profiles 테이블의 unique constraint를 phone에서 email로 변경

## 마이그레이션 실행

### 새 마이그레이션 적용

```bash
npm run db:migrate
```

### 마이그레이션 상태 확인

```bash
npm run db:status
```

### 스키마 차이점 확인

```bash
npm run db:diff
```

## 마이그레이션 파일 명명 규칙

- 파일명: `{순번}_{설명}.sql`
- 예시: `001_initial_schema.sql`, `002_add_user_roles.sql`

## 주의사항

- 마이그레이션 파일은 한 번 적용되면 수정하지 마세요
- 새로운 변경사항은 새 마이그레이션 파일로 생성하세요
- 프로덕션 적용 전에 반드시 백업을 수행하세요
