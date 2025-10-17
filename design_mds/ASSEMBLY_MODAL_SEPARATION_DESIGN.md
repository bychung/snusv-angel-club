# 총회 생성 모달 분리 설계

## 📋 개요

현재 `AssemblyCreationModal`은 총회 생성(DB write)과 문서 생성을 하나의 모달에서 처리하고 있습니다. 이로 인해 총회 생성 후 문서 생성 중 중단될 경우, 재개하기 어려운 문제가 있습니다. 이를 해결하기 위해 모달을 두 개로 분리합니다.

## 🎯 분리 목적

1. **중단 시 재개 가능**: 총회 생성(DB write) 후 문서 생성 중 중단되어도 다시 이어서 작업 가능
2. **명확한 책임 분리**: 총회 레코드 생성 vs 문서 생성/관리
3. **유연한 워크플로우**: 총회 카드의 "계속 작성" 버튼으로 문서 생성 모달만 독립적으로 실행 가능

## 🏗️ 아키텍처

### 현재 구조

```
AssemblyCreationModal (단일 모달)
├─ Step 1: type-selection (총회 종류 선택 + DB write)
├─ Step 2: document-generation (문서 생성)
└─ Step 3: completion (완료)
```

### 변경 후 구조

```
1. AssemblyCreationModal (간소화)
   └─ 총회 종류 선택 및 생성 (DB write)

2. AssemblyDocumentGenerationModal (신규)
   ├─ Step 1: document-generation (문서 생성)
   └─ Step 2: completion (완료)
```

## 📝 상세 설계

### 1. AssemblyCreationModal (리팩토링)

**파일명**: `components/admin/AssemblyCreationModal.tsx`

**역할**: 총회 레코드 생성만 담당

**Props**:

```typescript
interface AssemblyCreationModalProps {
  fundId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (assemblyId: string) => void; // assemblyId 반환
}
```

**주요 변경사항**:

- Step 관련 상태 제거 (단일 Step만 존재)
- 문서 생성 관련 로직 모두 제거 (`agendaContent`, `previewBlobUrl` 등)
- `handleCreateAssembly` 성공 시 `onSuccess(assemblyId)` 호출로 변경
- 모달 크기 단순화 (문서 미리보기 없으므로 고정 크기)

**UI 구성**:

```
┌─────────────────────────────────┐
│ 총회 생성                        │
├─────────────────────────────────┤
│ [ ] 결성총회                     │
│ [ ] 임시총회 (비활성화)          │
│ [ ] 정기총회 (비활성화)          │
│ [ ] 해산/청산총회 (비활성화)     │
│                                  │
│ 총회 개최일: [날짜 선택]         │
│                                  │
│ ℹ️ 안내 메시지                   │
│                                  │
│           [취소] [총회 생성]     │
└─────────────────────────────────┘
```

**플로우**:

1. 사용자가 총회 종류 선택 (현재는 결성총회만 가능)
2. 총회 개최일 입력
3. "총회 생성" 버튼 클릭
4. API 호출: `POST /api/admin/funds/${fundId}/assemblies`
5. 성공 시 `onSuccess(assemblyId)` 호출하여 부모에게 알림
6. 모달 닫기

---

### 2. AssemblyDocumentGenerationModal (신규 생성)

**파일명**: `components/admin/AssemblyDocumentGenerationModal.tsx`

**역할**: 총회 문서 생성 및 관리

**Props**:

```typescript
interface AssemblyDocumentGenerationModalProps {
  fundId: string;
  assemblyId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
```

**주요 기능**:

- 기존 `AssemblyCreationModal`의 Step 2, 3 로직 이관
- 전달받은 `assemblyId`로 다음 문서 정보 조회
- 문서별 편집/생성/미리보기/저장
- 모든 문서 생성 완료 시 완료 화면 표시

**State**:

```typescript
const [step, setStep] = useState<'document-generation' | 'completion'>('document-generation');
const [currentDocument, setCurrentDocument] = useState<NextDocumentInfo | null>(null);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// 미리보기 관련
const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
const [currentDocumentContent, setCurrentDocumentContent] = useState<any>(null);

// 결성총회 의안 내용
const [agendaContent, setAgendaContent] = useState<FormationAgendaContent>({...});

// 생성된 문서 목록
const [generatedDocuments, setGeneratedDocuments] = useState<string[]>([]);
```

**UI 구성 (Step 1: document-generation)**:

