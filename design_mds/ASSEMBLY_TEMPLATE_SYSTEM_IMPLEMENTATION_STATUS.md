# 조합원 총회 문서 템플릿 시스템 구현 상태 분석

## 📊 전체 진행 상황

### ✅ 완료된 항목 (Phase 1 ~ Phase 3)

#### 1. 데이터베이스 설정 ✅

- [x] `document_templates` 테이블에 `editable` 컬럼 추가
- [x] `assembly_documents` 테이블에 `context` 컬럼 추가
- [x] 마이그레이션 파일: `049_add_editable_and_context_for_assembly_templates.sql`
- [x] 초기 템플릿 데이터 삽입 스크립트: `scripts/initialize-assembly-templates.ts`

#### 2. 백엔드 API ✅

모든 필요한 API가 구현되어 있습니다:

- [x] `GET /api/admin/templates?category=assembly` - 템플릿 목록 조회
- [x] `GET /api/admin/templates/types/[type]` - 특정 타입의 모든 버전 조회
- [x] `GET /api/admin/templates/types/[type]/active` - 활성 버전 조회
- [x] `GET /api/admin/templates/types/[type]/versions` - 버전 히스토리
- [x] `GET /api/admin/templates/[templateId]` - 템플릿 상세 조회
- [x] `POST /api/admin/templates` - 새 템플릿 생성 (SYSTEM_ADMIN 전용)
- [x] `PUT /api/admin/templates/[templateId]` - 템플릿 수정 (새 버전 생성, SYSTEM_ADMIN 전용)
- [x] `POST /api/admin/templates/[templateId]/activate` - 템플릿 활성화/롤백 (SYSTEM_ADMIN 전용)
- [x] `POST /api/admin/templates/preview` - 템플릿 미리보기 (TODO: PDF 생성 기능 추가 필요)
- [x] `GET /api/admin/templates/diff` - 템플릿 비교

#### 3. 라이브러리 함수 ✅

- [x] `lib/admin/assembly-templates.ts` - 조합원 총회 템플릿 특화 함수
  - `getAssemblyTemplates()` - 조합원 총회 템플릿 목록 조회
  - `getActiveAssemblyTemplate()` - 활성 템플릿 조회
  - `validateAssemblyTemplateContent()` - 템플릿 내용 검증
  - `getAssemblyEditorConfig()` - 에디터 설정 조회
  - `generateSampleData()` - 미리보기용 샘플 데이터 생성
- [x] `lib/admin/document-templates.ts` - 범용 템플릿 관리 (기존 재사용)

#### 4. 권한 시스템 ✅

- [x] `lib/auth/system-admin.ts` - 시스템 어드민 권한 체크
  - `isSystemAdmin()` - 환경변수 기반 시스템 어드민 확인
  - `requireSystemAdmin()` - API에서 사용할 권한 체크
- [x] 모든 템플릿 수정 API에 `SYSTEM_ADMIN` 전용 권한 체크 적용

---

### 🚧 부분 구현 항목

#### 5. 프론트엔드 UI (진행 중)

**✅ 완료:**

- [x] 페이지 생성: `app/admin/system/assembly-templates/page.tsx`
- [x] 기본 컴포넌트: `AssemblyTemplateManagement.tsx`
  - 템플릿 목록 조회 기능 ✅
  - 템플릿 카드 표시 ✅
  - 로딩/에러 처리 ✅

**❌ 미구현:**

- [ ] 템플릿 편집 버튼 및 액션 (TODO 주석으로 표시됨)
- [ ] 템플릿 편집 모달
- [ ] 버전 히스토리 모달
- [ ] 템플릿 미리보기 모달
- [ ] 템플릿 저장/커밋 플로우

**재사용 가능한 기존 컴포넌트:**

- `TemplateEditModal.tsx` - 규약 템플릿 편집 모달 (조합원 총회에 맞게 수정 필요)
- `TemplateVersionHistoryModal.tsx` - 버전 히스토리
- `TemplateDiffModal.tsx` - 템플릿 비교
- `TemplateEditor/` - 에디터 관련 서브 컴포넌트들
  - `TemplatePreviewModal.tsx`
  - `TemplateCommitModal.tsx`
  - `TemplateTextEditor.tsx`
  - 등등

