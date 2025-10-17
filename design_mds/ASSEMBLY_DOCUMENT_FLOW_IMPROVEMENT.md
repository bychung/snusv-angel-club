# 총회 문서 생성 플로우 개선 설계

## 📋 개요

기존에는 모든 문서를 편집 → 미리보기 → 저장 순서로 진행했으나, 이미 생성된 문서는 미리보기부터 시작하여 필요시에만 편집하도록 플로우를 개선합니다.

## 🎯 개선 목적

1. **불필요한 단계 생략**: 이미 생성된 문서는 바로 미리보기로 시작
2. **선택적 편집**: 수정이 필요한 경우에만 편집 모드로 전환
3. **더 빠른 검토**: 연속적으로 문서 미리보기를 확인하여 빠르게 검토 가능

## 🔄 플로우 비교

### 기존 플로우

```
총회 생성
  ↓
1번 문서 편집 → 미리보기 → 저장
  ↓
2번 문서 편집 → 미리보기 → 저장
  ↓
3번 문서 편집 → 미리보기 → 저장
  ↓
완료
```

**문제점:**

- 이미 생성된 문서도 다시 편집 화면부터 시작
- 수정할 필요가 없어도 매번 편집 단계를 거쳐야 함

### 개선 플로우

#### 시나리오 1: 모든 문서가 새로 생성되는 경우

```
총회 생성
  ↓
1번 문서 편집 → 미리보기 → 저장
  ↓
2번 문서 편집 → 미리보기 → 저장
  ↓
3번 문서 편집 → 미리보기 → 저장
  ↓
완료
```

**기존과 동일**: 처음 생성할 때는 편집부터 시작

#### 시나리오 2: 일부 문서가 이미 생성된 경우

```
총회 계속 작성 (1, 2번 문서는 이미 저장됨, 3번부터 생성 필요)
  ↓
1번 문서 미리보기
  [편집하기] [다음]
  ↓
2번 문서 미리보기
  [이전] [편집하기] [다음]
  ↓
3번 문서 편집
  [이전] [미리보기]
  ↓
3번 문서 미리보기
  [이전] [문서 저장]
  ↓
완료
```

**개선점**: 기존 문서는 미리보기만 하고 빠르게 넘어감

#### 시나리오 3: 기존 문서를 수정하는 경우

```
총회 계속 작성
  ↓
1번 문서 미리보기
  [편집하기] [다음]
  ↓ (사용자가 [편집하기] 클릭)
1번 문서 편집
  [이전] [미리보기]
  ↓
1번 문서 미리보기
  [이전] [문서 저장]
  ↓ (저장 클릭)
2번 문서 미리보기
  [이전] [편집하기] [다음]
  ↓
3번 문서 편집 (아직 생성 안 된 문서)
  ...
```

**핵심**: 필요한 문서만 선택적으로 편집 가능

## 🏗️ 설계

### 1. 문서 상태 분류

각 문서는 다음 상태 중 하나를 가집니다:

```typescript
type DocumentState =
  | 'not-created' // 아직 생성되지 않음 → 편집부터 시작
  | 'created' // 이미 생성됨 → 미리보기부터 시작
  | 'editing' // 편집 중 (미리보기에서 편집하기 눌렀거나, 새로 생성 중)
  | 'previewing'; // 미리보기 중
```

### 2. 화면 모드

```typescript
type ViewMode =
  | 'edit' // 편집 화면
  | 'preview'; // 미리보기 화면

// 상태 결정 로직
function determineInitialViewMode(document: AssemblyDocument | null): ViewMode {
  if (!document || !document.pdf_storage_path) {
    return 'edit'; // 문서 없음 → 편집부터
  }
  return 'preview'; // 문서 있음 → 미리보기부터
}
```

### 3. 버튼 구성

#### 미리보기 화면 (기존 문서)

