# 결성총회 의안 동의서 구현 기획

## 1. 개요

결성총회 생성 시 문서 생성 순서를 **의안 → 의안동의서 → 의사록**으로 변경하여, 조합원들의 의안 동의를 받을 수 있는 동의서를 추가합니다.

### 변경 사항

- **현재**: 의안 → 의사록 (2개)
- **변경**: 의안 → 의안동의서 → 의사록 (3개)

### 문서 저장 방식

의안 동의서는 **통합 PDF + 개별 PDF**를 모두 생성하여 저장합니다:

- **통합 PDF**: 관리자가 전체 조합원의 동의서를 한 번에 확인/다운로드
- **개별 PDF**: 각 조합원이 자신의 동의서를 다운로드 (대시보드 기능 예정) 및 이메일 발송용

**저장 이유**: 유저가 대시보드에서 언제든 즉시 다운로드 가능하도록 사전 생성

## 2. 주요 구현 사항

### 2.1 DB 구조 수정

**파일**: `supabase/migrations/xxx_add_split_document_support.sql` (신규)

`assembly_documents` 테이블에 개별 문서 지원을 위한 컬럼 추가:

```sql
ALTER TABLE assembly_documents
ADD COLUMN is_split_parent BOOLEAN DEFAULT false,
ADD COLUMN parent_document_id UUID REFERENCES assembly_documents(id),
ADD COLUMN member_id UUID REFERENCES profiles(id);

CREATE INDEX idx_assembly_documents_member_id
ON assembly_documents(member_id)
WHERE member_id IS NOT NULL;

COMMENT ON COLUMN assembly_documents.is_split_parent IS '통합 문서 여부 (개별 문서들의 부모)';
COMMENT ON COLUMN assembly_documents.parent_document_id IS '개별 문서의 경우 통합 문서 ID';
COMMENT ON COLUMN assembly_documents.member_id IS '개별 문서의 경우 해당 조합원 ID';
```

**문서 저장 구조**:

```typescript
// 통합 문서 (부모)
{
  id: 'doc-full-123',
  type: 'formation_consent_form',
  is_split_parent: true,
  member_id: null,
  pdf_storage_path: 'assemblies/456/consent_form_full.pdf',
  content: {
    member_pages: [
      { member_id: 'abc', member_name: '홍길동', page_number: 1 },
      // ...
    ]
  }
}

// 개별 문서들 (자식)
{
  id: 'doc-individual-789',
  type: 'formation_consent_form',
  is_split_parent: false,
  parent_document_id: 'doc-full-123',
  member_id: 'abc',
  pdf_storage_path: 'assemblies/456/consent_form_member_abc.pdf'
}
```

### 2.2 타입 정의 추가

**파일**: `types/assemblies.ts`

1. `AssemblyDocumentType`에 `formation_consent_form` 추가
2. `ASSEMBLY_DOCUMENT_TYPES.formation`에 `formation_consent_form` 추가
3. `DOCUMENT_TYPE_NAMES`에 한글명 추가: `'결성총회 의안 동의서'`
4. `AssemblyDocumentContent`에 `formation_consent_form?: FormationConsentFormContent` 추가
5. `AssemblyDocument` 인터페이스에 필드 추가:
   ```typescript
   is_split_parent?: boolean;
   parent_document_id?: string;
   member_id?: string;
   ```

### 2.3 템플릿 구조

**파일**: `template/formation-consent-form-template.json` (이미 생성됨)

- 규약 동의서(`lpa-consent-form-template.json`)와 동일한 구조 사용
- 변수: `${fundName}`, `${startDate}`, `${name}`, `${birthDateOrBusinessNumber}`, `${address}`, `${contact}`, `${shares}`, `${gpList}`

### 2.4 PDF 생성 및 분리 유틸

#### 2.4.1 통합 PDF 생성기

**신규 파일**: `lib/pdf/formation-consent-form-generator.ts`

- `lib/pdf/lpa-consent-form-generator.ts`를 참고하여 구현
- `generateFormationConsentFormPDF()` 함수 생성
- LP 조합원 전체에 대해 반복 페이지 생성
- 기존 `renderRepeatingPageAppendix()` 재사용
- **반환값**: `{ pdfBuffer: Buffer, memberPages: MemberPage[] }`
  ```typescript
  interface MemberPage {
    member_id: string;
    member_name: string;
    page_number: number; // 1-based
  }
  ```

#### 2.4.2 PDF 분리 유틸

**신규 파일**: `lib/pdf/pdf-splitter.ts`

PDF에서 특정 페이지를 추출하는 유틸 함수:

```typescript
import { PDFDocument } from 'pdf-lib';

export async function extractPdfPage(
  fullPdfBuffer: Buffer,
  pageNumber: number
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(fullPdfBuffer);
  const newPdf = await PDFDocument.create();

  const [page] = await newPdf.copyPages(pdfDoc, [pageNumber - 1]);
  newPdf.addPage(page);

  return Buffer.from(await newPdf.save());
}
```

### 2.5 문서 생성 로직 수정

**파일**: `lib/admin/assembly-documents.ts`

#### 2.5.1 문서 순서 정의

```typescript
const FORMATION_DOCUMENT_ORDER = [
  'formation_agenda',
  'formation_consent_form', // 추가
  'formation_minutes',
];
```

