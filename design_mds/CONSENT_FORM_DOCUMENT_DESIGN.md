# 규약 동의서 별도 문서화 설계 (리팩토링)

## 개요

기존에는 조합 규약(LPA) 생성 시 appendix2(별지2 - 규약 동의서)를 포함하거나 제외할 수 있었으나, 이를 완전히 별도의 독립 문서로 승격시켜 관리한다.

**중요**: 이 작업은 리팩토링으로, **기존 appendix2의 내용과 구조는 절대 변경되어서는 안 된다**. 문서의 위치와 관리 방식만 변경된다.

## 목표

- 규약 동의서(Appendix2)를 독립적인 문서 타입으로 관리
- 자동 생성 방식으로 관리자의 수정 없이 조합원 정보만으로 생성
- 기존 content/context 구조 유지로 버전 관리 및 diff 기능 지원
- **기존 appendix2의 정확한 구조 및 내용 100% 유지**

## 현재 상태 (AS-IS)

### 문서 생성 방식

- LPA 생성 시 appendix2 포함/제외 옵션 제공
- appendix2는 LPA의 일부로 관리됨
- 조합원 정보가 자동으로 채워지는 부록

### 문제점

- appendix2가 독립적인 문서로 관리되지 않음
- 규약과 별도로 생성/관리가 어려움
- 문서 생성 프로세스가 LPA에 종속적

## 변경 사항 (TO-BE)

### 1. 문서 타입 추가

#### document_templates 테이블

- 새로운 템플릿 타입 추가: `lpa_consent_form`
- 기존 appendix2 내용을 **그대로** 복사하여 독립 템플릿으로 생성
- 글로벌 템플릿으로 관리

```typescript
// 템플릿 타입 추가
type DocumentTemplateType =
  | 'lpa'
  | 'formation_minutes'
  | 'formation_agenda'
  | 'lpa_consent_form' // 새로 추가
  | ...
```

#### fund_documents 테이블

- 새로운 문서 타입으로 저장: `lpa_consent_form`
- 기존과 동일하게 content/context 구조 유지

```typescript
interface LpaConsentFormDocument {
  type: 'lpa_consent_form';
  content: LpaConsentFormTemplate; // 템플릿 구조 (기존 appendix2와 동일)
  context: LpaConsentFormContext; // 조합원 정보
}
```

### 2. 데이터 구조

#### 기존 Appendix2 구조 (변경 없음)

현재 LPA template의 appendix2 구조:

```json
{
  "id": "appendix2",
  "title": "조합원동의서",
  "type": "repeating-page",
  "filter": "lpMembers",
  "pageBreak": "before",
  "template": {
    "header": {
      "text": "< 별지 2 > 조합원 일괄 서명이 어려운 경우"
    },
    "title": "조 합 원 동 의 서",
    "content": [
      {
        "type": "paragraph",
        "text": "본인은 ${fundName}의 규약과 사업계획의 내용을 충분히 숙지하고 이에 동의하는 바, 본 규약을 수락하고 동의서에 날인합니다.",
        "align": "left"
      },
      { "type": "spacer", "lines": 3 },
      {
        "type": "date-field",
        "format": "년    월    일",
        "align": "center"
      },
      { "type": "spacer", "lines": 3 },
      {
        "type": "form-fields",
        "fields": [
          { "label": "성    명", "variable": "${name}", "seal": true },
          { "label": "생년월일", "variable": "${birthDateOrBusinessNumber}" },
          { "label": "주    소", "variable": "${address}" },
          { "label": "연 락 처", "variable": "${contact}" },
          { "label": "출자좌수", "variable": "${shares}좌" }
        ]
      },
      { "type": "spacer", "lines": 5 },
      { "type": "paragraph", "text": "${fundName}", "align": "right" },
      { "type": "paragraph", "text": "업무집행조합원", "align": "right" },
      { "type": "paragraph", "text": "${gpList} 귀하", "align": "right" }
    ]
  }
}
```

#### LpaConsentFormTemplate

**위 구조를 그대로 유지**하되, 독립 문서의 템플릿으로 저장:

