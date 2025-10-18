# 총회 문서 생성 컴포넌트 분리 설계

## 📋 현황 분석

### 문제점

- `AssemblyDocumentGenerationModal.tsx`: 970줄의 거대한 파일
- 현재 2개 문서 타입만 있는데도 복잡함
- 앞으로 10종 이상의 문서 타입이 추가될 예정
- 각 문서별 편집 UI와 로직이 모두 한 파일에 섞여있음
- 유지보수와 확장이 어려움

### 현재 문서 타입

1. **formation_member_list** (조합원 명부)
   - 자동 생성
   - 별도 입력 UI 없음
2. **formation_agenda** (결성총회 의안)
   - 편집 가능
   - 의장, 부의안건 입력 UI
   - 복잡한 상태 관리 (의안 추가/삭제/수정)

### 향후 추가될 문서들

- 총회 소집 통지서
- 위임장
- 의결서
- 회의록
- 등기 관련 서류
- 기타 10종 이상...

## 🎯 리팩토링 목표

1. **관심사 분리**: 각 문서의 편집 로직을 독립적으로 관리
2. **확장성**: 새로운 문서 타입 추가 시 기존 코드 최소 수정
3. **재사용성**: 공통 로직과 UI 컴포넌트 재사용
4. **가독성**: 각 파일의 크기를 적정 수준(200-300줄)으로 유지
5. **유지보수성**: 문서별로 독립적인 수정 가능

## 🏗️ 제안 아키텍처

### 1. 디렉토리 구조

```
components/admin/
├── AssemblyDocumentGenerationModal.tsx  (메인 모달 - 흐름 제어)
├── assembly-documents/                   (새로 생성)
│   ├── types.ts                         (공통 타입 정의)
│   ├── BaseDocumentEditor.tsx           (공통 편집기 베이스)
│   ├── DocumentPreviewPanel.tsx         (공통 미리보기 패널)
│   ├── FormationMemberListEditor.tsx    (조합원 명부)
│   ├── FormationAgendaEditor.tsx        (결성총회 의안)
│   ├── NoticeEditor.tsx                 (소집통지서 - 예시)
│   ├── ProxyEditor.tsx                  (위임장 - 예시)
│   └── index.ts                         (에디터 레지스트리)
```

### 2. 공통 인터페이스 설계

```typescript
// types.ts
export interface DocumentEditorProps<T = any> {
  // 문서 내용
  content: T;
  onContentChange: (content: T) => void;

  // 상태
  isLoading: boolean;
  error: string | null;
  readOnly?: boolean;

  // 메타 정보
  fundId: string;
  assemblyId: string;
  documentType: AssemblyDocumentType;
}

export interface DocumentEditorConfig {
  // 사용자 입력이 필요한지
  requiresInput: boolean;

  // 기본 컨텐츠 생성 함수
  getDefaultContent: () => any;

  // 유효성 검사
  validate?: (content: any) => string | null;

  // 편집기 컴포넌트
  EditorComponent: React.ComponentType<DocumentEditorProps>;

  // 안내 메시지
  description?: string;
}
```

### 3. 에디터 레지스트리 패턴

```typescript
// index.ts
import { AssemblyDocumentType } from '@/types/assemblies';
import type { DocumentEditorConfig } from './types';
import FormationMemberListEditor from './FormationMemberListEditor';
import FormationAgendaEditor from './FormationAgendaEditor';

export const DOCUMENT_EDITORS: Record<
  AssemblyDocumentType,
  DocumentEditorConfig
> = {
  formation_member_list: {
    requiresInput: false,
    getDefaultContent: () => ({}),
    EditorComponent: FormationMemberListEditor,
    description:
      '이 문서는 현재 펀드의 조합원 정보를 바탕으로 자동으로 생성됩니다.',
  },

  formation_agenda: {
    requiresInput: true,
    getDefaultContent: () => ({
      chairman: '',
      agendas: [
        {
          index: 1,
          title: '규약(안) 승인의 건',
          content: '첨부한 규약 참조 부탁드립니다.',
        },
        {
          index: 2,
          title: '사업계획 승인의 건',
          content: '당 조합은 유망한 중소벤처기업에 투자하여...',
        },
      ],
    }),
    validate: content => {
      if (!content.chairman?.trim()) {
        return '의장을 입력해주세요.';
      }
      return null;
    },
    EditorComponent: FormationAgendaEditor,
    description: '의안 내용을 검토하고 필요시 수정하세요.',
  },

  // 향후 추가될 문서들...
  // formation_notice: { ... },
  // formation_proxy: { ... },
};

export function getEditorConfig(
  documentType: AssemblyDocumentType
): DocumentEditorConfig | null {
  return DOCUMENT_EDITORS[documentType] || null;
}
```