---

### ❌ 미구현 항목

#### 6. 시스템 어드민 메뉴 통합

- [ ] 시스템 설정 메뉴에 "총회 문서 템플릿 관리" 링크 추가
- [ ] `/admin/system` 레이아웃에서 새 메뉴 항목 추가
- [ ] 권한 체크 (SYSTEM_ADMIN만 메뉴 표시)

**필요한 작업:**

- `app/admin/system/layout.tsx` 또는 시스템 설정 네비게이션 컴포넌트 수정
- 시스템 어드민 여부를 클라이언트에서 확인하는 로직 추가

---

## 🎯 추가 구현 필요 사항 (우선순위별)

### 🔴 높은 우선순위 (필수 기능)

#### 1. 시스템 어드민 메뉴 통합

**위치:** `app/admin/system/` 또는 시스템 설정 네비게이션
**필요한 작업:**

- [ ] 시스템 설정 레이아웃/네비게이션에 "총회 문서 템플릿 관리" 메뉴 추가
- [ ] 클라이언트에서 시스템 어드민 여부 확인하는 훅 또는 컨텍스트 추가
- [ ] SYSTEM_ADMIN이 아닌 경우 메뉴 숨기기

**예상 파일:**

- `app/admin/system/layout.tsx` (존재하면)
- `components/admin/SystemSettings.tsx` (존재하면)
- 또는 새로운 네비게이션 컴포넌트

#### 2. 템플릿 편집 UI 구현

**위치:** `components/admin/`
**필요한 컴포넌트:**

##### A. 템플릿 카드 액션 버튼 추가

**파일:** `AssemblyTemplateManagement.tsx` (기존 TODO 부분)

```tsx
// 155번째 줄 TODO 부분
<div className="flex gap-2">
  <Button onClick={() => handleEdit(template)}>편집</Button>
  <Button variant="outline" onClick={() => handleVersionHistory(template)}>
    버전 히스토리
  </Button>
  <Button variant="outline" onClick={() => handlePreview(template)}>
    미리보기
  </Button>
</div>
```

##### B. 조합원 총회 템플릿 전용 편집 모달

**신규 파일:** `components/admin/AssemblyTemplateEditModal.tsx`

- 기존 `TemplateEditModal.tsx`를 참고하되, 조합원 총회 문서 구조에 맞게 단순화
- 규약은 중첩된 섹션 구조(`sections[]`)를 사용하지만, 조합원 총회는 더 단순한 구조

**필요한 에디터:**

1. **결성총회 의안 에디터** (`AssemblyFormationAgendaEditor.tsx`)

   - 의장 입력 필드
   - 의안 목록 (동적 추가/삭제)
   - 하단 메시지
   - 레이블 편집 (title_template, labels 등)

2. **조합원 명부 에디터** (`AssemblyMemberListEditor.tsx`)
   - 자동 생성 문서이므로 읽기 전용 안내
   - 테이블 구조 편집 (컬럼 레이블, 너비, 정렬)
   - 하단 레이블 편집

##### C. 버전 히스토리/미리보기 모달

- 기존 `TemplateVersionHistoryModal.tsx` 재사용 가능
- 기존 `TemplateEditor/TemplatePreviewModal.tsx` 재사용 가능
- `TemplateDiffModal.tsx` 재사용 가능

#### 3. 템플릿 미리보기 PDF 생성

**위치:** `app/api/admin/templates/preview/route.ts` (TODO 부분)
**필요한 작업:**

- [ ] 템플릿 content + 샘플 데이터를 PDF generator에 전달
- [ ] `lib/pdf/formation-agenda-generator.ts` 호출
- [ ] `lib/pdf/member-list-generator.ts` 호출
- [ ] PDF Buffer를 응답으로 반환

**참고:**

- 기존 `app/api/admin/funds/[fundId]/generated-documents/lpa/preview/route.ts` 참고

---

### 🟡 중간 우선순위 (편의성 향상)

#### 4. 템플릿 버전 관리 UI 개선

- [ ] 버전 비교 (Diff) 기능
- [ ] 롤백 확인 모달
- [ ] 버전별 미리보기

