# 개인정보 수집·이용·제공 동의서 구현 기획

## 1. 개요

### 목적

펀드의 개인 조합원을 대상으로 개인정보 수집·이용·제공에 대한 동의서를 자동 생성하는 시스템 구축

> **중요**: 이 동의서는 개인 조합원만 대상이며, 법인 조합원은 제외됩니다.

### 문서 특징

- **형식**: 2페이지 분량의 표준 양식
- **대상**: 개인 조합원만 대상 (법인 조합원은 제외)
- **내용**: 중소벤처기업진흥공단 요구 양식 기반
- **구조**:
  - 페이지 1: 개인정보 수집·이용 동의
  - 페이지 2: 개인정보 제3자 제공 동의
- **동의 항목**: 각 페이지마다 3개 항목 (모두 자동으로 `[v]동의함` 체크)
  - 필수 항목 중 조합원명부, 출자증표, 개인식별정보
  - 필수 항목 중 고유식별정보 (주민등록번호)
  - 선택 항목
- **Footer**: 줄바꿈 구조 (날짜(오른쪽 정렬) / 빈 줄 / 주민등록번호(왼쪽) / 동의자 성명(왼쪽))
- **변수 처리**:
  - 동의자 성명: `${name}`
  - 날짜: 결성총회일 (fund.closed_at) - "YYYY년 MM월 DD일" 형식
  - 주민등록번호: 생년월일 6자리 + '-' (예: 900101-)
- **들여쓰기**: 설명 문단마다 indent 레벨 지정 (0, 1, 2단계)

## 2. 문서 구조 분석

### 첫 번째 페이지 (수집·이용)

