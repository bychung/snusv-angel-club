# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소에서 작업할 때 참고할 가이드입니다.

## 주요 개발 명령어

### 개발 서버

- `npm run dev` - 포트 3005에서 turbopack을 사용한 개발 서버 시작
- `npm run build` - turbopack을 사용한 프로덕션 빌드
- `npm run start` - 프로덕션 서버 시작

### 데이터베이스 관리 (Supabase)

- `npm run db:migrate` - 데이터베이스 마이그레이션 적용
- `npm run db:reset` - 데이터베이스를 초기 상태로 리셋
- `npm run db:diff` - 데이터베이스 스키마 차이점 확인
- `npm run db:status` - 마이그레이션 상태 목록 확인
- `npm run db:query` - 연결된 데이터베이스에 SQL 쿼리 실행

## 아키텍처 개요

### 기술 스택

- **프론트엔드**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **UI 컴포넌트**: Radix UI 기반의 shadcn/ui
- **상태 관리**: Zustand (설문 데이터, 인증 상태)
- **데이터베이스**: Supabase (실시간 기능이 있는 PostgreSQL)
- **인증**: Supabase Auth with OAuth (Google, Kakao)

### 주요 디렉토리

- `/app` - Next.js App Router 페이지 (layout.tsx에 AuthProvider 포함)
- `/components` - 기능별로 구성된 React 컴포넌트
  - `/ui` - shadcn/ui 기본 컴포넌트
  - `/auth` - 인증 컴포넌트 (AuthProvider, 폼)
  - `/survey` - 다단계 설문조사 폼 컴포넌트
  - `/dashboard` - 사용자 대시보드 컴포넌트
- `/store` - Zustand 스토어 (surveyStore.ts, authStore.ts)
- `/types` - TypeScript 타입 정의 (database.ts, survey.ts)
- `/lib/supabase` - 커스텀 fetch 로깅이 있는 Supabase 클라이언트 설정
- `/supabase/migrations` - 데이터베이스 스키마 마이그레이션 파일

### 상태 관리 아키텍처

- **surveyStore.ts**: localStorage 지속성(24시간)이 있는 다단계 설문조사 데이터 관리
- **authStore.ts**: 인증 상태, 사용자 프로필, OAuth 프로바이더 로그아웃 처리
- 로컬 스토리지에 설문 진행사항 자동 저장, 브라우저 새로고침에도 유지

### 데이터베이스 스키마

핵심 엔티티:

- `profiles` - 사용자 프로필 정보 (이름, 연락처, 개인/법인 구분)
- `funds` - 투자 펀드 정보
- `fund_members` - 프로필과 펀드를 투자 금액과 함께 연결
- 전화번호를 upsert 작업의 고유 식별자로 사용

### 인증 플로우

1. localStorage 지속성이 있는 익명 설문조사 완료
2. 설문 제출 후 선택적 계정 생성
3. OAuth 연동 (Google, Kakao) 및 프로바이더별 로그아웃 처리
4. 이메일 화이트리스트 기반 관리자 역할 (NEXT_PUBLIC_ADMIN_EMAILS)

### 환경 설정

필수 환경 변수 (env.example 참조):

- Supabase 연결 (URL, anon key, service key)
- 펀드 설정 (이름)
- OAuth 프로바이더 키 (Kakao)
- 역할 기반 접근을 위한 관리자 이메일 목록

### 설문조사 접근 방법

- `/survey?fund_id=<펀드ID>` 형식으로 특정 펀드에 대한 설문조사 접근
- fund_id는 URL 쿼리 파라미터로 전달되어야 함

### 특별한 기능

- **Turbopack**: 더 빠른 컴파일을 위해 개발과 빌드 모두에 사용
- **커스텀 Supabase 클라이언트**: 요청 로깅과 타임아웃 처리로 향상
- **다단계 설문조사**: 조건부 분기가 있는 9페이지 설문조사 (개인 vs 법인)
- **실시간 업데이트**: 대시보드 데이터를 위한 Supabase 실시간 구독
- **관리자 대시보드**: 사용자 관리, 데이터 내보내기 (Excel/CSV), 시스템 설정