```typescript
interface LpaConsentFormTemplate {
  id: string;
  title: string;
  type: 'repeating-page';
  filter: 'lpMembers';
  pageBreak?: string;
  template: {
    header: {
      text: string;
    };
    title: string;
    content: AppendixContentElement[]; // 기존 타입 그대로 사용
  };
}

// 기존 lib/pdf/types.ts의 AppendixContentElement 타입 재사용
interface AppendixContentElement {
  type:
    | 'paragraph'
    | 'spacer'
    | 'date-field'
    | 'form-fields'
    | 'table'
    | 'signature-field';
  text?: string;
  align?: 'left' | 'center' | 'right';
  lines?: number;
  format?: string;
  fields?: Array<{
    label: string;
    variable: string;
    seal?: boolean;
  }>;
}
```

#### LpaConsentFormContext

조합원 정보를 담는 컨텍스트:

```typescript
interface LpaConsentFormContext {
  fund: {
    name: string;
    nameEn?: string;
  };
  gpList: string; // GP 조합원 리스트 (쉼표로 구분)
  lpMembers: Array<{
    name: string;
    address: string;
    birthDateOrBusinessNumber: string;
    contact: string;
    shares: number;
  }>;
  generatedAt: string;
  templateVersion: string;
}
```

### 3. UI 변경사항

#### 문서 생성 섹션 구조

```
문서 생성
├── 조합 규약 (LPA)
│   ├── 미리보기
│   ├── 수정
│   └── 생성
└── 규약 동의서 [새로 추가]
    ├── 미리보기
    └── 생성 (수정 버튼 없음)
```

#### 규약 동의서 섹션 특징

- **미리보기**: 현재 조합원 정보로 생성될 문서 미리보기
- **생성 버튼**:
  - 조합원 정보가 이전과 동일하면 비활성화
  - 조합원 정보가 변경되었거나 최초 생성이면 활성화
  - 버튼 텍스트: "규약 동의서 생성"
- **수정 기능 없음**: 템플릿에서 자동 생성만 가능
- **Diff 표시**: 이전 버전과 차이점 표시
  - 조합원 정보 변경으로 인한 diff
  - 글로벌 템플릿 변경으로 인한 diff

### 4. 생성 로직

#### 생성 조건

1. **최초 생성**: 해당 펀드의 규약 동의서가 없는 경우
2. **조합원 정보 변경**: 기존 문서의 context.members와 현재 조합원 정보가 다른 경우
3. **템플릿 변경**: 글로벌 템플릿 버전이 업데이트된 경우

#### 생성 프로세스

```typescript
async function generateLpaConsentForm(fundId: string) {
  // 1. 최신 글로벌 템플릿 가져오기
  const { data: templateData } = await supabase
    .from('document_templates')
    .select('*')
    .eq('type', 'lpa_consent_form')
    .eq('is_active', true)
    .single();

  const template = templateData.content as LpaConsentFormTemplate;

  // 2. 현재 조합원 정보 가져오기 (기존 LPA context 생성 로직 재사용)
  const context = await buildLpaConsentFormContext(fundId);

  // 3. 문서 저장 (content + context 구조)
  const { data: document } = await supabase
    .from('fund_documents')
    .insert({
      fund_id: fundId,
      type: 'lpa_consent_form',
      content: template, // 템플릿 스냅샷
      context: context, // 조합원 정보
      version: templateData.version,
      template_id: templateData.id,
    })
    .select()
    .single();

  // 4. PDF 생성 (기존 renderRepeatingPageAppendix 로직 재사용)
  const pdfBuffer = await generateLpaConsentFormPDF(template, context);

  // 5. Storage 업로드
  const pdfUrl = await uploadConsentFormPDF(fundId, document.id, pdfBuffer);

  // 6. PDF URL 업데이트
  await supabase
    .from('fund_documents')
    .update({ pdf_url: pdfUrl })
    .eq('id', document.id);

  return document;
}

// 컨텍스트 생성 (기존 LPA 로직 재사용)
async function buildLpaConsentFormContext(
  fundId: string
): Promise<LpaConsentFormContext> {
  const fund = await getFundInfo(fundId);
  const members = await getFundMembers(fundId);

  const gpMembers = members.filter(m => m.member_type === 'gp');
  const lpMembers = members.filter(m => m.member_type === 'lp');

  return {
    fund: {
      name: fund.name,
      nameEn: fund.name_en,
    },
    gpList: gpMembers.map(m => m.name).join(', '),
    lpMembers: lpMembers.map(m => ({
      name: m.name,
      address: m.address,
      birthDateOrBusinessNumber: m.birth_date || m.business_number,
      contact: m.phone,
      shares: m.shares,
    })),
    generatedAt: new Date().toISOString(),
    templateVersion: template.version,
  };
}
```