```
┌──────────────────────────────────────────────────────────┐
│ [별지 제5호서식] 개인(신청)정보 수집·이용·제공 동의서          │
│                                                          │
│ 개인(신청)정보 수집 · 이용 · 제공 동의서                    │
│                                                          │
│ [긴 설명문 - 중소벤처기업진흥공단 관련 안내]                 │
│ - 개인정보 수집·이용 목적                                 │
│ - 수집 항목 설명                                         │
│ - 보유·이용 기간 설명                                     │
│ - 거부 권리 안내                                         │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ ※ 위와 같이 귀하의 개인(신청)정보 중 아래 항목을       │  │
│ │    수집·이용하는 것에 동의합니까?                    │  │
│ │                                                    │  │
│ │ - 필수 항목 중 조합원명부, 출자증표, 개인식별정보    │  │
│ │                           [v]동의함 [ ]동의하지 않음│  │
│ │                                                    │  │
│ │ - 필수 항목 중 고유식별정보 (주민등록번호)          │  │
│ │                           [v]동의함 [ ]동의하지 않음│  │
│ │                                                    │  │
│ │ - 선택 항목                                        │  │
│ │                           [v]동의함 [ ]동의하지 않음│  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│                                          2024년 7월 19일  │
│                                                          │
│ 주민등록번호 :                                             │
│ 동의자 성명 :                         (서명 또는 인)        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 두 번째 페이지 (제3자 제공)

```
┌──────────────────────────────────────────────────────────┐
│ [긴 설명문 - 제3자 제공 관련 안내]                          │
│ - 개인정보를 제공받는 자                                   │
│ - 제공 목적                                               │
│ - 제공 항목                                               │
│ - 보유·이용 기간                                          │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ ※ 위와 같이 귀하의 개인(신청)정보 중 아래 항목을       │  │
│ │    제3자에 제공하는 것에 동의합니까?                  │  │
│ │                                                    │  │
│ │ - 필수 항목 중 조합원명부, 출자증표, 개인식별정보    │  │
│ │                           [v]동의함 [ ]동의하지 않음│  │
│ │                                                    │  │
│ │ - 필수 항목 중 고유식별정보 (주민등록번호)          │  │
│ │                           [v]동의함 [ ]동의하지 않음│  │
│ │                                                    │  │
│ │ - 선택 항목                                        │  │
│ │                           [v]동의함 [ ]동의하지 않음│  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│                                          2024년 7월 19일  │
│                                                          │
│ 주민등록번호 :                                             │
│ 동의자 성명 :                         (서명 또는 인)        │
│                                                          │
│                                                          │
│                                                          │
│                                                - 3 -     │
└──────────────────────────────────────────────────────────┘
```

## 3. 시스템 구조

### 3.1 템플릿 구조

**파일**: `template/personal-info-consent-form-template.json`

2페이지 구조:

- 페이지 1: 수집·이용 동의
- 페이지 2: 제3자 제공 동의

각 페이지는 동일한 구조:

1. 설명 텍스트 (긴 문단)
2. 동의 항목 박스 (3개 항목, 각각 2개 선택지)
3. Footer (날짜 / 주민등록번호 / 동의자 성명)

```json
{
  "type": "personal_info_consent_form",
  "version": "1.0.0",
  "description": "개인정보 수집·이용·제공 동의서 템플릿",
  "pages": [
    {
      "page": 1,
      "header": "[별지 제5호서식] 개인(신청)정보 수집·이용·제공 동의서",
      "title": "개인(신청)정보 수집 · 이용 · 제공 동의서",
      "description": {
        "paragraphs": [
          {
            "text": "중소벤처기업진흥공단은 「벤처투자 촉진에 관한 법률」...",
            "indent": 0
          },
          {
            "text": "1. 개인정보의 수집·이용 목적",
            "indent": 0
          },
          {
            "text": "○ 개인투자조합 업무집행조합원의 신용상태 및 결격요건 확인",
            "indent": 1
          },
          {
            "text": "○ 조합원명부 및 출자증표 확인 등 개인투자조합 등록·관리",
            "indent": 1
          },
          {
            "text": "2. 수집·이용 항목",
            "indent": 0
          },
          {
            "text": "○ 필수 항목",
            "indent": 1
          },
          {
            "text": "- 조합원 명부, 출자증표, 개인식별정보(성명, 주소, 전화번호), 고유식별정보(주민등록번호)",
            "indent": 2
          },
          {
            "text": "○ 선택 항목",
            "indent": 1
          },
          {
            "text": "- 업무집행조합원의 학력, 경력사항",
            "indent": 2
          },
          {
            "text": "3. 보유·이용 기간",
            "indent": 0
          },
          {
            "text": "○ 위 개인정보는 동의일로부터 보유목적 달성시 또는 정보주체가 개인정보 삭제를 요청할 경우 지체없이 파기합니다.",
            "indent": 1
          },
          {
            "text": "○ 단, 거래 종료일 후에는 금융사고 조사, 분쟁해결, 민원처리, 법령상 의무이행을 위해 보유·이용됩니다.",
            "indent": 1
          },
          {
            "text": "4. 동의를 거부할 권리 및 동의 거부 시 불이익",
            "indent": 0
          },
          {
            "text": "귀하는 위 개인(신청)정보 중 아래 항목을 수집·이용하는 것에 대해 동의를 거부할 권리가 있습니다. 선택 항목의 수집·이용에 관한 동의는 거부하시더라도 서비스 이용에 제한이 없으나 필수 항목에 대한 동의를 거부하시는 경우 제24조에 따라 다음과 같이 개인정보를 공표할 수 있습니다.",
            "indent": 1
          }
        ]
      },
      "consent_box": {
        "title": "※ 위와 같이 귀하의 개인(신청)정보 중 아래 항목을 수집·이용하는 것에 동의합니까?",
        "items": [
          {
            "label": "- 필수 항목 중 조합원명부, 출자증표, 개인식별정보",
            "options": ["[v]동의함", "[ ]동의하지 않음"]
          },
          {
            "label": "- 필수 항목 중 고유식별정보 (주민등록번호)",
            "options": ["[v]동의함", "[ ]동의하지 않음"]
          },
          {
            "label": "- 선택 항목",
            "options": ["[v]동의함", "[ ]동의하지 않음"]
          }
        ]
      },
      "footer": {
        "date": "${date}",
        "birthDate": "${birthDateMasked}",
        "signerName": "${name}",
        "lines": [
          { "text": "${date}", "align": "right" },
          { "text": "", "spacer": true },
          { "text": "주민등록번호 : ${birthDateMasked}", "align": "left" },
          { "text": "동의자 성명 : ${name} (서명 또는 인)", "align": "left" }
        ]
      }
    },
    {
      "page": 2,
      "description": {
        "paragraphs": [
          {
            "text": "중소벤처기업진흥공단은 「벤처투자 촉진에 관한 법률」...",
            "indent": 0
          },
          {
            "text": "1. 개인정보를 제공받는 자",
            "indent": 0
          },
          {
            "text": "○ 금융위원회",
            "indent": 1
          },
          {
            "text": "2. 개인정보를 제공받는 자의 개인정보 이용 목적",
            "indent": 0
          },
          {
            "text": "○ 개인투자조합 등록 및 관리",
            "indent": 1
          },
          {
            "text": "3. 제공하는 개인정보의 항목",
            "indent": 0
          },
          {
            "text": "○ 필수 항목",
            "indent": 1
          },
          {
            "text": "- 조합원 명부, 출자증표, 개인식별정보(성명, 주소, 전화번호), 고유식별정보(주민등록번호)",
            "indent": 2
          },
          {
            "text": "○ 선택 항목",
            "indent": 1
          },
          {
            "text": "- 업무집행조합원의 학력, 경력사항",
            "indent": 2
          },
          {
            "text": "4. 개인정보를 제공받는 자의 개인정보 보유 및 이용 기간",
            "indent": 0
          },
          {
            "text": "○ 위 개인정보는 동의일로부터 보유목적 달성시 또는 정보주체가 개인정보 삭제를 요청할 경우 지체없이 파기합니다.",
            "indent": 1
          },
          {
            "text": "○ 단, 거래 종료일 후에는 금융사고 조사, 분쟁해결, 민원처리, 법령상 의무이행을 위해 보유·이용됩니다.",
            "indent": 1
          }
        ]
      },
      "consent_box": {
        "title": "※ 위와 같이 귀하의 개인(신청)정보 중 아래 항목을 제3자에 제공하는 것에 동의합니까?",
        "items": [
          {
            "label": "- 필수 항목 중 조합원명부, 출자증표, 개인식별정보",
            "options": ["[v]동의함", "[ ]동의하지 않음"]
          },
          {
            "label": "- 필수 항목 중 고유식별정보 (주민등록번호)",
            "options": ["[v]동의함", "[ ]동의하지 않음"]
          },
          {
            "label": "- 선택 항목",
            "options": ["[v]동의함", "[ ]동의하지 않음"]
          }
        ]
      },
      "footer": {
        "date": "${date}",
        "birthDate": "${birthDateMasked}",
        "signerName": "${name}",
        "lines": [
          { "text": "${date}", "align": "right" },
          { "text": "", "spacer": true },
          { "text": "주민등록번호 : ${birthDateMasked}", "align": "left" },
          { "text": "동의자 성명 : ${name} (서명 또는 인)", "align": "left" }
        ]
      },
      "page_number": "- 3 -"
    }
  ]
}
```

### 3.2 타입 정의

**파일**: `types/assemblies.ts` (기존 파일에 추가)

```typescript
// 이미 placeholder 존재하므로 구체화
export interface PersonalInfoConsentFormTemplate {
  type: 'personal_info_consent_form';
  version: string;
  description: string;
  pages: Array<{
    page: number;
    header?: string; // 페이지 1만 헤더 있음
    title?: string; // 페이지 1만 타이틀 있음
    description: {
      paragraphs: Array<{
        text: string;
        indent: number; // 0: 들여쓰기 없음, 1: 1단계, 2: 2단계
      }>;
    };
    consent_box: {
      title: string; // "※ 위와 같이..."
      items: Array<{
        label: string; // "- 필수 항목 중..."
        options: string[]; // ["[v]동의함", "[ ]동의하지 않음"]
      }>;
    };
    footer: {
      date: string; // "${date}"
      birthDate: string; // "${birthDateMasked}"
      signerName: string; // "${name}"
      lines: Array<{
        text: string;
        align?: 'left' | 'right' | 'center';
        spacer?: boolean; // 빈 줄
      }>;
    };
    page_number?: string; // 페이지 2만 해당
  }>;
}