#### 5. 템플릿 편집 검증 강화

- [ ] 실시간 검증 피드백
- [ ] 필수 필드 하이라이트
- [ ] 잘못된 JSON 구조 경고

#### 6. 에러 처리 및 사용자 피드백

- [ ] 저장 실패 시 상세 에러 메시지
- [ ] 성공 알림 토스트
- [ ] 변경사항 미저장 경고

---

### 🟢 낮은 우선순위 (향후 개선)

#### 7. 템플릿 복사/내보내기

- [ ] 템플릿 JSON 내보내기
- [ ] 템플릿 JSON 가져오기
- [ ] 다른 총회 유형으로 복사

#### 8. 템플릿 영향도 분석

- [ ] 이 템플릿을 사용한 문서 수 표시
- [ ] 템플릿 변경 시 영향받는 펀드/총회 목록

---

## 📝 구체적인 구현 계획

### Step 1: 시스템 어드민 메뉴 통합 (30분)

1. 시스템 설정 네비게이션 파일 찾기
2. "총회 문서 템플릿 관리" 메뉴 항목 추가
3. SYSTEM_ADMIN 권한 체크 추가
4. 라우팅 연결

### Step 2: 템플릿 편집 UI - 기본 구조 (2시간)

1. `AssemblyTemplateManagement.tsx`에 버튼 액션 추가
2. 모달 상태 관리 (편집/버전히스토리/미리보기)
3. `AssemblyTemplateEditModal.tsx` 생성 (기본 구조)
4. 편집 모달과 메인 컴포넌트 연결

### Step 3: 결성총회 의안 에디터 구현 (3시간)

1. `AssemblyFormationAgendaEditor.tsx` 생성
2. 의장 필드 편집
3. 의안 목록 편집 (추가/삭제/순서 변경)
4. 하단 메시지 편집
5. 레이블 편집 섹션
6. 검증 로직

### Step 4: 조합원 명부 에디터 구현 (2시간)

1. `AssemblyMemberListEditor.tsx` 생성
2. 테이블 구조 편집 UI
3. 컬럼 설정 (레이블, 너비, 정렬)
4. 하단 레이블 편집
5. 읽기 전용 안내 표시

### Step 5: 템플릿 저장 플로우 (1시간)

1. 변경사항 요약 생성
2. 버전 번호 자동 증가
3. 커밋 모달 (기존 `TemplateCommitModal.tsx` 재사용)
4. API 호출 및 에러 처리
5. 저장 후 목록 새로고침

### Step 6: 버전 히스토리 & 미리보기 (1시간)

1. 기존 모달 컴포넌트 재사용
2. 조합원 총회 데이터 구조에 맞게 어댑터 작성
3. 버전 비교 기능 연결
4. 롤백 기능 연결

### Step 7: 미리보기 PDF 생성 (1시간)

1. `app/api/admin/templates/preview/route.ts` 완성
2. 템플릿 content + 샘플 데이터로 PDF 생성
3. PDF Buffer 반환
4. 프론트엔드에서 PDF 표시

### Step 8: 테스트 및 검증 (1시간)

1. 템플릿 생성 테스트
2. 템플릿 수정 테스트
3. 버전 관리 테스트
4. 롤백 테스트
5. 미리보기 테스트

**예상 총 소요 시간: 약 11.5시간**

---

## 🔍 상세 분석

### 1. 기존 규약 템플릿 시스템과의 차이점

#### 규약 템플릿 (LPA/Plan)

- **구조:** 중첩된 섹션 트리 (`sections[]`)
- **에디터:** `TemplateEditModal.tsx` (복잡한 트리 네비게이션)
- **사용 사례:** 펀드별로 다른 규약 버전
- **fund_id:** 펀드별로 다름

#### 조합원 총회 템플릿

- **구조:** 단순한 플랫 구조 (의장, 의안 목록, 레이블 등)
- **에디터:** 단순한 폼 기반 편집
- **사용 사례:** 모든 펀드에서 동일한 글로벌 템플릿
- **fund_id:** NULL (글로벌)

**결론:** 기존 `TemplateEditModal.tsx`를 그대로 사용하기보다는, 조합원 총회에 특화된 간단한 모달을 새로 만드는 것이 효율적입니다.

