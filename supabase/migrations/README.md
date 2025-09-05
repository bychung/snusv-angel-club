# Database Migrations

이 디렉토리는 Supabase 데이터베이스 마이그레이션 파일들을 포함합니다.

## 파일 구조

- `001_initial_schema.sql` - 초기 데이터베이스 스키마 (profiles, funds, fund_members 테이블)

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