export interface PersonalInfoConsentFormContext {
  fund: {
    name: string;
    closedAt?: string; // 결성총회일
  };
  gpList: string;
  lpMembers: Array<{
    id: string; // profile_id
    name: string;
    birthDate: string; // YYMMDD 형식
  }>;
  generatedAt: string;
  templateVersion: string;
  memberPages?: MemberPage[]; // 페이지 매핑 정보
}

export interface PersonalInfoConsentFormDocument {
  id: string;
  fund_id: string;
  type: 'personal_info_consent_form';
  content: PersonalInfoConsentFormTemplate;
  context: PersonalInfoConsentFormContext;
  version: string;
  template_id?: string;
  pdf_url?: string;
  generated_at: string;
  generated_by?: string;
  created_at: string;
}
```

### 3.3 PDF 생성기

**파일**: `lib/pdf/personal-info-consent-form-generator.ts`

기존 `lpa-consent-form-generator.ts` 구조를 참고하되, 체크박스 렌더링 추가:

```typescript
/**
 * 개인정보 수집·이용·제공 동의서 PDF 생성기
 */

import PDFDocument from 'pdfkit';
import type {
  PersonalInfoConsentFormTemplate,
  PersonalInfoConsentFormContext,
  MemberPage,
} from '@/types/assemblies';