```
┌──────────────────────────────────────┐
│ 조합원 명부 (1/7)                     │
├──────────────────────────────────────┤
│                                       │
│  [PDF 미리보기]                       │
│                                       │
├──────────────────────────────────────┤
│  [이전]  [편집하기]  [다음]           │
└──────────────────────────────────────┘
```

- **이전**: 이전 문서로 (미리보기 or 편집)
- **편집하기**: 현재 문서 편집 모드로 전환
- **다음**: 다음 문서로 (미리보기 or 편집)

#### 편집 화면 (새 문서 or 수정 중)

```
┌──────────────────────────────────────┐
│ 결성총회 의안 (2/7)                   │
├──────────────────────────────────────┤
│                                       │
│  [편집 폼]                            │
│                                       │
├──────────────────────────────────────┤
│  [이전]  [취소]  [미리보기]           │
└──────────────────────────────────────┘
```

- **이전**: 이전 문서로
- **취소**: 편집 취소 (기존 문서면 미리보기로, 새 문서면 모달 닫기)
- **미리보기**: PDF 생성하여 미리보기

#### 미리보기 화면 (편집 후)

```
┌──────────────────────────────────────┐
│ 결성총회 의안 (2/7)                   │
├──────────────────────────────────────┤
│                                       │
│  [PDF 미리보기]                       │
│                                       │
├──────────────────────────────────────┤
│  [이전]  [다시 편집]  [문서 저장]     │
└──────────────────────────────────────┘
```

- **이전**: 이전 문서로 (미리보기 or 편집)
- **다시 편집**: 편집 모드로 돌아가기
- **문서 저장**: Storage/DB 저장 후 다음 문서로

### 4. State 관리

```typescript
// 현재 뷰 모드
const [viewMode, setViewMode] = useState<ViewMode>('preview');

// 편집 모드 진입 경로 추적
const [isEditingExisting, setIsEditingExisting] = useState(false);

// 문서 로드 시 초기 모드 결정
useEffect(() => {
  const existingDoc = existingDocuments.find(
    d => d.type === currentDocumentType
  );

  if (existingDoc && existingDoc.pdf_storage_path) {
    setViewMode('preview');
    setIsEditingExisting(true);
  } else {
    setViewMode('edit');
    setIsEditingExisting(false);
  }
}, [currentDocumentIndex]);
```

### 5. 버튼 핸들러

```typescript
// 편집하기 버튼 (미리보기 → 편집)
const handleStartEdit = () => {
  setViewMode('edit');
  setIsEditingExisting(true);
  // 미리보기 Blob URL 정리
  if (previewBlobUrl) {
    URL.revokeObjectURL(previewBlobUrl);
    setPreviewBlobUrl(null);
  }
};

// 다음 버튼 (미리보기에서)
const handleNextFromPreview = () => {
  const nextIndex = currentDocumentIndex + 1;
  if (nextIndex >= documentTypeOrder.length) {
    setStep('completion');
  } else {
    setCurrentDocumentIndex(nextIndex);
    loadDocumentAtIndex(nextIndex, documentTypeOrder, existingDocuments);
  }
};

// 취소 버튼 (편집 중)
const handleCancelEdit = () => {
  if (isEditingExisting) {
    // 기존 문서 편집 중이었으면 미리보기로 복귀
    const existingDoc = existingDocuments.find(
      d => d.type === currentDocument?.document_type
    );
    if (existingDoc) {
      loadExistingDocumentPreview(existingDoc, existingDoc.type);
    }
  } else {
    // 새 문서 생성 중이었으면 모달 닫기 확인
    if (confirm('작성 중인 내용이 저장되지 않습니다. 정말 취소하시겠습니까?')) {
      handleClose();
    }
  }
};
```

## 📝 구현 체크리스트

### Phase 1: State 및 로직 추가

- [ ] `viewMode` state 추가
- [ ] `isEditingExisting` state 추가
- [ ] `determineInitialViewMode` 로직 구현
- [ ] 문서 로드 시 초기 모드 결정 로직 추가

