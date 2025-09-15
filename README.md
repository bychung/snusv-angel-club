# SNUSV ANGEL CLUB - 펀드 출자 조합원 정보 수집 플랫폼

## 📋 프로젝트 개요

벤처 펀드(프로펠-SNUSV엔젤투자조합2호)에 출자할 조합원들의 정보를 수집하기 위한 설문조사 플랫폼입니다.

## 🚀 Phase 1 구현 완료

### 구현된 기능

- ✅ Next.js 프로젝트 초기 설정 (TypeScript, Tailwind CSS, shadcn/ui)
- ✅ Zustand를 이용한 상태 관리
- ✅ 설문조사 페이지 (1-9페이지)
  - 이름/회사명 입력
  - 출자좌수 입력
  - 전화번호 입력
  - 주소 입력
  - 이메일 입력
  - 개인/법인 선택
  - 생년월일 입력 (개인)
  - 사업자번호 입력 (법인)
  - 제출 완료 페이지
- ✅ 로컬스토리지 자동 저장 (24시간 유지)
- ✅ DB Upsert 로직 (전화번호 기준 중복 처리)
- ✅ 반응형 디자인 (모바일 최적화)
- ✅ 기본 홈페이지

## 🛠️ 기술 스택

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Database**: Supabase (마이그레이션 시스템 활용)
- **Deployment**: Vercel (예정)

## 📦 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 아래 내용을 입력하세요:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key_here
```

### 3. Supabase 데이터베이스 설정

마이그레이션을 통해 데이터베이스를 설정합니다:

```bash
npm run db:migrate
```

마이그레이션이 완료되면 고정된 펀드 ID(`550e8400-e29b-41d4-a716-446655440000`)가 자동으로 생성됩니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3005](http://localhost:3005)으로 접속

## 📁 프로젝트 구조

```
snusv-angel-club/
├── app/
│   ├── layout.tsx            # 루트 레이아웃 (AuthProvider 포함)
│   ├── page.tsx              # 홈페이지
│   ├── login/
│   │   └── page.tsx          # 로그인 페이지
│   ├── signup/
│   │   └── page.tsx          # 회원가입 페이지
│   ├── signup-complete/
│   │   └── page.tsx          # 회원가입 완료 페이지
│   ├── dashboard/
│   │   └── page.tsx          # 대시보드 페이지
│   └── survey/
│       └── page.tsx      # 설문조사 페이지
├── components/
│   ├── ui/                   # shadcn/ui 컴포넌트
│   ├── auth/                 # 인증 관련 컴포넌트
│   │   ├── AuthProvider.tsx  # 인증 상태 제공자
│   │   ├── LoginForm.tsx     # 로그인 폼
│   │   └── SignupForm.tsx    # 회원가입 폼
│   ├── dashboard/            # 대시보드 컴포넌트
│   │   ├── DashboardLayout.tsx   # 대시보드 레이아웃
│   │   ├── ProfileSection.tsx    # 프로필 섹션
│   │   └── FundSection.tsx       # 펀드 정보 섹션
│   └── survey/
│       ├── SurveyContainer.tsx   # 메인 설문 컨테이너
│       ├── SurveyNavigation.tsx  # 네비게이션
│       ├── SurveyProgress.tsx    # 진행률 표시
│       └── inputs/               # 인풋 컴포넌트들
│           ├── TextInput.tsx
│           ├── NumberInput.tsx
│           ├── PhoneInput.tsx
│           ├── EmailInput.tsx
│           ├── BirthDateInput.tsx
│           ├── BusinessNumberInput.tsx
│           └── RadioSelect.tsx
├── lib/
│   └── supabase/
│       └── client.ts         # Supabase 클라이언트
├── store/
│   ├── surveyStore.ts        # 설문 상태 관리
│   └── authStore.ts          # 인증 상태 관리
├── types/
│   ├── survey.ts             # 설문 관련 타입
│   └── database.ts           # DB 스키마 타입
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # 초기 DB 스키마
└── scripts/
    └── check-fund.sql        # 유틸리티 SQL
```

## 🔑 주요 기능

### 1. 설문조사 플로우

1. 기본 정보 입력 (이름, 출자좌수, 연락처, 주소, 이메일)
2. 개인/법인 구분
3. 조건부 페이지 (개인: 생년월일, 법인: 사업자번호)
4. 제출 및 회원가입 선택

### 2. 인증 시스템

- **로그인**: 이메일/패스워드, OAuth (Google, Kakao)
- **회원가입**: 설문 완료 후 간편 회원가입
- **인증 상태**: 전역 상태 관리 (AuthStore)

### 3. 대시보드

- **프로필 관리**: 개인정보 조회 및 수정
- **펀드 정보**: 투자 정보 조회 및 수정
- **실시간 업데이트**: 변경사항 즉시 반영

### 4. 데이터 저장

- **임시 저장**: 브라우저 로컬스토리지 (24시간 유지)
- **영구 저장**: Supabase 데이터베이스 (전화번호 기준 upsert)
- **사용자 연동**: 회원가입 시 기존 설문 데이터와 자동 연결

### 5. 관리자 기능

- **권한 관리**: 이메일 기반 관리자 권한 체크
- **사용자 관리**: 전체 사용자 조회, 검색, 필터링
- **데이터 내보내기**: Excel/CSV 형식으로 사용자 데이터 내보내기
- **시스템 설정**: 기능 활성화/비활성화, 펀드 정보 관리
- **이메일 알림**: 설문 제출/회원가입 시 관리자 이메일 알림
- **통계 대시보드**: 실시간 사용자 통계 및 최근 활동

## ✅ Phase 2 구현 완료

### 구현된 기능

- ✅ 인증 시스템 (로그인/로그아웃/회원가입)
- ✅ 인증 상태 관리 (AuthStore)
- ✅ 대시보드 (정보 조회 및 수정)
- ✅ 프로필 수정 기능
- ✅ 펀드 투자 정보 관리
- ✅ 설문 후 회원가입 플로우

## ✅ Phase 3 구현 완료

### 구현된 기능

- ✅ OAuth 리다이렉트 처리 및 에러 핸들링
- ✅ 관리자 페이지 (권한 기반 접근 제어)
- ✅ 사용자 목록 및 관리 (검색, 필터링)
- ✅ 데이터 내보내기 (Excel/CSV)
- ✅ 실시간 통계 대시보드
- ✅ 이메일 알림 시스템 (설정 가능)
- ✅ 시스템 설정 및 관리

## 🚧 향후 구현 예정 (Phase 4)

- [ ] OAuth 실제 연동 및 테스트 (Google, Kakao)
- [ ] 고급 에러 처리 및 사용자 친화적 에러 페이지
- [ ] 성능 최적화 및 캐싱
- [ ] 테스트 코드 작성
- [ ] SEO 최적화

## 📝 참고사항

### Supabase 설정

- Google/Kakao OAuth 설정이 필요한 경우 Supabase Dashboard > Authentication > Providers에서 설정
- RLS(Row Level Security)는 현재 비활성화 상태 (필요시 schema.sql의 주석 해제)

### 배포

- Vercel 배포 시 환경변수를 Settings > Environment Variables에 추가
- 커스텀 도메인 연결 가능

## 🐛 문제 해결

### 일반적인 문제들

1. **Supabase 연결 오류**: 환경변수가 올바르게 설정되었는지 확인
2. **제출 실패**: 데이터베이스 스키마가 올바르게 생성되었는지 확인
3. **로컬스토리지 오류**: 브라우저의 개인정보 보호 모드에서는 작동하지 않을 수 있음

## 📄 라이센스

Private Project - All Rights Reserved
