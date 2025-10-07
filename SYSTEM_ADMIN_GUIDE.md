# SYSTEM_ADMIN 권한 가이드

## 개요

SYSTEM_ADMIN은 모든 브랜드의 시스템 전체를 관리할 수 있는 최상위 권한입니다. 환경변수를 통해 관리되며, DB 수정 없이 빠르게 권한을 부여하거나 회수할 수 있습니다.

## 권한 계층

```
SYSTEM_ADMIN (최상위)
    ↓ (모든 권한 포함)
ADMIN (브랜드별)
    ↓
USER (일반 사용자)
```

## 설정 방법

### 1. 환경변수 설정

`.env` 또는 `.env.local` 파일에 다음과 같이 설정합니다:

```bash
# 단일 관리자
SYSTEM_ADMIN_EMAILS="admin@example.com"

# 복수 관리자 (쉼표로 구분)
SYSTEM_ADMIN_EMAILS="admin1@example.com,admin2@example.com,admin3@example.com"
```

**특징:**

- 쉼표(`,`)로 구분하여 여러 이메일 설정 가능
- 공백은 자동으로 제거됨
- 대소문자 구분 없이 체크됨

### 2. 프로덕션 환경 설정

Vercel, AWS 등의 호스팅 플랫폼에서 환경변수를 직접 설정하세요.

**⚠️ 보안 주의사항:**

- `.env` 파일은 절대 git에 커밋하지 않습니다
- 프로덕션 환경에서는 플랫폼의 환경변수 관리 기능을 사용하세요
- 민감한 이메일 정보가 포함되어 있으므로 접근을 제한하세요

## 권한 매트릭스

| 기능                           | USER | ADMIN | SYSTEM_ADMIN |
| ------------------------------ | ---- | ----- | ------------ |
| 본인 프로필 조회/수정          | ✅   | ✅    | ✅           |
| 본인 펀드 정보 조회            | ✅   | ✅    | ✅           |
| 펀드 멤버 관리 (해당 브랜드)   | ❌   | ✅    | ✅           |
| 문서 생성/업로드 (해당 브랜드) | ❌   | ✅    | ✅           |
| 펀드 생성/수정 (해당 브랜드)   | ❌   | ✅    | ✅           |
| **모든 브랜드 접근**           | ❌   | ❌    | ✅           |
| **템플릿 전역 관리**           | ❌   | ❌    | ✅           |
| **브랜드 설정 변경**           | ❌   | ❌    | ✅           |
| **시스템 통계 조회**           | ❌   | ❌    | ✅           |

## 사용 방법

### 클라이언트 컴포넌트에서

```typescript
import { checkAdminAccess } from '@/lib/auth/admin';
import { isSystemAdmin } from '@/lib/auth/system-admin';

// 일반 관리자 권한 체크 (SYSTEM_ADMIN 포함)
const { isAdmin, user } = await checkAdminAccess();

if (isAdmin) {
  // ADMIN 또는 SYSTEM_ADMIN 권한이 있는 경우
}

// SYSTEM_ADMIN 전용 체크
if (isSystemAdmin(user)) {
  // SYSTEM_ADMIN만 접근 가능
}
```

### 서버 컴포넌트/API 라우트에서

```typescript
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { requireSystemAdmin } from '@/lib/auth/system-admin';

// 일반 관리자 권한 체크 (SYSTEM_ADMIN 포함)
export async function GET(request: NextRequest) {
  const { user, profile } = await validateAdminAuth(request);

  // ADMIN 또는 SYSTEM_ADMIN 권한이 있는 경우
  // ...
}

// SYSTEM_ADMIN 전용 API
export async function PUT(request: NextRequest) {
  const { user } = await validateAdminAuth(request);

  // SYSTEM_ADMIN만 접근 가능
  if (!requireSystemAdmin(user)) {
    return NextResponse.json(
      { error: '시스템 관리자 권한이 필요합니다' },
      { status: 403 }
    );
  }

  // 시스템 전역 작업 수행
  // ...
}
```

## API 함수

### `lib/auth/system-admin.ts`

#### `isSystemAdminEmail(email: string | undefined | null): boolean`

이메일이 시스템 관리자인지 확인합니다.

```typescript
if (isSystemAdminEmail('admin@example.com')) {
  console.log('시스템 관리자 이메일입니다');
}
```

#### `isSystemAdmin(user: User | null): boolean`

사용자가 시스템 관리자인지 확인합니다.

```typescript
const user = await supabase.auth.getUser();
if (isSystemAdmin(user)) {
  console.log('시스템 관리자입니다');
}
```

#### `requireSystemAdmin(user: User | null): boolean`

시스템 관리자 전용 권한이 필요한 작업에 사용합니다. (`isSystemAdmin`의 별칭)

```typescript
if (!requireSystemAdmin(user)) {
  throw new Error('시스템 관리자 권한이 필요합니다');
}
```

#### `getSystemAdminEmailsList(): string[]`

시스템 관리자 이메일 목록을 조회합니다. (디버깅용)

⚠️ **주의:** 프로덕션 환경에서는 보안상 조심해서 사용해야 합니다.

```typescript
const admins = getSystemAdminEmailsList();
console.log('시스템 관리자 목록:', admins);
```

## 권한 체크 흐름

### 기존 `isAdmin()` / `isAdminServer()` 함수

1. **SYSTEM_ADMIN 체크** (환경변수 기반)

   - ✅ 가장 먼저 체크됨
   - ✅ DB 조회 불필요 (빠름)
   - ✅ 모든 브랜드에 대한 권한 획득