### 5. Diff 기능

#### Diff 발생 시나리오

1. **조합원 추가/제거**: context.lpMembers 배열 변경
2. **조합원 정보 수정**: 기존 조합원의 정보 변경 (이름, 주소, 연락처, 출자좌수 등)
3. **GP 조합원 변경**: context.gpList 변경
4. **템플릿 업데이트**: 글로벌 템플릿의 content 변경 (드물게 발생)

#### Diff 표시 방식

```typescript
interface LpaConsentFormDiff {
  hasChanges: boolean;
  contextChanges?: {
    lpMembersAdded: string[]; // 추가된 LP 조합원 이름
    lpMembersRemoved: string[]; // 제거된 LP 조합원 이름
    lpMembersModified: Array<{
      name: string;
      changes: Record<string, { old: string; new: string }>;
    }>;
    gpListChanged?: { old: string; new: string };
  };
  templateChanges?: {
    versionChanged: { old: string; new: string };
    contentModified: boolean;
  };
}

// 조합원 정보 비교
function compareLpMembers(
  oldContext: LpaConsentFormContext,
  newContext: LpaConsentFormContext
): LpaConsentFormDiff {
  const oldMembers = oldContext.lpMembers;
  const newMembers = newContext.lpMembers;

  // 이름 기준으로 비교
  const oldNames = new Set(oldMembers.map(m => m.name));
  const newNames = new Set(newMembers.map(m => m.name));

  const added = newMembers.filter(m => !oldNames.has(m.name));
  const removed = oldMembers.filter(m => !newNames.has(m.name));
  const modified = newMembers
    .filter(m => oldNames.has(m.name))
    .map(newMember => {
      const oldMember = oldMembers.find(om => om.name === newMember.name);
      const changes: Record<string, { old: string; new: string }> = {};

      if (oldMember.address !== newMember.address) {
        changes.address = { old: oldMember.address, new: newMember.address };
      }
      if (oldMember.contact !== newMember.contact) {
        changes.contact = { old: oldMember.contact, new: newMember.contact };
      }
      if (oldMember.shares !== newMember.shares) {
        changes.shares = {
          old: oldMember.shares.toString(),
          new: newMember.shares.toString(),
        };
      }

      return Object.keys(changes).length > 0
        ? { name: newMember.name, changes }
        : null;
    })
    .filter(Boolean);

  return {
    hasChanges:
      added.length > 0 ||
      removed.length > 0 ||
      modified.length > 0 ||
      oldContext.gpList !== newContext.gpList,
    contextChanges: {
      lpMembersAdded: added.map(m => m.name),
      lpMembersRemoved: removed.map(m => m.name),
      lpMembersModified: modified,
      gpListChanged:
        oldContext.gpList !== newContext.gpList
          ? { old: oldContext.gpList, new: newContext.gpList }
          : undefined,
    },
  };
}
```

### 6. 버전 관리

#### content/context 구조 유지 이유

- **템플릿 독립성**: 글로벌 템플릿이 삭제되어도 문서 재구성 가능
- **버전 관리**: 문서 생성 시점의 템플릿 보존
- **Diff 계산**: 이전 버전과의 정확한 비교 가능
- **감사 추적**: 어떤 템플릿과 데이터로 생성되었는지 추적 가능

#### 저장 구조