#### 2.5.2 `getNextDocumentInfo()` 수정

- `formation_consent_form` 생성 조건: `formation_agenda`가 이미 생성되어 있어야 함
- `formation_minutes` 생성 조건: `formation_consent_form`이 이미 생성되어 있어야 함

#### 2.5.3 `generateAssemblyDocumentBuffer()` 수정

- `case 'formation_consent_form'` 케이스 추가
- 의안 문서에서 조합원 정보 및 펀드 정보 조회
- **통합 PDF 생성 + 개별 PDF 생성**

#### 2.5.4 문서 저장 플로우

```typescript
// 1. 통합 PDF 생성
const { pdfBuffer, memberPages } = await generateFormationConsentFormPDF(...);

// 2. 통합 문서 저장
const parentDoc = await saveAssemblyDocument({
  type: 'formation_consent_form',
  is_split_parent: true,
  pdfBuffer,
  content: { member_pages: memberPages }
});

// 3. 개별 PDF 생성 및 저장
for (const memberPage of memberPages) {
  const individualPdfBuffer = await extractPdfPage(
    pdfBuffer,
    memberPage.page_number
  );

  await saveAssemblyDocument({
    type: 'formation_consent_form',
    is_split_parent: false,
    parent_document_id: parentDoc.id,
    member_id: memberPage.member_id,
    pdfBuffer: individualPdfBuffer,
    filename: `의안동의서_${memberPage.member_name}.pdf`
  });
}
```

### 2.6 에디터 설정

**파일**: `components/admin/assembly-documents/index.ts`

- `DOCUMENT_EDITORS`에 `formation_consent_form` 설정 추가
- `requiresInput: false` (자동 생성 문서)
- `EditorComponent`: 미리보기만 제공 (편집 불가)

### 2.7 템플릿 초기화 스크립트

- 생성하지 않음 (향후 기존 스크립트도 삭제 예정)

## 3. 렌더링 방식

### 3.1 반복 페이지 구조

- LP 조합원 1명당 1페이지 생성
- 각 페이지에 조합원 정보 자동 삽입
  - 성명, 생년월일/사업자번호, 주소, 연락처, 출자좌수

### 3.2 변수 치환

| 변수                           | 설명                     |
| ------------------------------ | ------------------------ |
| `${fundName}`                  | 펀드명                   |
| `${startDate}`                 | 총회 개최일              |
| `${name}`                      | 조합원 이름              |
| `${birthDateOrBusinessNumber}` | 생년월일 또는 사업자번호 |
| `${address}`                   | 주소                     |
| `${contact}`                   | 연락처                   |
| `${shares}`                    | 출자좌수                 |
| `${gpList}`                    | 업무집행조합원 명단      |

## 4. 구현 순서

1. **DB 마이그레이션** - `supabase/migrations/` 마이그레이션 파일 생성 (실행은 사용자가 수동)
2. **타입 정의** - `types/assemblies.ts` 수정
3. **PDF 분리 유틸** - `lib/pdf/pdf-splitter.ts` 구현
4. **통합 PDF 생성기** - `lib/pdf/formation-consent-form-generator.ts` 구현
5. **문서 생성 로직** - `lib/admin/assembly-documents.ts` 수정 (통합 + 개별 저장 플로우)
6. **에디터 설정** - `components/admin/assembly-documents/index.ts` 수정
7. **템플릿 초기화** - 스크립트 작성 및 실행 안내

## 5. 사용 시나리오

### 5.1 관리자

- 결성총회 생성 후 의안동의서 자동 생성 버튼 클릭
- 통합 PDF 미리보기 및 다운로드
- 개별 PDF 목록 확인 가능

### 5.2 이메일 발송

- 조합원별 개별 PDF를 자동으로 첨부하여 발송
- `member_id`로 해당 조합원의 개별 문서 조회

### 5.3 일반 유저 (향후 구현)

- 대시보드에서 "내 의안동의서" 다운로드
- 현재 로그인한 유저의 `member_id`로 개별 문서 조회

## 6. 추가 고려사항

### 6.1 성능

- 조합원 30명 기준, PDF 생성 시간 약 5-10초 예상
- 개별 PDF 저장 시간 추가 약 5초 (비동기 처리 가능)

### 6.2 저장 공간

- 1페이지 PDF 약 50-100KB
- 조합원 30명 기준: 통합 3MB + 개별 3MB = 총 6MB

### 6.3 에러 처리

- 통합 PDF 생성 실패 시 전체 롤백
- 개별 PDF 일부 실패 시 로그 기록 및 재시도 로직

### 6.4 향후 확장

- 규약 동의서(`lpa_consent_form`)에도 동일한 구조 적용 가능
- 전자서명 기능 추가 시 개별 문서에 서명 상태 추가

## 7. 참고 코드

- 규약 동의서 PDF 생성: `lib/pdf/lpa-consent-form-generator.ts`
- 규약 동의서 템플릿: `template/lpa-consent-form-template.json`
- 반복 페이지 렌더링: `lib/pdf/lpa-generator.ts`의 `renderRepeatingPageAppendix()`
- PDF 페이지 추출 라이브러리: `pdf-lib` 패키지