// 주요 함수
export async function generatePersonalInfoConsentFormPDF(
  template: PersonalInfoConsentFormTemplate,
  context: PersonalInfoConsentFormContext
): Promise<{
  pdfBuffer: Buffer;
  memberPages: MemberPage[];
}> {
  // 개인 조합원(entity_type = 'individual')만 대상
  // 각 개인 조합원별로 2페이지씩 생성
  //
  // 페이지 1: 수집·이용 동의
  // - 헤더/타이틀
  // - 긴 설명 텍스트
  // - 동의 항목 박스 (3개 항목, 각각 "[v]동의함 [ ]동의하지 않음")
  // - Footer: 날짜 / 주민등록번호 / 동의자 성명
  //
  // 페이지 2: 제3자 제공 동의
  // - 긴 설명 텍스트
  // - 동의 항목 박스 (3개 항목)
  // - Footer: 날짜 / 주민등록번호 / 동의자 성명
  // - 하단 서명란 (중소벤처기업진흥공단)
  // - 페이지 번호 (- 3 -)
}

// 설명 문단 렌더링 함수
function renderDescriptionParagraphs(
  doc: PDFKit.PDFDocument,
  paragraphs: Array<{ text: string; indent: number }>
) {
  // 각 문단마다 indent 레벨에 따라 들여쓰기 처리
  // indent 0: 왼쪽 여백 없음
  // indent 1: 왼쪽 여백 20px (○ 항목)
  // indent 2: 왼쪽 여백 40px (- 세부 항목)
}

// 동의 항목 박스 렌더링 함수
function renderConsentBox(
  doc: PDFKit.PDFDocument,
  consentBox: ConsentBox,
  x: number,
  y: number
) {
  // 박스 테두리 그리기
  // 제목 렌더링
  // 각 항목마다:
  //   - 레이블 텍스트
  //   - 오른쪽에 "[v]동의함 [ ]동의하지 않음"
}

