## 총회 문서 생성 시 마커 제거 (설계)

### 문제 상황

현재 총회 문서 템플릿 관리에서는 변수(파란색)와 채워진 값(노란색)을 구분하기 위해 마커를 사용하고 있습니다:

- `PREVIEW` 마커: 파란색 - 값이 없어 `${...}` 그대로 노출되는 변수
- `INPUT` 마커: 노란색 - 미리보기에서 샘플 데이터로 렌더링되는 모든 값

**문제**: 실제 어드민이 펀드 관리에서 총회 문서를 생성할 때도 동일하게 노란색이 표시되고 있습니다.

### 원인 분석

현재 코드에서 미리보기 여부를 다음과 같이 판단합니다:

```typescript
// member-list-generator.ts, formation-agenda-generator.ts
const isPreview = !!data.template;
```

이 로직은 `template` 객체가 존재하기만 하면 미리보기 모드로 판단합니다.

하지만 실제 문서 생성 시에도 템플릿을 사용하기 때문에 (템플릿 시스템 도입으로 인해), 템플릿이 전달되면서 미리보기 모드로 인식되어 마커가 적용됩니다.

### 호출 경로

1. **템플릿 미리보기** (마커 필요 O)

   - API: `/api/admin/templates/preview`
   - 용도: 템플릿 편집 시 미리보기
   - 호출: `generateMemberListPDF({ ..., template: { content } })`

2. **실제 문서 생성** (마커 필요 X)

   - API: `/api/admin/funds/[fundId]/assemblies/[assemblyId]/documents/generate`
   - 용도: 펀드 관리에서 총회 문서 생성
   - 호출: `generateAssemblyDocumentBuffer()` → `generateMemberListPDF({ ..., template: template || undefined })`

3. **문서 재생성** (마커 필요 X)
   - API: 문서 재생성 관련
   - 용도: 저장된 문서를 템플릿으로 재생성
   - 호출: `regenerateAssemblyDocument()` → `generateMemberListPDF({ ..., template: template || undefined })`

### 해결 방안

명시적인 `isPreview` 플래그를 추가하여 미리보기 모드를 명확하게 구분합니다.

#### 1. 인터페이스 수정

```typescript
// member-list-generator.ts
interface MemberListData {
  fund_name: string;
  assembly_date: string;
  gps: GPInfo[];
  members: MemberInfo[];
  template?: any;
  isPreview?: boolean; // 추가: 명시적인 미리보기 플래그
}

// formation-agenda-generator.ts
interface FormationAgendaData {
  fund_name: string;
  assembly_date: string;
  content: FormationAgendaContent;
  template?: any;
  isPreview?: boolean; // 추가: 명시적인 미리보기 플래그
}
```

#### 2. PDF 생성기 로직 수정

```typescript
// 기존
const isPreview = !!data.template;

// 변경 후
const isPreview = data.isPreview ?? false;
```

`??` 연산자를 사용하여 `isPreview`가 명시적으로 전달되지 않으면 `false`를 기본값으로 사용합니다.

#### 3. 호출 지점 수정

**미리보기 API** (마커 적용 O)

```typescript
// app/api/admin/templates/preview/route.ts
pdfBuffer = await generateMemberListPDF({
  fund_name: sampleData.fund_name,
  assembly_date: sampleData.assembly_date,
  gps: sampleData.gps,
  members: sampleData.members,
  template: { content },
  isPreview: true, // 추가: 미리보기 모드 명시
});
```

**실제 문서 생성** (마커 적용 X)

```typescript
// lib/admin/assembly-documents.ts
pdfBuffer = await generateMemberListPDF({
  fund_name: fund.name,
  assembly_date: assembly.assembly_date,
  gps: gpInfos,
  members: memberInfos,
  template: template || undefined,
  // isPreview 생략 → false로 처리됨
});
```

### 구현 영향 범위

#### 수정 파일

1. `lib/pdf/member-list-generator.ts`

   - `MemberListData` 인터페이스에 `isPreview?: boolean` 추가
   - `const isPreview = data.isPreview ?? false;`로 변경

2. `lib/pdf/formation-agenda-generator.ts`

   - `FormationAgendaData` 인터페이스에 `isPreview?: boolean` 추가
   - `const isPreview = data.isPreview ?? false;`로 변경

3. `app/api/admin/templates/preview/route.ts`
   - `generateMemberListPDF()` 호출 시 `isPreview: true` 추가
   - `generateFormationAgendaPDF()` 호출 시 `isPreview: true` 추가

#### 영향 받지 않는 파일 (기본값 false 사용)

- `lib/admin/assembly-documents.ts` - 모든 호출 지점
  - `generateMemberListBuffer()`
  - `generateFormationAgendaBuffer()`
  - `generateAssemblyDocumentBuffer()`
  - `regenerateAssemblyDocument()`

### 예상 결과

#### 템플릿 미리보기 화면

- 변수 `${fund_name}`: 파란색 (값이 없는 경우)
- 치환된 값: 노란색 (샘플 데이터)
- 테이블 셀 값: 노란색 (샘플 데이터)