### Phase 2: UI 조건부 렌더링

- [ ] `viewMode === 'preview'` 일 때 미리보기 UI
- [ ] `viewMode === 'edit'` 일 때 편집 UI
- [ ] 각 모드별 버튼 구성 변경

### Phase 3: 버튼 핸들러 구현

- [ ] `handleStartEdit` - 편집하기 버튼
- [ ] `handleNextFromPreview` - 다음 버튼 (미리보기)
- [ ] `handleCancelEdit` - 취소 버튼 (편집)
- [ ] 기존 `handleGenerateDocument` 수정 (미리보기 후 viewMode 유지)
- [ ] 기존 `handleSaveDocument` 수정 (저장 후 다음 문서 모드 결정)

### Phase 4: 네비게이션 개선

- [ ] `loadDocumentAtIndex` 수정 - `showPreview` 제거하고 자동 판단
- [ ] 이전 버튼 동작 수정
- [ ] 다음 버튼 동작 추가

### Phase 5: 테스트

- [ ] 새 총회 생성 (모든 문서 새로 생성)
- [ ] 기존 총회 계속 작성 (일부 문서 존재)
- [ ] 기존 문서 수정 (편집하기 → 저장)
- [ ] 편집 취소 동작 확인
- [ ] 이전/다음 네비게이션 확인

## 🎨 UI 개선

### 미리보기 화면 추가 안내

```tsx
{
  viewMode === 'preview' && existingDoc && (
    <div className="bg-blue-50 p-3 rounded-lg mb-3">
      <p className="text-sm text-blue-800">
        ℹ️ 이미 생성된 문서입니다. 수정이 필요한 경우 "편집하기"를 클릭하세요.
      </p>
    </div>
  );
}
```

### 진행 상황 표시 개선

```tsx
<div className="bg-blue-50 p-3 rounded-lg">
  <p className="text-md font-medium">
    📄 {DOCUMENT_TYPE_NAMES[currentDocument.document_type]}
    <span className="text-xs text-gray-600 ml-2">
      {currentDocumentIndex + 1} / {documentTypeOrder.length}
    </span>
    {viewMode === 'preview' && (
      <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
        저장됨
      </span>
    )}
    {viewMode === 'edit' && !isEditingExisting && <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">새로 작성</span>}
  </p>
</div>
```

## 🔄 플로우 다이어그램

```
┌─────────────────┐
│ 총회 모달 오픈   │
└────────┬────────┘
         │
         ▼
    문서 1 존재?
    ┌────┴────┐
   예          아니오
    │           │
    ▼           ▼
 미리보기     편집 화면
    │           │
 [편집하기]  [미리보기]
    │           │
    ▼           ▼
 편집 화면   미리보기
    │           │
 [미리보기]  [문서 저장]
    │           │
    └────┬────┘
         │
         ▼
    문서 저장
         │
         ▼
    다음 문서로
    (반복)
```

## 📌 주의사항

1. **데이터 손실 방지**

   - 편집 중 취소 시 확인 다이얼로그
   - 모달 닫기 시 저장 안 된 내용 경고

2. **Blob URL 관리**

   - 모드 전환 시 이전 Blob URL 정리
   - 메모리 누수 방지

3. **상태 동기화**

   - `viewMode`와 `previewBlobUrl` 상태 일관성 유지
   - 네비게이션 시 적절한 모드로 전환

4. **사용자 경험**
   - 로딩 상태 명확히 표시
   - 각 버튼의 역할 명확히 구분
   - 현재 위치와 저장 상태 시각적으로 표시

## 🎯 예상 효과

1. **효율성 향상**

   - 이미 생성된 문서는 빠르게 검토
   - 수정이 필요한 문서만 편집

2. **유연성 증가**

   - 언제든 되돌아가서 수정 가능
   - 선택적 편집으로 시간 절약

3. **사용자 경험 개선**
   - 직관적인 플로우
   - 불필요한 단계 제거
