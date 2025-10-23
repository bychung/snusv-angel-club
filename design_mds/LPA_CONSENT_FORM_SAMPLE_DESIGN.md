# 규약 문서 내 동의서 샘플 렌더링 기획

## 1. 개요

규약 생성 시 별지2(조합원 동의서)를 **빈 샘플 형태**로 포함시키는 기능을 구현합니다.

- 동의서 실제 생성은 별도 프로세스로 진행 (기존 유지)
- 규약 문서에는 참고용 빈 양식 1개만 포함
- 템플릿 중복 없이 단일 소스 원칙 유지

## 2. 핵심 설계

### 2.1 템플릿 참조 방식 (Template Reference)

동의서 템플릿은 **DB 우선** (fallback: 파일)으로 로드하며,
규약 템플릿에서는 **참조**만 추가합니다.

**템플릿 로딩 순서:**

1. `document_templates` 테이블 (펀드별 → 글로벌)
2. `template/lpa-consent-form-template.json` (fallback)

### 2.2 새로운 Appendix 타입: `sample`

기존 타입:

- `repeating-section`: 섹션 반복 (별지1)
- `repeating-page`: 페이지 반복 (동의서 실제 생성)

신규 타입:

- **`sample`**: 빈 샘플 1개만 렌더링

## 3. 데이터 구조

### 3.1 lpa-template.json 변경

`appendix` 배열에 appendix2 추가:

```json
{
  "appendix": [
    {
      "id": "appendix1",
      "title": "조합원서명란",
      "type": "repeating-section",
      "filter": "gpMembers",
      "template": {
        // ... 기존 별지1 구조
      }
    },
    {
      "id": "appendix2",
      "title": "조합원 동의서",
      "type": "sample",
      "template": {
        "ref": "lpa-consent-form-template",
        "context": ["fundName", "gpList", "startDate"]
      }
    }
  ]
}
```

### 3.2 필드 설명

#### `type: "sample"`

- 빈 샘플 렌더링 타입임을 명시
- 1개의 페이지만 생성
- 조합원 정보는 더미 데이터 사용

#### `template.ref`

- 외부 템플릿 파일명 (확장자 제외)
- 이 값이 있으면 외부 템플릿을 로드

#### `template.context`

- 외부 템플릿에서 **실제 값으로 채울 변수 목록**
- 이 목록에 있는 변수만 실제 데이터 사용
- 나머지 조합원 정보(`name`, `address` 등)는 빈 값 또는 예시 텍스트

### 3.3 Context 처리 예시

```typescript
// fundName, gpList, startDate는 실제 값 사용
context = {
  fundName: '서울대벤처투자조합 1호', // 실제
  gpList: '홍길동, 김철수', // 실제
  startDate: '2024. 1. 1.', // 실제

  // 조합원 정보는 더미 (샘플용)
  name: '',
  birthDateOrBusinessNumber: '',
  address: '',
  contact: '',
  shares: '',
};
```

## 4. 구현 계획

### 4.1 타입 정의 추가

**파일**: `types/documents.ts` 또는 `lib/pdf/types.ts`

```typescript
export interface AppendixDefinition {
  id: string;
  title: string;
  type: 'repeating-section' | 'repeating-page' | 'sample'; // sample 추가
  filter?: AppendixFilter;
  template: AppendixTemplate | AppendixTemplateReference; // Union 타입
}

// 기존: 인라인 템플릿
export interface AppendixTemplate {
  header?: { text: string };
  title?: string;
  sections?: any[];
  content?: any[];
}

// 신규: 외부 템플릿 참조
export interface AppendixTemplateReference {
  ref: string; // 템플릿 파일명
  context: string[]; // 실제 값으로 채울 변수 목록
}
```

### 4.2 템플릿 로더 함수

**파일**: `lib/pdf/template-loader.ts` (신규)