// Footer 렌더링 함수
function renderFooter(doc: PDFKit.PDFDocument, footer: FooterConfig) {
  // 줄바꿈으로 구성된 Footer:
  // 1. 날짜 (오른쪽 정렬): "2024년 7월 19일"
  // 2. 빈 줄
  // 3. 주민등록번호 (왼쪽 정렬): "주민등록번호 : 900101-"
  // 4. 동의자 성명 (왼쪽 정렬): "동의자 성명 : 홍길동 (서명 또는 인)"
}

// 주민등록번호 마스킹 함수
function maskBirthDate(birthDate: string): string {
  // "900101" -> "900101-"
  return birthDate.substring(0, 6) + '-';
}
```

### 3.4 백엔드 로직

**파일**: `lib/admin/personal-info-consent-form.ts`

기존 `consent-form.ts`와 유사한 구조:

```typescript
/**
 * 개인정보 동의서 생성 및 관리 로직
 */

// 주요 함수들
export async function getLatestPersonalInfoConsentFormTemplate();

// 개인 조합원만 필터링 (entity_type = 'individual')
export async function buildPersonalInfoConsentFormContext(fundId: string);

export async function getLatestPersonalInfoConsentForm(fundId: string);
export async function calculatePersonalInfoConsentFormDiff(fundId: string);
export async function generatePersonalInfoConsentForm(params: {
  fundId: string;
  userId: string;
});
export async function previewPersonalInfoConsentForm(fundId: string);
export async function getIndividualPersonalInfoConsentFormPdf(
  fundId: string,
  memberId: string
);
export async function deletePersonalInfoConsentForm(documentId: string);
```

### 3.5 API 라우트

다음 라우트들을 생성:

1. **`app/api/admin/funds/[fundId]/generated-documents/personal-info-consent-form/route.ts`**

   - GET: 최신 동의서 조회
   - 기존 lpa-consent-form/route.ts 참고

2. **`app/api/admin/funds/[fundId]/generated-documents/personal-info-consent-form/generate/route.ts`**

   - POST: 동의서 생성

3. **`app/api/admin/funds/[fundId]/generated-documents/personal-info-consent-form/preview/route.ts`**

   - GET: 미리보기

4. **`app/api/admin/funds/[fundId]/generated-documents/personal-info-consent-form/diff/route.ts`**

   - GET: 변경사항 확인

5. **`app/api/admin/funds/[fundId]/generated-documents/personal-info-consent-form/[documentId]/route.ts`**

   - GET: 특정 버전 조회
   - DELETE: 삭제

6. **`app/api/admin/funds/[fundId]/generated-documents/personal-info-consent-form/[documentId]/download/route.ts`**
   - GET: 다운로드

### 3.6 프론트엔드 컴포넌트

**파일**: `components/admin/personal-info-consent-form/PersonalInfoConsentFormSection.tsx`

기존 `LpaConsentFormSection.tsx`와 유사한 구조:

```tsx
/**
 * 개인정보 수집·이용·제공 동의서 섹션
 *
 * 대상: 개인 조합원만 (법인 조합원 제외)
 *
 * 기능:
 * - 최신 문서 표시
 * - 변경사항(Diff) 표시
 * - 생성/재생성
 * - 미리보기
 * - 다운로드
 * - 삭제
 */

interface PersonalInfoConsentFormSectionProps {
  fundId: string;
}

export default function PersonalInfoConsentFormSection({
  fundId,
}: PersonalInfoConsentFormSectionProps) {
  // 상태 관리
  const [latestDocument, setLatestDocument] = useState(null);
  const [diff, setDiff] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // UI 렌더링
  return (
    <Card>
      <CardHeader>
        <CardTitle>개인정보 수집·이용·제공 동의서</CardTitle>
        <CardDescription>
          개인 조합원의 개인정보 처리를 위한 동의서를 생성합니다 (법인 제외)
        </CardDescription>
      </CardHeader>
      <CardContent>{/* 문서 정보 및 액션 버튼들 */}</CardContent>
    </Card>
  );
}
```

**파일**: `components/admin/FundDetailManager.tsx` (수정)

문서 생성 탭에 새로운 섹션 추가:

```tsx
<TabsContent value="document-generation" className="space-y-6">
  {/* 기존 섹션들 */}
  <DocumentGenerationSection ... />
  <LpaConsentFormSection fundId={fundId} />
  <MemberListSection fundId={fundId} />

  {/* 새로 추가 */}
  <PersonalInfoConsentFormSection fundId={fundId} />