```typescript
interface FundDocument {
  id: string;
  fund_id: string;
  type: 'lpa_consent_form';
  content: LpaConsentFormTemplate; // 생성 시점의 템플릿 스냅샷 (appendix2와 동일 구조)
  context: LpaConsentFormContext; // 생성 시점의 조합원 정보
  version: string; // 템플릿 버전
  template_id?: string; // 글로벌 템플릿 참조
  created_at: string;
  pdf_url?: string;
}
```

### 7. PDF 생성

#### PDF 생성기

**기존 LPA PDF 생성 로직을 최대한 재사용**:

```typescript
// lib/pdf/lpa-consent-form-generator.ts
import { renderRepeatingPageAppendix } from './lpa-generator';
import type {
  LpaConsentFormTemplate,
  LpaConsentFormContext,
} from '@/types/assemblies';

export async function generateLpaConsentFormPDF(
  template: LpaConsentFormTemplate,
  context: LpaConsentFormContext
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 30, left: 50, right: 50 },
    font: getFontPath(),
  });

  registerKoreanFonts(doc);

  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  const currentPageNumber = { value: 0 };

  // 기존 appendix2 렌더링 로직 재사용
  const lpaContext = buildLpaContextFromConsentFormContext(context);

  await renderRepeatingPageAppendix(
    doc,
    {
      id: template.id,
      title: template.title,
      type: template.type,
      filter: template.filter,
      template: template.template,
    },
    context.lpMembers,
    lpaContext,
    currentPageNumber,
    { generateAllConsents: true } // 항상 모든 조합원 생성
  );

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

// LpaContext 형식으로 변환 (기존 함수 재사용을 위해)
function buildLpaContextFromConsentFormContext(
  context: LpaConsentFormContext
): LPAContext {
  return {
    fund: context.fund,
    gpList: context.gpList,
    lpMembers: context.lpMembers,
    // ... 기타 필요한 필드
  };
}
```

**핵심**: 기존 `renderRepeatingPageAppendix` 함수를 그대로 재사용하여 PDF를 생성한다. 이로써 appendix2의 렌더링 로직이 완전히 동일하게 유지된다.

### 8. API 엔드포인트

#### 생성 API

- `POST /api/admin/funds/[fundId]/documents/lpa-consent-form/generate`
  - 규약 동의서 생성
  - 조합원 정보 자동 수집 및 적용
  - PDF 생성 및 Storage 업로드

#### 조회 API

- `GET /api/admin/funds/[fundId]/documents/lpa-consent-form`
  - 최신 규약 동의서 조회
  - `GET /api/admin/funds/[fundId]/documents/lpa-consent-form/history`
    - 버전 히스토리 조회

#### 미리보기 API

- `POST /api/admin/funds/[fundId]/documents/lpa-consent-form/preview`
  - 현재 조합원 정보로 생성될 PDF 미리보기
  - 실제 저장 없이 렌더링만 수행
  - PDF Buffer를 반환하여 프론트엔드에서 표시

#### Diff API

- `GET /api/admin/funds/[fundId]/documents/lpa-consent-form/diff`
  - 이전 버전과의 차이점 계산
  - 조합원 변경사항 및 템플릿 변경사항 반환
  - 응답 형식: `LpaConsentFormDiff`

### 9. 컴포넌트 구조

```
components/admin/
├── lpa-consent-form/
│   ├── LpaConsentFormSection.tsx           # 메인 섹션 컴포넌트
│   ├── LpaConsentFormPreview.tsx           # 미리보기 컴포넌트
│   ├── LpaConsentFormDiffViewer.tsx        # Diff 표시 컴포넌트
│   └── LpaConsentFormGenerateButton.tsx    # 생성 버튼 컴포넌트
```

#### LpaConsentFormSection.tsx