```typescript
import { createBrandServerClient } from '@/lib/supabase/server';
import fs from 'fs/promises';
import path from 'path';

/**
 * 외부 템플릿 로드 (DB 우선, 파일 fallback)
 *
 * @param templateRef - 템플릿 참조 이름 (예: 'lpa-consent-form-template')
 * @param fundId - 펀드 ID (optional, 펀드별 템플릿이 있는 경우)
 * @returns 템플릿 content 부분
 */
export async function loadExternalTemplate(
  templateRef: string,
  fundId?: string
): Promise<any> {
  // 1. DB에서 템플릿 조회 시도
  try {
    const supabase = await createBrandServerClient();

    // templateRef를 DB의 type으로 변환
    // 예: 'lpa-consent-form-template' -> 'lpa_consent_form'
    const templateType = templateRefToDbType(templateRef);

    // 펀드별 템플릿 우선 조회
    if (fundId) {
      const { data: fundTemplate } = await supabase.documentTemplates
        .select('*')
        .eq('type', templateType)
        .eq('fund_id', fundId)
        .eq('is_active', true)
        .maybeSingle();

      if (fundTemplate) {
        console.log(`외부 템플릿 로드 (펀드별): ${templateRef}`);
        return fundTemplate.content;
      }
    }

    // 글로벌 템플릿 조회
    const { data: globalTemplate } = await supabase.documentTemplates
      .select('*')
      .eq('type', templateType)
      .is('fund_id', null)
      .eq('is_active', true)
      .maybeSingle();

    if (globalTemplate) {
      console.log(`외부 템플릿 로드 (글로벌 DB): ${templateRef}`);
      return globalTemplate.content;
    }
  } catch (error) {
    console.warn(`DB 템플릿 조회 실패, 파일로 fallback: ${templateRef}`, error);
  }

  // 2. DB에 없으면 파일에서 로드 (fallback)
  const templatePath = path.join(
    process.cwd(),
    'template',
    `${templateRef}.json`
  );

  try {
    const content = await fs.readFile(templatePath, 'utf-8');
    const parsed = JSON.parse(content);
    console.log(`외부 템플릿 로드 (파일): ${templateRef}`);
    return parsed.content || parsed; // content 필드가 있으면 그것을, 없으면 전체
  } catch (fileError) {
    throw new Error(
      `외부 템플릿을 찾을 수 없습니다: ${templateRef}. ` +
        `파일 경로: ${templatePath}`
    );
  }
}

/**
 * 템플릿 참조 이름을 DB 타입으로 변환
 *
 * @param templateRef - 템플릿 파일명 (예: 'lpa-consent-form-template')
 * @returns DB type (예: 'lpa_consent_form')
 */
function templateRefToDbType(templateRef: string): string {
  // 매핑 테이블
  const mapping: Record<string, string> = {
    'lpa-consent-form-template': 'lpa_consent_form',
    'lpa-template': 'lpa',
    'plan-template': 'plan',
    'member-list-template': 'member-list',
    // 필요시 추가
  };

  return mapping[templateRef] || templateRef;
}

/**
 * 템플릿이 외부 참조인지 확인
 */
export function isTemplateReference(
  template: any
): template is AppendixTemplateReference {
  return 'ref' in template && typeof template.ref === 'string';
}
```

**주요 특징:**

- **DB 우선**: `document_templates` 테이블에서 먼저 조회
- **펀드별 우선**: `fundId`가 있으면 펀드 전용 템플릿 먼저 확인
- **글로벌 Fallback**: 펀드별 없으면 글로벌 템플릿
- **파일 Fallback**: DB에 없으면 파일 시스템에서 로드
- **타입 매핑**: 파일명(`lpa-consent-form-template`)을 DB 타입(`lpa_consent_form`)으로 변환

### 4.3 더미 데이터 생성 함수

**파일**: `lib/pdf/lpa-generator.ts`

```typescript
/**
 * 샘플용 더미 조합원 데이터 생성
 *
 * @param contextFields - 실제 값으로 채울 필드 목록
 * @param actualContext - 실제 컨텍스트 데이터
 */
function createDummyMember(
  contextFields: string[],
  actualContext: LPAContext
): any {
  const dummy = {
    id: 'dummy',
    name: '',
    member_type: 'LP' as const,
    total_units: 0,
    total_amount: 0,
    initial_amount: 0,
    email: '',
    address: '',
    birth_date: '',
    business_number: null,
    phone: '',
    entity_type: 'individual' as const,
  };

  // context 필드는 실제 값 사용
  // fundName, gpList, startDate는 더미 멤버가 아닌 context에서 가져옴

  return dummy;
}
```

### 4.4 샘플 렌더링 함수

**파일**: `lib/pdf/lpa-generator.ts`