2. **프로필 ROLE 체크** (DB 기반)

   - `profiles.role === 'ADMIN'` 확인
   - 해당 브랜드에 대한 권한만 가짐

3. **profile_permissions 체크** (DB 기반)
   - 다른 프로필에 대한 admin 권한 확인
   - 위임받은 권한

## 향후 SYSTEM_ADMIN 전용 기능 (예정)

### 1. 템플릿 전역 관리

- `document_templates` 테이블 관리
- 모든 브랜드에 적용되는 템플릿 수정

### 2. 브랜드 설정 관리

- 브랜드별 설정 값 변경
- 새로운 브랜드 추가/삭제

### 3. 시스템 통계 및 모니터링

- 모든 브랜드의 통합 통계 조회
- 시스템 전체 사용량 모니터링

### 4. 사용자 권한 관리

- 일반 ADMIN 권한 부여/회수
- 사용자 계정 관리

### 5. 감사 로그 (Audit Log)

- 모든 중요 작업에 대한 로그 조회
- 권한 변경 이력 추적

## 예시 시나리오

### 시나리오 1: 템플릿 수정

```typescript
// app/api/admin/templates/[templateId]/route.ts
export async function PUT(request: NextRequest, { params }: any) {
  const { user } = await validateAdminAuth(request);

  // SYSTEM_ADMIN만 템플릿 수정 가능
  if (!requireSystemAdmin(user)) {
    return NextResponse.json(
      { error: '시스템 관리자 권한이 필요합니다' },
      { status: 403 }
    );
  }

  // 템플릿 수정 로직
  // ...
}
```

### 시나리오 2: 모든 브랜드 통계 조회

```typescript
// app/api/admin/stats/all-brands/route.ts
export async function GET(request: NextRequest) {
  const { user } = await validateAdminAuth(request);

  if (!requireSystemAdmin(user)) {
    return NextResponse.json(
      { error: '시스템 관리자 권한이 필요합니다' },
      { status: 403 }
    );
  }

  // 모든 브랜드 데이터 조회 (brand 필터 없이)
  const allBrandsData = await fetchAllBrandsStatistics();

  return NextResponse.json({ data: allBrandsData });
}
```

## 테스트

### 로컬 환경에서 테스트

1. `.env.local` 파일에 본인 이메일 추가:

   ```bash
   SYSTEM_ADMIN_EMAILS="your-email@example.com"
   ```

2. 서버 재시작:

   ```bash
   npm run dev
   ```

3. 관리자 페이지에 접속하여 권한 확인

### 권한 확인 로그

권한 체크 시 콘솔에 다음과 같은 로그가 출력됩니다:

```
[isAdmin] SYSTEM_ADMIN 권한으로 접근: admin@example.com
```

또는

```
[isAdminServer] SYSTEM_ADMIN 권한으로 접근: admin@example.com
```

## FAQ

### Q1. SYSTEM_ADMIN과 ADMIN의 차이는?

- **ADMIN**: 특정 브랜드의 관리자. DB에 저장되며, 해당 브랜드의 데이터만 관리 가능
- **SYSTEM_ADMIN**: 모든 브랜드의 시스템 관리자. 환경변수로 관리되며, 모든 브랜드 접근 가능

### Q2. SYSTEM_ADMIN을 즉시 제거하려면?

환경변수에서 해당 이메일을 삭제하고 서버를 재시작하면 즉시 권한이 회수됩니다.

### Q3. 여러 명의 SYSTEM_ADMIN을 둘 수 있나요?

네, 쉼표로 구분하여 여러 이메일을 설정할 수 있습니다.

### Q4. SYSTEM_ADMIN 권한이 DB에 기록되나요?

아니요. 환경변수로만 관리되므로 DB에는 기록되지 않습니다. 다만, SYSTEM_ADMIN이 수행한 작업(문서 수정, 멤버 관리 등)은 로그로 남습니다.

### Q5. 성능에 영향이 있나요?

SYSTEM_ADMIN 체크는 환경변수만 읽으므로 DB 조회가 없어 오히려 더 빠릅니다. 권한 체크 순서가 SYSTEM_ADMIN → ADMIN 순이므로, SYSTEM_ADMIN 사용자는 DB 조회 없이 즉시 권한이 확인됩니다.

## 마이그레이션 노트

### 하위 호환성

기존 ADMIN 사용자는 아무런 영향을 받지 않습니다. 모든 기존 권한 체크 로직이 그대로 동작합니다.

### 롤백

환경변수에서 `SYSTEM_ADMIN_EMAILS`를 제거하거나 빈 문자열로 설정하면 SYSTEM_ADMIN 기능이 비활성화됩니다.

## 보안 권장사항

1. ✅ SYSTEM_ADMIN은 최소한의 인원으로 제한하세요
2. ✅ 프로덕션 환경변수는 플랫폼의 보안 기능을 사용하세요
3. ✅ SYSTEM_ADMIN 권한으로 수행한 중요 작업은 로그로 남기세요
4. ✅ 정기적으로 SYSTEM_ADMIN 목록을 검토하세요
5. ✅ 퇴사자나 권한이 변경된 사용자는 즉시 목록에서 제거하세요

## 참고 파일

- `lib/auth/system-admin.ts` - SYSTEM_ADMIN 유틸리티 함수
- `lib/auth/admin.ts` - 클라이언트용 권한 체크
- `lib/auth/admin-server.ts` - 서버용 권한 체크
- `env.example` - 환경변수 예시
- `types/database.ts` - 타입 정의