### 4. 개별 에디터 컴포넌트 예시

#### FormationAgendaEditor.tsx (간소화된 버전)

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Minus } from 'lucide-react';
import type { DocumentEditorProps } from './types';
import type { FormationAgendaContent, AgendaItem } from '@/types/assemblies';

export default function FormationAgendaEditor({
  content,
  onContentChange,
  readOnly = false,
}: DocumentEditorProps<FormationAgendaContent>) {
  const handleAddAgenda = () => {
    const newIndex = content.agendas.length + 1;
    onContentChange({
      ...content,
      agendas: [
        ...content.agendas,
        { index: newIndex, title: '', content: '' },
      ],
    });
  };

  const handleRemoveAgenda = (index: number) => {
    if (content.agendas.length <= 1) return;
    const newAgendas = content.agendas.filter((_, i) => i !== index);
    const reindexedAgendas = newAgendas.map((agenda, i) => ({
      ...agenda,
      index: i + 1,
    }));
    onContentChange({
      ...content,
      agendas: reindexedAgendas,
    });
  };

  const handleAgendaChange = (
    index: number,
    field: keyof AgendaItem,
    value: string
  ) => {
    const newAgendas = [...content.agendas];
    newAgendas[index] = { ...newAgendas[index], [field]: value };
    onContentChange({ ...content, agendas: newAgendas });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="chairman">의장 *</Label>
        <Input
          id="chairman"
          value={content.chairman}
          onChange={e =>
            onContentChange({ ...content, chairman: e.target.value })
          }
          placeholder="예: 업무집행조합원 프로펠벤처스 대표이사 곽준영"
          className="mt-1"
          disabled={readOnly}
        />
      </div>

      <div>
        <Label>부의안건</Label>
        <div className="mt-2 space-y-4">
          {content.agendas.map((agenda, index) => (
            <div key={index} className="border p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Label>제{agenda.index}호 의안</Label>
                {!readOnly && content.agendas.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveAgenda(index)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <Input
                value={agenda.title}
                onChange={e =>
                  handleAgendaChange(index, 'title', e.target.value)
                }
                placeholder="의안 제목"
                className="mb-2"
                disabled={readOnly}
              />
              <Textarea
                value={agenda.content}
                onChange={e =>
                  handleAgendaChange(index, 'content', e.target.value)
                }
                placeholder="의안 내용"
                rows={4}
                disabled={readOnly}
              />
            </div>
          ))}
        </div>
        {!readOnly && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddAgenda}
            className="mt-2"
          >
            <Plus className="w-4 h-4 mr-1" />
            의안 추가
          </Button>
        )}
      </div>
    </div>
  );
}
```

#### FormationMemberListEditor.tsx

```typescript
'use client';

import type { DocumentEditorProps } from './types';

export default function FormationMemberListEditor({
  readOnly = false,
}: DocumentEditorProps) {
  return (
    <div>
      <p className="text-sm text-gray-600">
        이 문서는 현재 펀드의 조합원 정보를 바탕으로 자동으로 생성됩니다.
      </p>
    </div>
  );
}
```

### 5. 메인 모달 간소화

메인 모달(`AssemblyDocumentGenerationModal.tsx`)은 다음과 같이 간소화됩니다:

```typescript
// 문서별 content 관리를 범용적으로
const [documentContents, setDocumentContents] = useState<Record<string, any>>(
  {}
);