```typescript
import { loadExternalTemplate, isTemplateReference } from './template-loader';
import { renderRepeatingPageAppendix } from './lpa-consent-form-generator';

/**
 * 샘플 별지 렌더링
 */
async function renderSampleAppendix(
  doc: any,
  appendixDef: AppendixDefinition,
  context: LPAContext,
  currentPageNumber: { value: number }
): Promise<void> {
  // 외부 템플릿 로드
  if (!isTemplateReference(appendixDef.template)) {
    console.error('sample 타입은 templateRef가 필요합니다');
    return;
  }

  // fundId 전달하여 펀드별 템플릿 우선 조회
  const externalTemplate = await loadExternalTemplate(
    appendixDef.template.ref,
    context.fund.id // fundId 전달
  );

  // 더미 조합원 1명 생성
  const dummyMember = createDummyMember(appendixDef.template.context, context);

  // context 필드만 실제 값으로 설정한 컨텍스트
  const sampleContext: LPAContext = {
    ...context,
    // fundName, gpList, startDate는 이미 context.fund, context.members에 있음
  };

  // 기존 renderRepeatingPageAppendix 재사용
  // 더미 멤버 1개만 전달하여 1페이지만 생성
  const appendixForRender = {
    template: externalTemplate, // loadExternalTemplate이 content만 반환
  } as any;

  await renderRepeatingPageAppendix(
    doc,
    appendixForRender,
    [dummyMember],
    sampleContext,
    currentPageNumber
  );
}
```

### 4.5 메인 렌더링 함수 수정

**파일**: `lib/pdf/lpa-generator.ts`의 `renderAppendix` 함수

```typescript
async function renderAppendix(
  doc: any,
  appendixDef: AppendixDefinition,
  context: LPAContext,
  currentPageNumber: { value: number }
): Promise<void> {
  // 필터에 따라 조합원 선택 (sample은 제외)
  if (appendixDef.type === 'sample') {
    await renderSampleAppendix(doc, appendixDef, context, currentPageNumber);
    return;
  }

  const members = filterMembers(appendixDef.filter, context);

  if (members.length === 0) {
    console.log(`별지 ${appendixDef.id}: 렌더링할 조합원이 없습니다.`);
    return;
  }

  if (appendixDef.type === 'repeating-section') {
    await renderRepeatingSectionAppendix(
      doc,
      appendixDef,
      members,
      context,
      currentPageNumber
    );
  }
  // repeating-page 타입은 현재 규약 생성에서 사용하지 않음
  // (동의서 별도 생성에서만 사용)
}
```

## 5. 작업 순서

### Phase 1: 타입 및 유틸 추가

1. ✅ 타입 정의 추가 (`AppendixTemplateReference`, type에 `sample` 추가)
2. ✅ `template-loader.ts` 생성 및 함수 구현

### Phase 2: 렌더링 로직 구현

3. ✅ `createDummyMember` 함수 구현
4. ✅ `renderSampleAppendix` 함수 구현
5. ✅ `renderAppendix` 함수에 sample 타입 처리 추가

### Phase 3: 템플릿 수정

6. ✅ `lpa-template.json`에 appendix2 추가

### Phase 4: 테스트

7. ✅ 규약 미리보기로 샘플 렌더링 확인
8. ✅ 실제 규약 생성으로 최종 확인
9. ✅ 동의서 별도 생성 기능 정상 작동 확인

## 6. 예상 결과

### 6.1 규약 PDF 구조

```
[표지]
제1장 총칙
  ...
제9장 보칙
부칙

< 별지 1 >
조합원 서명란
  업무집행조합원: 홍길동 (실제 데이터)
  업무집행조합원: 김철수 (실제 데이터)

< 별지 2 > 조합원 일괄 서명이 어려운 경우
조합원 동의서
  본인은 서울대벤처투자조합 1호의 규약과... (fundName 실제)

  2024. 1. 1.                              (startDate 실제)

  성    명 : _______________ (인)           (빈 샘플)
  생년월일 : _______________               (빈 샘플)
  주    소 : _______________               (빈 샘플)
  연 락 처 : _______________               (빈 샘플)
  출자좌수 : _______좌                      (빈 샘플)

  서울대벤처투자조합 1호                    (fundName 실제)
  업무집행조합원
  홍길동, 김철수 귀하                       (gpList 실제)
```

### 6.2 동의서 별도 생성 (기존 유지)

- LP 조합원 수만큼 페이지 생성
- 모든 필드에 실제 데이터 입력

## 7. 장점

### 7.1 단일 소스 원칙 (Single Source of Truth)

- 동의서 템플릿은 `lpa-consent-form-template.json` 1개만 존재
- 템플릿 수정 시 한 곳만 변경하면 됨

### 7.2 명확한 역할 분리

- `lpa-template.json`: 규약 본문 + 별지 구조 정의
- `lpa-consent-form-template.json`: 동의서 실제 내용

### 7.3 유연한 확장성