</TabsContent>
```

## 4. 데이터베이스

### 4.1 기존 테이블 활용

`fund_documents` 테이블을 사용하며, `type` 컬럼에 `'personal_info_consent_form'` 추가:

```sql
-- 이미 존재하는 테이블이므로 별도 마이그레이션 불필요
-- type 컬럼에 새 값만 추가하여 사용
```

### 4.2 Storage

기존 `generated-documents` 버킷 사용:

- 경로: `{fundId}/personal-info-consent-form/personal-info-consent-form-v{version}.pdf`
- 개별 파일: `{fundId}/personal-info-consent-form/individual/personal-info-consent-form-v{version}-{memberId}.pdf`

## 5. 구현 순서

### Phase 1: 템플릿 및 타입 정의 (1단계)

1. ✅ 기획 문서 작성 (현재 단계)
2. `template/personal-info-consent-form-template.json` 생성
3. `types/assemblies.ts` 타입 추가

### Phase 2: PDF 생성 로직 (2단계)

4. `lib/pdf/personal-info-consent-form-generator.ts` 구현
   - 체크박스 렌더링 함수
   - 2페이지 레이아웃
   - 각 조합원별 반복 생성
5. 로컬 테스트

### Phase 3: 백엔드 로직 (3단계)

6. `lib/admin/personal-info-consent-form.ts` 구현
   - 템플릿 조회
   - 컨텍스트 빌드
   - 생성/삭제 로직
   - Diff 계산

### Phase 4: API 구현 (4단계)

7. API 라우트 생성 (6개 파일)
8. API 테스트

### Phase 5: 프론트엔드 (5단계)

9. `PersonalInfoConsentFormSection.tsx` 구현
10. `FundDetailManager.tsx` 수정
11. UI 테스트

### Phase 6: 통합 테스트 및 배포 (6단계)

12. 전체 플로우 테스트
13. 에러 처리 확인
14. 문서화 업데이트

## 6. 주요 고려사항

### 6.1 동의 항목 박스 렌더링

**구조**:

```
┌────────────────────────────────────────────────────┐
│ ※ 위와 같이 귀하의 개인(신청)정보 중 아래 항목을    │
│    수집·이용하는 것에 동의합니까?                  │
│                                                    │
│ - 필수 항목 중 조합원명부, 출자증표, 개인식별정보   │
│                           [v]동의함 [ ]동의하지 않음│
│                                                    │
│ - 필수 항목 중 고유식별정보 (주민등록번호)          │
│                           [v]동의함 [ ]동의하지 않음│
│                                                    │
│ - 선택 항목                                        │
│                           [v]동의함 [ ]동의하지 않음│
└────────────────────────────────────────────────────┘
```

**렌더링 방식**:

- 박스 테두리: `rect()` + `stroke()`
- 각 항목은 왼쪽 정렬된 레이블 + 오른쪽 정렬된 선택지
- 모든 항목은 `[v]동의함 [ ]동의하지 않음` 형태로 자동 체크
- 텍스트로 단순 표현하여 구현 간소화

### 6.2 설명 문단 들여쓰기

**들여쓰기 레벨**:

- **indent 0**: 제목 레벨 (예: "1. 개인정보의 수집·이용 목적")
- **indent 1**: 주요 항목 레벨 (예: "○ 개인투자조합...")
- **indent 2**: 세부 항목 레벨 (예: "- 조합원 명부...")

**렌더링**:

```typescript
const indentMap = {
  0: 0, // 왼쪽 여백 없음
  1: 20, // 20px 들여쓰기
  2: 40, // 40px 들여쓰기
};