#### 실제 문서 생성 (펀드 관리)

- 모든 텍스트: 검은색
- 마커 없음

### 테스트 계획

1. **템플릿 미리보기**

   - 템플릿 편집 화면에서 미리보기 시 노란색/파란색 마커 정상 표시 확인

2. **실제 문서 생성**

   - 펀드 관리 > 총회 관리 > 문서 생성 시 모든 텍스트가 검은색으로 표시되는지 확인
   - 조합원 명부의 모든 셀이 검은색인지 확인
   - 결성총회 의안의 모든 텍스트가 검은색인지 확인

3. **문서 재생성**
   - 저장된 문서를 재생성할 때 마커 없이 생성되는지 확인

### 구현 작업 목록

1. ✅ 설계 문서 작성
2. ✅ `member-list-generator.ts` 수정
3. ✅ `formation-agenda-generator.ts` 수정
4. ✅ `app/api/admin/templates/preview/route.ts` 수정
5. ⬜ 수동 QA (템플릿 미리보기 + 실제 문서 생성)

### 구현 완료 내역 (2024-10-19)

#### 수정된 파일

1. **lib/pdf/member-list-generator.ts**

   - `MemberListData` 인터페이스에 `isPreview?: boolean` 필드 추가
   - `const isPreview = data.isPreview ?? false;`로 변경
   - 주석 추가: "미리보기 모드 (true: 마커 표시, false/undefined: 마커 미표시)"

2. **lib/pdf/formation-agenda-generator.ts**

   - `FormationAgendaData` 인터페이스에 `isPreview?: boolean` 필드 추가
   - `const isPreview = data.isPreview ?? false;`로 변경
   - 주석 추가: "미리보기 모드 (true: 마커 표시, false/undefined: 마커 미표시)"

3. **app/api/admin/templates/preview/route.ts**
   - `generateFormationAgendaPDF()` 호출 시 `isPreview: true` 추가
   - `generateMemberListPDF()` 호출 시 `isPreview: true` 추가
   - 주석 추가: "미리보기 모드: 마커 표시"

#### 영향 받지 않는 파일 (자동으로 false 처리)

- **lib/admin/assembly-documents.ts**
  - `generateMemberListBuffer()` - 라인 134: 템플릿만 전달, isPreview 생략 → false
  - `generateFormationAgendaBuffer()` - 라인 174: 템플릿만 전달, isPreview 생략 → false
  - `generateAssemblyDocumentBuffer()` - 라인 357, 395: 템플릿만 전달, isPreview 생략 → false
  - `regenerateAssemblyDocument()` - 라인 599, 614: 템플릿만 전달, isPreview 생략 → false

모든 실제 문서 생성 함수는 수정 없이 자동으로 마커를 표시하지 않게 됩니다.

### 추가 수정: renderStyledText 가운데 정렬 문제 해결 (2024-10-19)

#### 발생한 문제

실제 문서 생성 시(isPreview=false) 날짜와 조합명이 보이지 않는 문제가 발생했습니다.

#### 원인 분석

`renderStyledText()` 함수에서 마커가 없을 때 다음과 같이 처리했습니다:

```typescript
const hasStyle = segments.some(s => s.styles.color !== '#000000');
if (!hasStyle) {
  doc.text(text, options);
  return;
}
```

여기서 전달되는 `options`는 다음과 같았습니다:

```typescript
{
  width: doc.page.width,  // 페이지 전체 너비 (마진 포함)
  align: 'center'
}
```

**두 가지 문제**가 있었습니다:

1. `width: doc.page.width`는 마진을 포함한 전체 페이지 너비이기 때문에 콘텐츠 영역을 벗어남
2. X 좌표를 명시하지 않아서 테이블 그린 후 불확실한 `doc.x` 위치에서 렌더링됨

#### 해결 방법

1. `width`를 콘텐츠 영역 너비로 보정
2. X 좌표를 `doc.page.margins.left`로 명시적으로 설정

```typescript
const hasStyle = segments.some(s => s.styles.color !== '#000000');
if (!hasStyle) {
  // 마커가 없으면 일반 렌더링 (X 좌표 명시 필요)
  const correctedOptions = { ...options };

  // width가 페이지 전체 너비인 경우 콘텐츠 영역 너비로 보정
  if (correctedOptions.width === doc.page.width) {
    correctedOptions.width =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
  }

  // X 좌표를 명시적으로 설정 (테이블 그린 후 doc.x 위치가 불확실하므로)
  doc.text(text, doc.page.margins.left, doc.y, correctedOptions);
  return;
}
```

#### 수정된 파일

1. **lib/pdf/member-list-generator.ts**

   - `renderStyledText()` 함수에서 width 보정 및 X 좌표 명시 로직 추가

2. **lib/pdf/formation-agenda-generator.ts**
   - `renderStyledText()` 함수에서 width 보정 및 X 좌표 명시 로직 추가

이제 실제 문서 생성 시 날짜와 조합명이 정상적으로 가운데 정렬되어 표시됩니다.