```typescript
export function LpaConsentFormSection({ fundId }: { fundId: string }) {
  // 최신 문서 조회
  const { data: latestDocument } = useLpaConsentForm(fundId);

  // Diff 조회
  const { data: diff } = useLpaConsentFormDiff(fundId);

  // 생성 중 상태
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateLpaConsentForm(fundId);
      toast.success('규약 동의서가 생성되었습니다.');
    } catch (error) {
      toast.error('생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">규약 동의서</h3>
        <span className="text-sm text-muted-foreground">
          조합원 정보가 자동으로 채워지는 문서입니다
        </span>
      </div>

      {/* 미리보기 */}
      <LpaConsentFormPreview fundId={fundId} document={latestDocument} />

      {/* Diff 표시 */}
      {diff?.hasChanges && <LpaConsentFormDiffViewer diff={diff} />}

      {/* 생성 버튼 */}
      <LpaConsentFormGenerateButton
        fundId={fundId}
        disabled={!diff?.hasChanges}
        isGenerating={isGenerating}
        onGenerate={handleGenerate}
      />

      {/* 최신 문서가 없을 때 안내 */}
      {!latestDocument && (
        <Alert>
          <AlertDescription>
            아직 규약 동의서가 생성되지 않았습니다. 생성 버튼을 눌러 문서를
            생성하세요.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

### 10. 초기 템플릿 생성

#### 마이그레이션 스크립트

```typescript
// scripts/initialize-lpa-consent-form-template.ts
import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