```
┌────────────────────────────────────────┐
│ 결성총회 문서 생성                      │
├────────────────────────────────────────┤
│ 📄 조합원 명부 (1/2)                    │
│                                         │
│ [문서별 입력 폼]                        │
│ - formation_member_list: 안내 문구만    │
│ - formation_agenda: 의장, 부의안건 편집 │
│                                         │
│              [이전] [미리보기]          │
└────────────────────────────────────────┘

[미리보기 표시 후]
┌────────────────────────────────────────┐
│ 결성총회 문서 생성                      │
├────────────────────────────────────────┤
│ 📄 조합원 명부 (1/2)                    │
│                                         │
│ [PDF 미리보기 iframe - 전체 화면]       │
│                                         │
│           [다시 편집] [문서 저장]       │
└────────────────────────────────────────┘
```

**UI 구성 (Step 2: completion)**:

```
┌────────────────────────────────────────┐
│ 결성총회 문서 생성 완료                 │
├────────────────────────────────────────┤
│            ✅                           │
│   모든 문서가 생성되었습니다!           │
│                                         │
│ 생성된 문서:                            │
│ • 조합원 명부                           │
│ • 결성총회 의안                         │
│                                         │
│ 다음 단계:                              │
│ • 총회 목록에서 문서를 확인             │
│ • 조합원들에게 이메일로 발송            │
│                                         │
│                    [닫기] [확인]        │
└────────────────────────────────────────┘
```

**플로우**:

1. 모달 오픈 시 `useEffect`로 다음 문서 정보 로드
2. 문서 타입별 입력 폼 표시
3. "미리보기" 클릭 → PDF 생성 (Storage/DB 저장 안 함)
4. "문서 저장" 클릭 → PDF 재생성 및 Storage/DB 저장
5. 다음 문서 정보 조회 및 반복
6. 모든 문서 완료 시 completion step 표시
7. "확인" 클릭 시 `onSuccess()` 호출 후 모달 닫기

---

### 3. AssemblyManagement (호출부 수정)

**파일명**: `components/admin/AssemblyManagement.tsx`

**변경사항**:

**State 추가**:

```typescript
const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
const [documentGenerationAssemblyId, setDocumentGenerationAssemblyId] =
  useState<string | null>(null);
```

**handleCreateAssembly 수정**:

```typescript
const handleCreateAssembly = () => {
  setIsCreationModalOpen(true);
};

const handleAssemblyCreated = (assemblyId: string) => {
  setIsCreationModalOpen(false);
  // 즉시 문서 생성 모달 오픈
  setDocumentGenerationAssemblyId(assemblyId);
  setIsDocumentModalOpen(true);
};
```

**handleContinue 구현**:

```typescript
const handleContinue = (assemblyId: string) => {
  // 문서 생성 모달만 오픈
  setDocumentGenerationAssemblyId(assemblyId);
  setIsDocumentModalOpen(true);
};
```

**JSX 수정**:

```tsx
{
  /* 총회 생성 모달 */
}
<AssemblyCreationModal
  fundId={fundId}
  isOpen={isCreationModalOpen}
  onClose={() => setIsCreationModalOpen(false)}
  onSuccess={handleAssemblyCreated} // assemblyId 받음
/>;

{
  /* 문서 생성 모달 */
}
{
  documentGenerationAssemblyId && (
    <AssemblyDocumentGenerationModal
      fundId={fundId}
      assemblyId={documentGenerationAssemblyId}
      isOpen={isDocumentModalOpen}
      onClose={() => {
        setIsDocumentModalOpen(false);
        setDocumentGenerationAssemblyId(null);
      }}
      onSuccess={() => {
        setIsDocumentModalOpen(false);
        setDocumentGenerationAssemblyId(null);
        loadAssemblies(); // 목록 새로고침
      }}
    />
  );
}
```

---

## 🔄 사용자 플로우

### 시나리오 1: 새 총회 생성 (정상 완료)

```
1. [총회 생성하기] 버튼 클릭
   ↓
2. AssemblyCreationModal 오픈
   ↓
3. 총회 종류 선택, 날짜 입력
   ↓
4. [총회 생성] 클릭 → DB write
   ↓
5. AssemblyCreationModal 닫힘
   ↓
6. AssemblyDocumentGenerationModal 자동 오픈
   ↓
7. 문서 1: 편집 → 미리보기 → 저장
   ↓
8. 문서 2: 편집 → 미리보기 → 저장
   ↓
9. 완료 화면 표시
   ↓
10. [확인] 클릭 → 모달 닫힘 → 목록 새로고침
```