### 2. 재사용 가능한 컴포넌트

- `TemplateVersionHistoryModal.tsx` ✅
- `TemplateDiffModal.tsx` ✅
- `TemplateCommitModal.tsx` ✅
- `TemplatePreviewModal.tsx` ✅ (약간 수정 필요)
- `TemplateTextEditor.tsx` - 부분적으로 재사용 가능 (변수 하이라이트 등)

### 3. 새로 작성이 필요한 컴포넌트

- `AssemblyTemplateEditModal.tsx` ❌ (전체 모달 컨테이너)
- `AssemblyFormationAgendaEditor.tsx` ❌ (결성총회 의안 에디터)
- `AssemblyMemberListEditor.tsx` ❌ (조합원 명부 에디터)

---

## 🎨 UI/UX 가이드

### 템플릿 편집 모달 구조

```
┌────────────────────────────────────────────────────────────┐
│  템플릿 편집: 결성총회 의안 템플릿          현재 버전: 1.0.0 │
├────────────────────────────────────────────────────────────┤
│  ⚠️ 템플릿 수정은 이후 생성되는 모든 문서에 반영됩니다.      │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  [탭: 기본 정보] [탭: 내용 편집] [탭: 레이블 설정]           │
│                                                             │
│  ┌── 기본 정보 (탭 1) ────────────────────────────────┐    │
│  │                                                     │    │
│  │  설명: [의안 내용을 검토하고 필요시 수정하세요.]      │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌── 내용 편집 (탭 2) ────────────────────────────────┐    │
│  │                                                     │    │
│  │  의장 (기본값):                                      │    │
│  │  [                                                ]    │
│  │                                                     │    │
│  │  의안 목록:                                          │    │
│  │  ┌───────────────────────────────────────────┐     │    │
│  │  │ 제1호 의안                                 │     │    │
│  │  │ 제목: [규약(안) 승인의 건            ]     │     │    │
│  │  │ 내용: [첨부한 규약 참조...           ]     │     │    │
│  │  │                          [삭제]            │     │    │
│  │  └───────────────────────────────────────────┘     │    │
│  │  [+ 의안 추가]                                     │    │
│  │                                                     │    │
│  │  하단 메시지:                                        │    │
│  │  [위 의안에 대하여 조합원 여러분들의 승인을...]      │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌── 레이블 설정 (탭 3) ────────────────────────────────┐   │
│  │                                                     │    │
│  │  문서 제목: [{fund_name} 결성총회          ]       │    │
│  │                                                     │    │
│  │  필드 레이블:                                        │    │
│  │    일시: [일시:                            ]       │    │
│  │    의장: [의장:                            ]       │    │
│  │    부의안건: [부의안건                      ]       │    │
│  │    의안 제목: [(제{index}호 의안) {title}  ]       │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  [취소] [미리보기] [저장]                                    │
└────────────────────────────────────────────────────────────┘
```

---

## 🚀 다음 단계

1. **우선순위 결정:** 위 항목 중 어떤 것부터 구현할지 결정
2. **시작 지점:** Step 1 (시스템 어드민 메뉴 통합)부터 시작 권장
3. **점진적 구현:** 각 Step을 순서대로 완료하며 테스트
4. **피드백 반영:** 각 단계마다 UX 검토 및 개선

---

## 📌 중요 참고 사항

### 기존 시스템과의 일관성 유지

- API 응답 구조는 기존 규약 템플릿과 동일하게 유지
- 에러 처리 방식 통일
- UI 컴포넌트 스타일 가이드 준수
- 권한 체크 로직 재사용

### 사용자 경험 고려

- 시스템 어드민만 접근 가능 (일반 어드민에게는 보이지 않음)
- 템플릿 수정 시 명확한 경고 메시지
- 미리보기로 변경사항 확인 가능
- 롤백 기능으로 안전성 확보

### 확장성

- 향후 다른 총회 유형 추가 용이
- 템플릿 타입별 에디터 동적 로딩
- 검증 로직 모듈화

---

**문서 작성일:** 2024년 10월 18일
**마지막 업데이트:** 2024년 10월 18일