- 다른 외부 템플릿도 동일한 방식으로 참조 가능
- `context` 필드로 어떤 값을 채울지 명확히 제어

### 7.4 기존 기능 유지

- 동의서 별도 생성 기능은 그대로 유지
- 규약 생성과 동의서 생성이 서로 독립적

## 8. 주의사항

### 8.1 템플릿 로딩 우선순위

외부 템플릿 로딩은 다음 순서로 진행됩니다:

1. **펀드별 템플릿** (DB): `fund_id = {fundId}`, `is_active = true`
2. **글로벌 템플릿** (DB): `fund_id = null`, `is_active = true`
3. **파일 시스템** (Fallback): `template/{templateRef}.json`

### 8.2 템플릿 타입 매핑

파일명과 DB 타입 매핑이 정확해야 합니다:

| 파일명 (templateRef)        | DB 타입 (type)     |
| --------------------------- | ------------------ |
| `lpa-consent-form-template` | `lpa_consent_form` |
| `lpa-template`              | `lpa`              |
| `plan-template`             | `plan`             |
| `member-list-template`      | `member-list`      |

**신규 템플릿 추가 시** `templateRefToDbType` 함수의 매핑 테이블 업데이트 필요

### 8.3 템플릿 존재 확인

- DB와 파일 모두에서 템플릿을 찾을 수 없으면 명확한 에러 메시지
- 에러 메시지에 DB 오류와 파일 경로 포함

### 8.4 Context 필드 검증

- `template.context`에 명시된 변수가 실제 컨텍스트에 있는지 확인
- 없는 변수는 경고 로그 출력

### 8.5 빈 값 표시 방식

- `name: ""`처럼 완전히 비우면 언더바(`___`)가 안 보일 수 있음
- 필요시 `name: "_______________"` 같은 placeholder 사용

### 8.6 Preview 모드 호환성

- 기존 preview 모드(<<PREVIEW>> 마커)와의 충돌 방지
- 샘플은 preview와 별개로 항상 빈 값

### 8.7 DB 템플릿 버전 관리

- 펀드별 템플릿 수정 시 기존 규약에 영향 없도록 버전 관리 필요
- 템플릿 변경 시 `is_active` 플래그로 활성 버전 관리

## 9. 향후 확장 가능성

### 9.1 다른 문서 타입에도 적용

- 정관(Articles of Association)
- 투자계약서(Investment Agreement)
- 주주간 계약서(Shareholders Agreement)

### 9.2 템플릿 버전 관리

```json
{
  "template": {
    "ref": "lpa-consent-form-template",
    "version": "1.0.0", // 버전 명시
    "context": ["fundName", "gpList"]
  }
}
```

### 9.3 샘플 개수 제어

```json
{
  "type": "sample",
  "sampleCount": 2, // 샘플 2개 생성
  "template": {
    "ref": "lpa-consent-form-template",
    "context": ["fundName", "gpList"]
  }
}
```

## 10. 관련 파일 및 DB

### 수정 파일

- `lib/pdf/lpa-generator.ts`: 샘플 렌더링 로직 추가
- `lib/pdf/types.ts`: 타입 정의 추가
- `template/lpa-template.json`: appendix2 추가

### 신규 파일

- `lib/pdf/template-loader.ts`: 외부 템플릿 로더 (DB 우선, 파일 fallback)

### 유지 파일 (변경 없음)

- `lib/pdf/lpa-consent-form-generator.ts`: 동의서 생성 로직
- `template/lpa-consent-form-template.json`: 동의서 템플릿 (DB fallback용)
- `lib/admin/consent-form.ts`: 동의서 관리 로직 (기존 DB 로딩 로직 참고)
- `lib/admin/document-templates.ts`: 템플릿 DB 조회 함수 (참고용)
- API 라우트들: 기존 생성/다운로드 로직

### DB 테이블

**`document_templates`**

- `type`: 템플릿 타입 (예: `'lpa_consent_form'`)
- `fund_id`: 펀드별 템플릿 (null이면 글로벌)
- `is_active`: 활성 버전 여부
- `content`: 템플릿 내용 (JSON)
- `version`: 버전 문자열
- `appendix`: 별지 정의 (규약 템플릿인 경우)

**템플릿 타입 목록:**

- `'lpa'`: 규약
- `'lpa_consent_form'`: 규약 동의서
- `'plan'`: 사업계획서
- `'member-list'`: 조합원 명부
- 기타 assembly 문서들

---

**작성일**: 2025-10-23
**버전**: 1.0.0
**주요 변경**: DB 우선 템플릿 로딩, 파일 fallback