### 시나리오 2: 새 총회 생성 (문서 생성 중 중단)

```
1. [총회 생성하기] 버튼 클릭
   ↓
2. AssemblyCreationModal 오픈
   ↓
3. 총회 생성 → DB write
   ↓
4. AssemblyDocumentGenerationModal 오픈
   ↓
5. 문서 1 생성 중 사용자가 모달 닫기
   ↓
6. 총회 목록에서 status="draft"로 표시
   ↓
7. [계속 작성] 버튼 표시
```

### 시나리오 3: 중단된 총회 이어서 작성

```
1. 총회 카드에서 [계속 작성] 버튼 클릭
   ↓
2. AssemblyDocumentGenerationModal만 오픈
   (AssemblyCreationModal은 건너뜀)
   ↓
3. next-document API로 다음 생성할 문서 조회
   ↓
4. 남은 문서들 생성
   ↓
5. 완료
```

---

## 🛠️ 기술적 고려사항

### API 엔드포인트

기존 API 그대로 사용:

- `POST /api/admin/funds/${fundId}/assemblies` - 총회 생성
- `GET /api/admin/funds/${fundId}/assemblies/${assemblyId}/next-document` - 다음 문서 정보
- `POST /api/admin/funds/${fundId}/assemblies/${assemblyId}/documents/generate` - PDF 생성 (미리보기)
- `POST /api/admin/funds/${fundId}/assemblies/${assemblyId}/documents/save` - PDF 저장

### 상태 관리

- 각 모달은 독립적인 상태 관리
- 부모 컴포넌트(`AssemblyManagement`)에서 모달 간 연결 관리
- `assemblyId`를 통한 데이터 연결

### 에러 처리

- 각 모달에서 자체 에러 처리
- 총회 생성 실패 시 문서 생성 모달 오픈 안 함
- 문서 생성 실패 시 사용자가 다시 시도하거나 모달 닫을 수 있음

### 메모리 관리

- `previewBlobUrl` cleanup 철저히 (`URL.revokeObjectURL`)
- 모달 닫힐 때 모든 상태 초기화

---

## ✅ 체크리스트

### Phase 1: 신규 컴포넌트 생성

- [x] `AssemblyDocumentGenerationModal.tsx` 생성
- [x] 기존 Step 2, 3 로직 이관
- [x] Props 및 State 정의
- [x] 독립적으로 동작 확인

### Phase 2: 기존 컴포넌트 리팩토링

- [x] `AssemblyCreationModal.tsx` 간소화
- [x] Step 관련 로직 제거
- [x] Props 변경 (`onSuccess` 시그니처)
- [x] UI 단순화

### Phase 3: 부모 컴포넌트 수정

- [x] `AssemblyManagement.tsx` State 추가
- [x] `handleAssemblyCreated` 구현
- [x] `handleContinue` 구현
- [x] 두 모달 렌더링 로직 추가

### Phase 4: 테스트

- [x] 새 총회 생성 → 문서 생성 완료 (정상 플로우)
- [x] 새 총회 생성 → 중간에 중단 → 계속 작성
- [x] 기존 draft 총회 → 계속 작성
- [x] 에러 케이스 테스트
- [x] 메모리 누수 확인 (Blob URL cleanup)

---

## 📌 추가 개선 사항 (선택)

### 1. 진행 상황 표시

- 전체 문서 개수와 현재 생성 중인 문서 위치 명확히 표시
- 진행률 바(Progress bar) 추가 고려

### 2. 뒤로가기 제한

- 문서 생성 모달에서 "이전" 버튼 제거 (총회는 이미 생성됨)
- 또는 "이전"을 "취소"로 변경하고 현재 문서만 건너뛰기

### 3. 자동 저장

- 편집 중인 내용을 localStorage에 임시 저장
- 페이지 새로고침 후에도 복구 가능

### 4. 총회 상태 전환

- draft → completed 자동 전환 로직 명확화
- 모든 필수 문서 생성 완료 시 자동으로 status 업데이트

---

## 🎯 예상 효과

1. **사용자 경험 개선**

   - 중단 후 재개 가능하여 작업 유연성 증가
   - 명확한 단계 구분으로 이해하기 쉬움

2. **유지보수성 향상**

   - 각 모달의 책임이 명확히 분리
   - 향후 임시총회, 정기총회 추가 시 확장 용이

3. **데이터 일관성**
   - 총회 레코드는 항상 먼저 생성됨
   - 문서 생성 실패 시에도 총회는 유지되어 나중에 재시도 가능