async function initializeLpaConsentFormTemplate() {
  // 기존 LPA template에서 appendix2를 그대로 가져옴
  const lpaTemplatePath = join(process.cwd(), 'template/lpa-template.json');
  const lpaTemplate = JSON.parse(readFileSync(lpaTemplatePath, 'utf-8'));

  // appendix2 찾기
  const appendix2 = lpaTemplate.appendix.find((a: any) => a.id === 'appendix2');

  if (!appendix2) {
    throw new Error('LPA template에서 appendix2를 찾을 수 없습니다.');
  }

  // 동일한 구조로 템플릿 생성
  const template: LpaConsentFormTemplate = {
    id: 'lpa_consent_form',
    title: appendix2.title,
    type: appendix2.type,
    filter: appendix2.filter,
    pageBreak: appendix2.pageBreak,
    template: appendix2.template,
  };

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // document_templates에 삽입
  const { error } = await supabase.from('document_templates').insert({
    type: 'lpa_consent_form',
    content: template,
    version: '1.0.0',
    is_active: true,
    name: '규약 동의서',
    description: 'LPA 조합원 동의서 (별지2) - 조합원별 서명용',
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('템플릿 생성 실패:', error);
    throw error;
  }

  console.log('✅ LPA 규약 동의서 템플릿 초기화 완료');
  console.log('   - 타입: lpa_consent_form');
  console.log('   - 버전: 1.0.0');
  console.log('   - 구조: 기존 appendix2와 100% 동일');
}

initializeLpaConsentFormTemplate().catch(console.error);
```

**중요**: 이 스크립트는 `template/lpa-template.json`의 appendix2를 **그대로** 복사하여 템플릿을 생성한다. 어떤 내용도 수정하지 않는다.

## 구현 순서

### Phase 1: 데이터 모델 및 타입 정의

1. `types/assemblies.ts`에 ConsentForm 관련 타입 추가
2. `types/database.ts`에 DB 스키마 타입 추가
3. 마이그레이션 파일 생성

### Phase 2: 템플릿 생성

1. 초기 템플릿 생성 스크립트 작성
2. `document_templates` 테이블에 템플릿 삽입

### Phase 3: 백엔드 로직

1. `lib/admin/consent-form.ts` 생성 로직 구현
2. API 엔드포인트 구현
3. PDF 생성기 구현

### Phase 4: 프론트엔드 UI

1. 컴포넌트 구조 생성
2. 미리보기 기능 구현
3. Diff 뷰어 구현
4. 생성 버튼 및 상태 관리

### Phase 5: 통합 및 테스트

1. 기존 LPA 생성 로직에서 appendix2 제거
2. 전체 플로우 테스트
3. 버전 관리 및 Diff 테스트

## 데이터베이스 변경사항

### document_templates 테이블

```sql
-- 이미 존재하는 테이블에 새로운 타입 추가
-- type 컬럼의 enum에 'lpa_consent_form' 추가
```

### fund_documents 테이블

```sql
-- 이미 존재하는 테이블 사용
-- type 컬럼의 enum에 'lpa_consent_form' 추가
```

### 마이그레이션 파일

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_lpa_consent_form_document_type.sql

-- document_templates의 type enum 업데이트
ALTER TABLE document_templates
DROP CONSTRAINT IF EXISTS document_templates_type_check;

ALTER TABLE document_templates
ADD CONSTRAINT document_templates_type_check
CHECK (type IN (
  'lpa',
  'formation_minutes',
  'formation_agenda',
  'member_list',
  'plan',
  'lpa_consent_form'  -- 새로 추가
));

-- fund_documents의 type enum 업데이트
ALTER TABLE fund_documents
DROP CONSTRAINT IF EXISTS fund_documents_type_check;

ALTER TABLE fund_documents
ADD CONSTRAINT fund_documents_type_check
CHECK (type IN (
  'lpa',
  'formation_minutes',
  'formation_agenda',
  'member_list',
  'plan',
  'lpa_consent_form'  -- 새로 추가
));

-- 코멘트 추가
COMMENT ON CONSTRAINT document_templates_type_check ON document_templates
IS 'lpa_consent_form: LPA 조합원 동의서 (기존 appendix2를 독립 문서로 승격)';
```

## 주의사항

### 1. 기존 LPA와의 분리

- LPA 생성 시 appendix2 관련 로직 제거
  - `template/lpa-template.json`에서 appendix2 항목 제거
  - LPA 생성 API에서 appendix2 필터링 로직 제거
- **기존 생성된 LPA의 appendix2는 유지** (히스토리 보존, 삭제 금지)
- 향후 LPA는 appendix1(조합원 서명란)만 포함
- **중요**: PDF 렌더링 로직(`renderRepeatingPageAppendix`)은 재사용을 위해 유지

### 2. 조합원 정보 동기화

- 규약 동의서는 항상 최신 조합원 정보를 반영
- 조합원 추가/제거/수정 시 자동으로 diff 표시
- 생성 버튼 활성화 조건 명확히 처리

### 3. 템플릿 버전 관리

- 글로벌 템플릿 업데이트 시 기존 문서에 영향 없음
- 각 문서는 생성 시점의 템플릿 스냅샷 보유
- 템플릿 변경 시 diff 표시로 관리자에게 알림

### 4. 사용자 경험

- 수정 불가능한 문서임을 명확히 표시
- 생성 버튼 비활성화 시 이유 툴팁 제공
- Diff 표시로 무엇이 변경되었는지 명확히 안내

## 향후 확장 가능성

### 1. 다른 자동 생성 문서

- 규약 동의서와 유사한 패턴의 다른 문서 추가 가능
- 조합원 명부(member_list) 등도 동일한 방식으로 처리 가능

### 2. 조합원 일괄 서명

- 향후 전자서명 기능 추가 시 활용 가능
- 각 조합원에게 서명 요청 및 수집

### 3. 문서 패키지

- LPA + 규약 동의서를 하나의 패키지로 관리
- 일괄 생성 및 다운로드 기능

## 참고사항

### 기존 코드 위치

- **Appendix2 구조**: `template/lpa-template.json` (line 1573-1649)
- **PDF 렌더링**: `lib/pdf/lpa-generator.ts`의 `renderRepeatingPageAppendix` 함수
- **타입 정의**: `lib/pdf/types.ts`의 `AppendixDefinition`, `AppendixContentElement`
- **조합원 정보**: `fund_members` 테이블
- **컨텍스트 생성**: `lib/admin/lpa-context.ts`

### 사용 기술

- PDF 생성: pdf-lib + pdfkit
- 한글 폰트: NanumGothic
- 기존 문서 생성 패턴: `lib/admin/assembly-documents.ts` 참고

### 리팩토링 원칙

1. **구조 보존**: appendix2의 JSON 구조를 100% 그대로 유지
2. **로직 재사용**: 기존 PDF 렌더링 함수를 최대한 재사용
3. **타입 재사용**: 기존 `AppendixDefinition`, `AppendixContentElement` 타입 재사용
4. **히스토리 보존**: 기존 생성된 LPA 문서는 절대 수정하지 않음
5. **점진적 전환**: LPA와 규약 동의서를 독립적으로 생성 가능하도록