// 현재 문서의 content
const currentContent = documentContents[currentDocument?.document_type || ''];

// 에디터 설정 가져오기
const editorConfig = currentDocument
  ? getEditorConfig(currentDocument.document_type)
  : null;

// 편집 UI 렌더링 (기존 678-766줄을 대체)
{
  viewMode === 'edit' && editorConfig && (
    <div className="space-y-4 mt-4">
      {/* 안내 메시지 */}
      {editorConfig.description && (
        <p className="text-sm text-gray-600">{editorConfig.description}</p>
      )}

      {/* 동적 에디터 렌더링 */}
      <editorConfig.EditorComponent
        content={currentContent}
        onContentChange={newContent => {
          setDocumentContents(prev => ({
            ...prev,
            [currentDocument.document_type]: newContent,
          }));
        }}
        isLoading={isLoading}
        error={error}
        readOnly={readOnly}
        fundId={fundId}
        assemblyId={assemblyId}
        documentType={currentDocument.document_type}
      />

      {/* 공통 버튼 영역 */}
      <DocumentEditorActions
        onPreview={handleGenerateDocument}
        onCancel={handleCancelEdit}
        onPrevious={handleNavigateToPrevious}
        showPrevious={currentDocumentIndex > 0}
        isLoading={isLoading}
        readOnly={readOnly}
      />
    </div>
  );
}
```

## 📊 기대 효과

### 1. 파일 크기 감소

- **현재**: AssemblyDocumentGenerationModal.tsx 970줄
- **리팩토링 후**:
  - AssemblyDocumentGenerationModal.tsx: ~400줄 (60% 감소)
  - FormationAgendaEditor.tsx: ~150줄
  - FormationMemberListEditor.tsx: ~50줄
  - 공통 컴포넌트: ~200줄

### 2. 확장성

- 새 문서 타입 추가 시:
  1. 새 에디터 파일 생성 (독립적)
  2. 레지스트리에 등록만 하면 끝
  3. 메인 모달 코드 수정 불필요

### 3. 유지보수성

- 각 문서별로 독립적인 수정 가능
- 문서 A의 버그 수정이 문서 B에 영향 없음
- 코드 리뷰 시 변경 범위가 명확함

### 4. 테스트 용이성

- 각 에디터를 독립적으로 테스트 가능
- Mock props를 주입하기 쉬움

## 🔄 마이그레이션 전략

### Phase 1: 기반 구조 생성

1. `assembly-documents/` 디렉토리 생성
2. 공통 타입 및 인터페이스 정의
3. 레지스트리 구조 생성

### Phase 2: 기존 문서 마이그레이션

1. FormationMemberListEditor 분리
2. FormationAgendaEditor 분리
3. 메인 모달에서 동적 렌더링 적용

### Phase 3: 검증 및 최적화

1. 기능 테스트
2. 공통 컴포넌트 추출 (DocumentEditorActions 등)
3. 불필요한 코드 제거

### Phase 4: 신규 문서 추가

- 이후 새로운 문서 타입은 새로운 구조로 추가

## ⚠️ 주의사항

### 1. 하위 호환성

- 기존 API 응답 형식 유지
- `content` 구조는 문서별로 다르므로 타입 안전성 확보 필요

### 2. 상태 관리

- 각 문서의 content를 별도로 관리하되, 메인 모달에서 통합 관리
- 문서 간 이동 시 상태 유지

### 3. 유효성 검사

- 각 에디터에서 로컬 유효성 검사
- 메인 모달에서 최종 검증

### 4. 에러 처리

- 에디터별 에러 처리
- 공통 에러는 메인 모달에서 처리

## 🎨 추가 개선 사항 (선택)

### 1. 문서 프리셋 시스템

- 자주 사용하는 내용을 프리셋으로 저장
- 펀드별로 다른 기본값 설정

### 2. 실시간 미리보기

- 편집 중에도 미리보기 패널 표시 (사이드바)
- 변경사항 실시간 반영

### 3. 문서 템플릿 편집기

- 관리자가 각 문서의 레이아웃을 커스터마이징
- 필드 추가/제거 가능

### 4. 버전 히스토리

- 각 문서의 편집 히스토리 추적
- 이전 버전으로 롤백 기능

## 📝 구현 체크리스트

- [x] `assembly-documents/` 디렉토리 생성
- [x] `types.ts` - 공통 인터페이스 정의
- [x] `index.ts` - 에디터 레지스트리 구현
- [x] `FormationMemberListEditor.tsx` 분리
- [x] `FormationAgendaEditor.tsx` 분리
- [x] `DocumentEditorActions.tsx` 공통 버튼 영역
- [x] 메인 모달 리팩토링 - 동적 렌더링 적용
- [ ] 기능 테스트
- [ ] 문서화 업데이트

## ✅ 구현 완료 (2025-10-17)

### 구현된 사항

1. **기반 구조 생성 (Phase 1)**

   - `components/admin/assembly-documents/` 디렉토리 생성
   - `types.ts`: DocumentEditorProps, DocumentEditorConfig 인터페이스 정의
   - `index.ts`: DOCUMENT_EDITORS 레지스트리 및 getEditorConfig 함수 구현

2. **문서 에디터 분리 (Phase 2)**

   - `FormationMemberListEditor.tsx`: 자동 생성 문서용 에디터
   - `FormationAgendaEditor.tsx`: 결성총회 의안 에디터 (의장, 부의안건 편집)
   - `DocumentEditorActions.tsx`: 공통 버튼 컴포넌트 (이전/취소/미리보기)

3. **메인 모달 리팩토링 (Phase 2)**
   - 기존 `agendaContent` 상태를 `documentContents` (Record<string, any>)로 변경
   - 동적 에디터 렌더링 적용 (getEditorConfig 기반)
   - 문서별 유효성 검사를 에디터 설정의 validate 함수로 통합
   - 970줄 → 약 750줄로 감소 (22% 감소)

### 주요 변경 사항

**Before:**

```typescript
// 하드코딩된 문서별 상태
const [agendaContent, setAgendaContent] = useState<FormationAgendaContent>({...});