for (const paragraph of paragraphs) {
  const leftMargin = baseLeft + indentMap[paragraph.indent];
  doc.text(paragraph.text, leftMargin, currentY);
}
```

### 6.3 주민등록번호 마스킹

- 생년월일 6자리만 표시: `YYMMDD-`
- 뒷자리는 완전히 숨김
- 예: `900101-`

### 6.4 Footer 렌더링

**형식** (줄바꿈 구조):

```
                                         2024년 7월 19일

주민등록번호 :
동의자 성명 :                         (서명 또는 인)
```

**구성 요소**:

1. **날짜** (오른쪽 정렬): 결성총회일을 "YYYY년 MM월 DD일" 형식으로 표시 (`fund.closed_at`)
2. **빈 줄**
3. **주민등록번호** (왼쪽 정렬): "주민등록번호 : " + 생년월일 6자리 + '-' (예: `900101-`)
4. **동의자 성명** (왼쪽 정렬): "동의자 성명 : " + 조합원 이름 + " (서명 또는 인)"

**주의사항**:

- `/`로 구분되지 않고 각각 별도의 줄로 표시
- 주민등록번호와 동의자 성명 값은 실제로 비워두고 밑줄로 표시 (수기 작성 공간)
- 날짜만 오른쪽 정렬, 나머지는 왼쪽 정렬

**위치**: 각 페이지 하단에 위치

### 6.5 조합원 필터링

- **개인 조합원만 대상**: `entity_type = 'individual'`인 조합원만 문서 생성
- **법인 조합원 제외**: 법인은 이 동의서가 필요하지 않으므로 완전히 제외
- 개인 조합원 수에 따라 페이지 수가 결정됨 (1인당 2페이지)

### 6.6 버전 관리

기존 동의서들과 동일한 버전 관리 시스템:

- 조합원 변경 시 자동으로 diff 표시
- 재생성 시 버전 증가
- 이전 버전은 비활성화

### 6.7 개별 PDF 분리

- 통합 PDF 생성 후 각 개인 조합원별로 페이지 추출
- `member_pages` 테이블로 매핑 정보 저장
- 지연 생성 방식: 다운로드 시점에 생성

## 7. 테스트 시나리오

### 7.1 기본 생성 테스트

1. 펀드 상세 페이지 진입
2. "문서 생성" 탭 클릭
3. "개인정보 수집·이용·제공 동의서" 섹션에서 "생성" 버튼 클릭
4. PDF 생성 확인
5. 다운로드 확인

### 7.2 미리보기 테스트

1. "미리보기" 버튼 클릭
2. 브라우저에서 PDF 확인
3. 2페이지 구조 확인
   - 페이지 1: 수집·이용 동의
   - 페이지 2: 제3자 제공 동의
4. 각 페이지의 동의 항목 박스 확인
   - 3개 항목 모두 `[v]동의함 [ ]동의하지 않음` 형태
5. Footer 확인
   - 날짜: 오른쪽 정렬로 "2024년 7월 19일"
   - 빈 줄
   - "주민등록번호 :" 왼쪽 정렬
   - "동의자 성명 : (서명 또는 인)" 왼쪽 정렬
   - `/` 구분자가 없고 줄바꿈으로 구분
6. 설명 문단 들여쓰기 확인
   - 0단계: "1. 개인정보..." 등의 제목
   - 1단계: "○" 항목
   - 2단계: "-" 세부 항목
7. 변수 치환 확인
   - 성명: 조합원 이름
   - 주민등록번호: YYMMDD- 형식
   - 날짜: YYYY년 MM월 DD일 형식

### 7.3 Diff 테스트

1. 조합원 추가/수정
2. "변경사항 확인" 표시 확인
3. 재생성 버튼 클릭
4. 버전 증가 확인

### 7.4 삭제 테스트

1. 문서 삭제 버튼 클릭
2. 확인 대화상자 확인
3. 삭제 후 이전 버전 활성화 확인

### 7.5 개별 조합원 다운로드 테스트

1. 조합원 목록에서 특정 조합원 선택
2. 개별 동의서 다운로드
3. 해당 조합원 정보만 포함 확인

### 7.6 법인 조합원 제외 테스트

1. 개인 + 법인 조합원이 혼합된 펀드 준비
2. 동의서 생성
3. 개인 조합원만 포함되고 법인은 제외되는지 확인
4. 페이지 수가 개인 조합원 수 × 2 인지 확인

## 8. 예상 작업량

- **템플릿 작성**: 2-3시간
- **PDF 생성기**: 4-6시간
- **백엔드 로직**: 3-4시간
- **API 구현**: 2-3시간
- **프론트엔드**: 4-5시간
- **테스트 및 버그 수정**: 3-4시간

**총 예상 시간**: 18-25시간

## 9. 향후 확장 가능성

### 9.1 다양한 동의서 양식

- 은행별 동의서 양식 추가
- 정부 기관별 동의서 양식 추가

### 9.2 전자 서명 통합

- 전자 서명 API 연동
- 조합원이 직접 온라인에서 서명

### 9.3 일괄 전송 기능

- 이메일로 개별 동의서 일괄 전송
- 서명 완료 추적

## 10. 참고 문서

- `design_mds/LPA_CONSENT_FORM_INDIVIDUAL_PDF.md`: 규약 동의서 구현 참고
- `lib/pdf/lpa-consent-form-generator.ts`: PDF 생성 로직 참고
- `lib/admin/consent-form.ts`: 동의서 관리 로직 참고
- `components/admin/lpa-consent-form/LpaConsentFormSection.tsx`: UI 컴포넌트 참고

## 11. 체크리스트

### 구현 완료 체크리스트

- [ ] 템플릿 JSON 작성
- [ ] 타입 정의 추가
- [ ] PDF 생성기 구현
- [ ] 백엔드 로직 구현
- [ ] API 라우트 구현 (6개)
- [ ] 프론트엔드 컴포넌트 구현
- [ ] FundDetailManager 통합
- [ ] 단위 테스트
- [ ] 통합 테스트
- [ ] 문서화

### 배포 전 확인사항

- [ ] 2페이지 구조가 올바른지 확인 (수집·이용, 제3자 제공)
- [ ] 각 페이지의 동의 항목 박스가 올바르게 렌더링되는지 확인
- [ ] 모든 동의 항목이 `[v]동의함 [ ]동의하지 않음` 형태로 표시되는지 확인
- [ ] 설명 문단의 들여쓰기가 올바른지 확인 (0단계, 1단계, 2단계)
- [ ] Footer가 올바른 형식인지 확인:
  - [ ] 날짜가 오른쪽 정렬되는지
  - [ ] 빈 줄이 있는지
  - [ ] 주민등록번호와 동의자 성명이 왼쪽 정렬되는지
  - [ ] `/` 구분자가 없고 줄바꿈으로 구분되는지
- [ ] 주민등록번호가 올바르게 마스킹되는지 확인 (YYMMDD-)
- [ ] 날짜가 결성총회일로 올바르게 표시되는지 확인 (YYYY년 MM월 DD일)
- [ ] 개인 조합원만 필터링되는지 확인 (법인 제외)
- [ ] 법인 조합원이 있어도 오류 없이 건너뛰는지 확인
- [ ] 페이지 2 하단의 중소벤처기업진흥공단 서명란이 올바른지 확인
- [ ] 페이지 번호 "- 3 -"가 올바르게 표시되는지 확인
- [ ] 페이지 레이아웃이 원본과 일치하는지 확인
- [ ] 버전 관리가 올바르게 작동하는지 확인
- [ ] 개별 PDF 분리가 올바른지 확인
- [ ] 에러 처리가 적절한지 확인