// 하드코딩된 렌더링
{currentDocument.document_type === 'formation_agenda' && (
  <div>... 복잡한 의안 편집 UI ...</div>
)}
```

**After:**

```typescript
// 범용 상태 관리
const [documentContents, setDocumentContents] = useState<Record<string, any>>({});

// 동적 렌더링
const editorConfig = getEditorConfig(currentDocument.document_type);
const EditorComponent = editorConfig.EditorComponent;
<EditorComponent
  content={currentContent}
  onContentChange={newContent => setDocumentContents(prev => ({...}))}
  {...props}
/>
```

### 기대 효과

1. **확장성**: 새 문서 타입 추가 시 에디터 파일 생성 + 레지스트리 등록만 필요
2. **유지보수성**: 각 문서 에디터가 독립적으로 관리됨
3. **가독성**: 메인 모달이 간결해지고, 각 에디터의 책임이 명확함
4. **재사용성**: 공통 컴포넌트(DocumentEditorActions) 재사용

### 다음 단계

- [ ] 실제 사용자 환경에서 기능 테스트
- [ ] 추가 문서 타입 구현 (formation_official_letter, formation_minutes 등)
- [ ] 에러 처리 개선
- [ ] 문서별 프리셋 기능 추가 (선택사항)

## 💭 결론

현재 구조로는 10종 이상의 문서를 관리하기 어렵습니다. 제안된 아키텍처를 적용하면:

1. **확장성**: 새 문서 추가가 쉬워짐
2. **유지보수성**: 각 문서를 독립적으로 관리
3. **가독성**: 파일 크기가 적정 수준으로 유지
4. **재사용성**: 공통 로직 재사용

다만, 리팩토링 작업량이 있으므로 단계적으로 진행하는 것을 권장합니다.
