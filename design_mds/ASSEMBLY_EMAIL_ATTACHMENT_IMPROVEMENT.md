# 조합원 총회 이메일 첨부 파일 개선 기획

## 전제 조건

✅ **규약 동의서 개별 PDF 지원 완료**

- `fund_documents` 테이블의 `lpa_consent_form`이 통합 + 개별 PDF 지원
- 자세한 내용은 `LPA_CONSENT_FORM_INDIVIDUAL_PDF.md` 참조

## 1. 개요

결성총회 생성 후 조합원들에게 이메일을 발송할 때, 첨부되는 파일을 다음과 같이 변경합니다:

### 현재 상태

- 조합원 총회 생성 시 생성된 모든 문서를 선택하여 일괄 첨부
- 모든 수신자에게 동일한 파일 첨부

### 변경 후

**공통 첨부 파일 (모든 수신자):**

- **결성총회 의안**: 통합 PDF (assembly_documents)
- **규약 (LPA)**: 최신 버전 통합 PDF (fund_documents)
- **계좌 사본**: 펀드 계좌 파일 (documents, category='account') **[필수]**
- **고유번호증**: 펀드 고유번호증 파일 (documents, category='tax') **[필수]**

**개인별 첨부 파일 (수신자별):**

- **결성총회 의안 동의서**: 개인별 PDF (assembly_documents)
- **규약 동의서**: 최신 버전 개인별 PDF (fund_documents)
- **개인정보 동의서**: 최신 버전 개인별 PDF (fund_documents)

## 2. 현재 구조 분석

### 2.1 문서 저장 구조

#### Assembly Documents (assembly_documents 테이블)

조합원 총회 생성 시 생성되는 문서들:

```sql
- type: 문서 타입 ('formation_agenda', 'formation_consent_form', 'formation_minutes')
- is_split_parent: 통합 문서 여부
- parent_document_id: 개별 문서의 경우 통합 문서 ID
- member_id: 개별 문서의 경우 해당 조합원 ID
- pdf_storage_path: Storage 경로
```

**결성총회 의안 동의서 (formation_consent_form) 저장 방식:**

- 1개의 통합 PDF (is_split_parent=true, member_id=null)
- N개의 개별 PDF (is_split_parent=false, parent_document_id=통합문서ID, member_id=조합원ID)

#### Fund Documents (fund_documents 테이블)

펀드별로 버전 관리되는 문서들:

```sql
- type: 문서 타입 ('lpa', 'lpa_consent_form', 'personal_info_consent_form', 'member_list')
- version_number: 버전 번호 (1부터 시작)
- is_active: 활성 버전 여부 (최신 버전만 true)
- processed_content: 템플릿 내용
- generation_context: 생성 컨텍스트
- pdf_storage_path: Storage 경로
```

**규약 및 동의서 저장 방식:** ✅ 개별 PDF 지원 완료

- **규약 (LPA)**: 통합 PDF만 (is_active=true인 최신 버전)
- **규약 동의서 (LPA Consent Form)**:
  - 1개의 통합 PDF (is_split_parent=true, member_id=null)
  - N개의 개별 PDF (is_split_parent=false, parent_document_id=통합문서ID, member_id=조합원ID)
  - Lazy generation: 개별 PDF는 사용 시 생성 (Hybrid 방식)
- **개인정보 동의서 (Personal Info Consent Form)**:
  - 1개의 통합 PDF (is_split_parent=true, member_id=null)
  - N개의 개별 PDF (is_split_parent=false, parent_document_id=통합문서ID, member_id=조합원ID)
  - Lazy generation: 개별 PDF는 사용 시 생성 (Hybrid 방식)
  - 규약 동의서와 완전히 동일한 구조

#### Documents (documents 테이블)

펀드 공통 문서 (계좌, 세무, 등록, 계약서 등):

```sql
- category: 문서 카테고리 ('account', 'tax', 'registration', 'agreement')
- file_name: 파일명
- file_type: 파일 타입
- file_size: 파일 크기
- file_url: Storage URL
- uploaded_by: 업로더 profile_id
```

**필수 문서 저장 방식:**

- **계좌 사본**: `category='account'`로 저장
- **고유번호증**: `category='tax'`로 저장
- 펀드당 여러 개 업로드 가능 (히스토리 관리)
- 최신 업로드된 파일 사용 (created_at DESC)

### 2.2 현재 이메일 발송 로직

**파일:** `app/api/admin/funds/[fundId]/assemblies/[assemblyId]/email/send/route.ts`

```typescript
// 현재 로직 (114-142행)
for (const docId of document_ids) {
  const document = await getAssemblyDocument(docId);

  if (!document || !document.pdf_storage_path) {
    continue;
  }

  // Storage에서 PDF 다운로드
  const { data: fileData, error: downloadError } = await storageClient.storage
    .from('generated-documents')
    .download(document.pdf_storage_path);

  const buffer = Buffer.from(await fileData.arrayBuffer());
  const fileName = `${
    DOCUMENT_TYPE_NAMES[document.type as AssemblyDocumentType] || '문서'
  }.pdf`;

  attachments.push({
    filename: fileName,
    content: buffer,
    contentType: 'application/pdf',
  });
}

// 모든 수신자에게 동일한 첨부 파일 발송
sendEmailInBackground(
  emailRecord.id,
  profile.brand,
  toEmails,
  ccEmails,
  bccEmails,
  subject,
  emailBody,
  attachments, // 동일한 attachments
  assemblyId
);
```

**문제점:**

1. assembly_documents에서만 문서를 조회 (fund_documents 미포함)
2. 모든 수신자에게 동일한 첨부 파일 발송
3. 개별 문서 (member_id 기준) 처리 로직 없음

## 3. 이메일 발송 로직 개선

### 3.1 개인별 첨부 파일 구조 설계

**새로운 첨부 파일 구조:**

```typescript
interface EmailRecipientWithAttachments {
  email: string;
  attachments: EmailAttachment[];
}

// 공통 첨부 파일 (모든 수신자)
const commonAttachments: EmailAttachment[] = [
  // 결성총회 의안 (통합)
  // 규약 (통합)
  // 계좌 사본 (필수)
  // 고유번호증 (필수)
];

// 개인별 첨부 파일 (수신자마다 다름)
const recipientSpecificAttachments: Map<string, EmailAttachment[]> = new Map([
  ['member_id_1', [
    // 결성총회 의안 동의서 (개인)
    // 규약 동의서 (개인)
    // 개인정보 동의서 (개인)
  ]],
  ['member_id_2', [...]]
]);
```

### 3.2 API 요청 구조 변경

**파일:** `app/api/admin/funds/[fundId]/assemblies/[assemblyId]/email/send/route.ts`

**현재 요청 구조:**

```typescript
{
  to_ids: string[],
  cc_ids: string[],
  bcc_ids: string[],
  subject: string,
  body: string,
  document_ids: string[]  // assembly_documents의 ID만
}
```

**변경 후 요청 구조:**

```typescript
{
  to_ids: string[],
  cc_ids: string[],
  bcc_ids: string[],
  subject: string,
  body: string,
  documents: {
    // 공통 문서 (모든 수신자)
    common: {
      formation_agenda: string | null,  // assembly_document_id
      lpa: boolean,  // true면 최신 규약 첨부
      // account, tax는 자동 첨부 (필수, 항상 포함됨)
    },
    // 개인별 문서 (각 수신자)
    individual: {
      formation_consent_form: boolean,  // true면 개인별 의안 동의서 첨부
      lpa_consent_form: boolean,  // true면 개인별 규약 동의서 첨부
      personal_info_consent_form: boolean  // true면 개인별 개인정보 동의서 첨부
    }
  }
}
```

**필수 문서 처리:**

- API 요청 처리 전 필수 문서 존재 여부 확인:
  - **계좌 사본** (`category='account'`)
  - **고유번호증** (`category='tax'`)
- 하나라도 없으면 `400 Bad Request` 에러 반환
- 모두 있으면 자동으로 첨부 (사용자가 선택할 필요 없음)

### 3.3 이메일 발송 로직 수정

**기본 전략:**

- 수신자별로 개별 이메일 발송 (수신자마다 다른 첨부 파일)
- To, CC, BCC는 각 이메일에서 1명씩만 포함

**파일:** `app/api/admin/funds/[fundId]/assemblies/[assemblyId]/email/send/route.ts`

```typescript
export async function POST(request: NextRequest, { params }) {
  // ... 기존 검증 로직 ...

  const { to_ids, cc_ids, bcc_ids, subject, body: emailBody, documents } = body;

  // 0. 필수 문서 체크
  const accountDocument = await getLatestAccountDocument(fundId);
  const taxDocument = await getLatestTaxDocument(fundId);

  const missingDocs: string[] = [];
  if (!accountDocument) missingDocs.push('계좌 사본');
  if (!taxDocument) missingDocs.push('고유번호증');

  if (missingDocs.length > 0) {
    return NextResponse.json(
      {
        error: `${missingDocs.join(
          ', '
        )}이(가) 업로드되지 않았습니다. 펀드 공통 문서에서 먼저 업로드해주세요.`,
      },
      { status: 400 }
    );
  }

  // 1. 공통 첨부 파일 준비
  const commonAttachments: EmailAttachment[] = [];

  // 1-1. 계좌 사본 (필수, 자동 첨부)
  const accountBuffer = await downloadFromStorage(accountDocument.file_url);
  commonAttachments.push({
    filename: accountDocument.file_name || '계좌사본.pdf',
    content: accountBuffer,
    contentType: accountDocument.file_type || 'application/pdf',
  });

  // 1-2. 고유번호증 (필수, 자동 첨부)
  const taxBuffer = await downloadFromStorage(taxDocument.file_url);
  commonAttachments.push({
    filename: taxDocument.file_name || '고유번호증.pdf',
    content: taxBuffer,
    contentType: taxDocument.file_type || 'application/pdf',
  });

  // 1-3. 결성총회 의안
  if (documents.common.formation_agenda) {
    const document = await getAssemblyDocument(
      documents.common.formation_agenda
    );
    if (document?.pdf_storage_path) {
      const buffer = await downloadFromStorage(document.pdf_storage_path);
      commonAttachments.push({
        filename: '결성총회 의안.pdf',
        content: buffer,
        contentType: 'application/pdf',
      });
    }
  }

  // 1-4. 규약 (LPA)
  if (documents.common.lpa) {
    const lpaDocument = await getLatestLpaDocument(fundId);
    if (lpaDocument?.pdf_storage_path) {
      const buffer = await downloadFromStorage(lpaDocument.pdf_storage_path);
      commonAttachments.push({
        filename: '규약.pdf',
        content: buffer,
        contentType: 'application/pdf',
      });
    }
  }

  // 2. 개인별 첨부 파일 매핑 생성
  const memberAttachmentsMap = new Map<string, EmailAttachment[]>();

  // 2-1. 결성총회 의안 동의서
  if (documents.individual.formation_consent_form) {
    const consentFormDocs = await getIndividualFormationConsentForms(
      assemblyId
    );

    for (const doc of consentFormDocs) {
      if (!doc.member_id || !doc.pdf_storage_path) continue;

      const buffer = await downloadFromStorage(doc.pdf_storage_path);
      const attachments = memberAttachmentsMap.get(doc.member_id) || [];
      attachments.push({
        filename: '결성총회 의안 동의서.pdf',
        content: buffer,
        contentType: 'application/pdf',
      });
      memberAttachmentsMap.set(doc.member_id, attachments);
    }
  }

  // 2-2. 규약 동의서
  if (documents.individual.lpa_consent_form) {
    const lpaConsentFormDocs = await getIndividualLpaConsentForms(fundId);

    for (const doc of lpaConsentFormDocs) {
      if (!doc.member_id || !doc.pdf_storage_path) continue;

      const buffer = await downloadFromStorage(doc.pdf_storage_path);
      const attachments = memberAttachmentsMap.get(doc.member_id) || [];
      attachments.push({
        filename: '규약 동의서.pdf',
        content: buffer,
        contentType: 'application/pdf',
      });
      memberAttachmentsMap.set(doc.member_id, attachments);
    }
  }

  // 2-3. 개인정보 동의서
  if (documents.individual.personal_info_consent_form) {
    const personalInfoConsentFormDocs =
      await getIndividualPersonalInfoConsentForms(fundId);

    for (const doc of personalInfoConsentFormDocs) {
      if (!doc.member_id || !doc.pdf_storage_path) continue;

      const buffer = await downloadFromStorage(doc.pdf_storage_path);
      const attachments = memberAttachmentsMap.get(doc.member_id) || [];
      attachments.push({
        filename: '개인정보 동의서.pdf',
        content: buffer,
        contentType: 'application/pdf',
      });
      memberAttachmentsMap.set(doc.member_id, attachments);
    }
  }

  // 3. 수신자별로 이메일 발송
  const allRecipients = [
    ...to_ids.map(id => ({ id, type: 'to' })),
    ...cc_ids.map(id => ({ id, type: 'cc' })),
    ...bcc_ids.map(id => ({ id, type: 'bcc' })),
  ];

  for (const recipient of allRecipients) {
    const email = idToEmail.get(recipient.id);
    if (!email) continue;

    // 공통 첨부 + 개인별 첨부
    const recipientAttachments = [
      ...commonAttachments,
      ...(memberAttachmentsMap.get(recipient.id) || []),
    ];

    // 개별 이메일 발송
    await sendAssemblyEmail({
      brand: profile.brand,
      recipients: [email],
      recipientType: recipient.type,
      subject,
      body: emailBody,
      attachments: recipientAttachments,
    });
  }

  // ... 이메일 발송 기록 및 상태 업데이트 ...
}
```

### 3.4 헬퍼 함수 추가

**파일:** `lib/admin/assemblies.ts`

```typescript
/**
 * 결성총회 의안 동의서 개별 문서 조회
 */
export async function getIndividualFormationConsentForms(
  assemblyId: string
): Promise<Array<AssemblyDocument & { member_id: string }>> {
  const brandClient = await createBrandServerClient();

  // 통합 문서 찾기
  const { data: parentDoc } = await brandClient.assemblyDocuments
    .select('id')
    .eq('assembly_id', assemblyId)
    .eq('type', 'formation_consent_form')
    .eq('is_split_parent', true)
    .maybeSingle();

  if (!parentDoc) return [];

  // 개별 문서들 조회
  const { data: individualDocs } = await brandClient.assemblyDocuments
    .select('*')
    .eq('parent_document_id', parentDoc.id)
    .not('member_id', 'is', null);

  return individualDocs || [];
}

/**
 * 규약 동의서 개별 문서 조회 (최신 활성 버전)
 */
export async function getIndividualLpaConsentForms(
  fundId: string
): Promise<Array<FundDocument & { member_id: string }>> {
  const brandClient = await createBrandServerClient();

  // 최신 활성 통합 문서 찾기
  const { data: parentDoc } = await brandClient.fundDocuments
    .select('id, version_number')
    .eq('fund_id', fundId)
    .eq('type', 'lpa_consent_form')
    .eq('is_active', true)
    .eq('is_split_parent', true)
    .maybeSingle();

  if (!parentDoc) return [];

  // 개별 문서들 조회 (같은 버전)
  const { data: individualDocs } = await brandClient.fundDocuments
    .select('*')
    .eq('fund_id', fundId)
    .eq('type', 'lpa_consent_form')
    .eq('version_number', parentDoc.version_number)
    .eq('is_active', true)
    .eq('is_split_parent', false)
    .not('member_id', 'is', null);

  return individualDocs || [];
}

/**
 * 개인정보 동의서 개별 문서 조회 (최신 활성 버전)
 */
export async function getIndividualPersonalInfoConsentForms(
  fundId: string
): Promise<Array<FundDocument & { member_id: string }>> {
  const brandClient = await createBrandServerClient();

  // 최신 활성 통합 문서 찾기
  const { data: parentDoc } = await brandClient.fundDocuments
    .select('id, version_number')
    .eq('fund_id', fundId)
    .eq('type', 'personal_info_consent_form')
    .eq('is_active', true)
    .eq('is_split_parent', true)
    .maybeSingle();

  if (!parentDoc) return [];

  // 개별 문서들 조회 (같은 버전)
  const { data: individualDocs } = await brandClient.fundDocuments
    .select('*')
    .eq('fund_id', fundId)
    .eq('type', 'personal_info_consent_form')
    .eq('version_number', parentDoc.version_number)
    .eq('is_active', true)
    .eq('is_split_parent', false)
    .not('member_id', 'is', null);

  return individualDocs || [];
}

/**
 * 최신 규약 (LPA) 문서 조회
 */
export async function getLatestLpaDocument(
  fundId: string
): Promise<FundDocument | null> {
  const brandClient = await createBrandServerClient();

  const { data } = await brandClient.fundDocuments
    .select('*')
    .eq('fund_id', fundId)
    .eq('type', 'lpa')
    .eq('is_active', true)
    .maybeSingle();

  return data;
}

/**
 * 최신 계좌 사본 조회
 */
export async function getLatestAccountDocument(
  fundId: string
): Promise<Document | null> {
  const brandClient = await createBrandServerClient();

  const { data } = await brandClient.documents
    .select('*')
    .eq('fund_id', fundId)
    .eq('category', 'account')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

/**
 * 최신 고유번호증 조회
 */
export async function getLatestTaxDocument(
  fundId: string
): Promise<Document | null> {
  const brandClient = await createBrandServerClient();

  const { data } = await brandClient.documents
    .select('*')
    .eq('fund_id', fundId)
    .eq('category', 'tax')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}
```

### 3.5 프론트엔드 수정

#### 3.5.1 이메일 발송 모달 UI 변경

**파일:** `components/admin/assembly/AssemblyEmailModal.tsx`

**현재 구조:**

- 문서 선택: 체크박스로 document_ids 선택

**변경 후 구조:**

```typescript
<div className="space-y-4">
  <div>
    <h3>공통 첨부 파일 (모든 수신자)</h3>
    <div className="space-y-2">
      {/* 필수 문서 안내 */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <span>계좌 사본 (자동 첨부)</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <span>고유번호증 (자동 첨부)</span>
      </div>

      <Checkbox
        checked={includeFormationAgenda}
        onChange={setIncludeFormationAgenda}
        label="결성총회 의안"
      />
      <Checkbox checked={includeLpa} onChange={setIncludeLpa} label="규약" />
    </div>
  </div>

  <div>
    <h3>개인별 첨부 파일</h3>
    <div className="space-y-2">
      <Checkbox
        checked={includeFormationConsentForm}
        onChange={setIncludeFormationConsentForm}
        label="결성총회 의안 동의서 (개인별)"
        description="각 수신자에게 자신의 동의서만 첨부됩니다"
      />
      <Checkbox
        checked={includeLpaConsentForm}
        onChange={setIncludeLpaConsentForm}
        label="규약 동의서 (개인별)"
        description="각 수신자에게 자신의 동의서만 첨부됩니다"
      />
      <Checkbox
        checked={includePersonalInfoConsentForm}
        onChange={setIncludePersonalInfoConsentForm}
        label="개인정보 동의서 (개인별)"
        description="각 수신자에게 자신의 동의서만 첨부됩니다"
      />
    </div>
  </div>
</div>
```

**필수 문서 체크:**

- 모달 오픈 시 필수 문서 존재 여부 확인:
  - 계좌 사본 (`category='account'`)
  - 고유번호증 (`category='tax'`)
- 하나라도 없으면 경고 메시지 표시 및 발송 버튼 비활성화
- "펀드 공통 문서에서 [누락된 문서명]을(를) 먼저 업로드해주세요" 안내

#### 3.5.2 API 호출 변경

```typescript
const response = await fetch(
  `/api/admin/funds/${fundId}/assemblies/${assemblyId}/email/send`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to_ids: selectedToIds,
      cc_ids: selectedCcIds,
      bcc_ids: selectedBccIds,
      subject,
      body,
      documents: {
        common: {
          formation_agenda: includeFormationAgenda
            ? formationAgendaDocId
            : null,
          lpa: includeLpa,
        },
        individual: {
          formation_consent_form: includeFormationConsentForm,
          lpa_consent_form: includeLpaConsentForm,
          personal_info_consent_form: includePersonalInfoConsentForm,
        },
      },
    }),
  }
);
```

## 4. 구현 단계

### Phase 1: 이메일 발송 로직 개선 ✅

1. [x] 헬퍼 함수 추가 (`lib/admin/assemblies.ts`)
   - `getIndividualFormationConsentForms()` - 결성총회 의안 동의서 개별 문서 조회
   - `getIndividualLpaConsentForms()` - 규약 동의서 개별 문서 조회
   - `getIndividualPersonalInfoConsentForms()` - 개인정보 동의서 개별 문서 조회
   - `getLatestLpaDocument()` - 최신 규약 문서 조회
   - `getLatestAccountDocument()` - 최신 계좌 사본 조회 (필수)
   - `getLatestTaxDocument()` - 최신 고유번호증 조회 (필수)
2. [x] API 요청 구조 변경
   - `document_ids` → `documents` 객체 구조로 변경
   - 공통 문서와 개인별 문서 구분
3. [x] 수신자별 이메일 발송 로직 구현
   - **필수 문서 체크 (최우선)**: 계좌 사본, 고유번호증
   - 공통 첨부 파일 준비 (필수 문서 자동 포함)
   - 개인별 첨부 파일 매핑 생성
   - 수신자별로 개별 이메일 발송
4. [x] 에러 핸들링
   - 필수 문서 없을 시 400 에러 반환 (누락된 문서명 명시)
   - 개별 PDF 없을 시 Lazy generation 호출 (기존 구현 활용)
   - 일부 수신자 발송 실패 시 처리

### Phase 2: 프론트엔드 수정 ✅

1. [x] 필수 문서 체크 로직
   - 모달 오픈 시 필수 문서 존재 여부 확인 API 호출:
     - 계좌 사본 (`category='account'`)
     - 고유번호증 (`category='tax'`)
   - 하나라도 없으면 경고 메시지 표시 및 발송 버튼 비활성화
2. [x] 이메일 발송 모달 UI 변경
   - 공통 첨부 파일 / 개인별 첨부 파일 섹션 구분
   - 필수 문서 자동 첨부 안내 표시:
     - 계좌 사본 (체크마크/X 표시)
     - 고유번호증 (체크마크/X 표시)
   - 각 문서별 체크박스 추가
3. [x] API 호출 로직 수정
   - 새로운 요청 구조로 변경
4. [x] 사용자 안내 메시지 추가
   - 개인별 문서 설명 추가
   - 필수 문서 안내 메시지

### Phase 3: 테스트 및 검증

1. [ ] 단위 테스트
2. [ ] 통합 테스트 (실제 이메일 발송)
3. [ ] 수신자별 첨부 파일 검증
4. [ ] Lazy generation 동작 확인

**구현 완료 날짜**: 2025-10-30

## 5. 주의사항

### 5.1 성능 고려사항

- **문제**: 수신자별로 개별 이메일 발송 시 시간 소요
- **해결**: 백그라운드 작업으로 처리, 진행 상태 표시

### 5.2 동의서 Lazy Generation

- **전제**: 규약 동의서 및 개인정보 동의서 개별 PDF는 사용 시 생성 (Hybrid 방식)
- **처리**:
  - `pdf_storage_path`가 null인 경우 개별 PDF 생성 함수 호출:
    - 규약 동의서: `getIndividualLpaConsentFormPdf()`
    - 개인정보 동의서: `getIndividualPersonalInfoConsentFormPdf()`
  - 통합 PDF에서 해당 페이지 분리 및 저장
  - 이후 요청에서는 저장된 파일 재사용

### 5.3 이메일 발송 실패

- **문제**: 일부 수신자에게 발송 실패 시
- **해결**:
  - 개별 발송 상태 기록
  - 실패한 수신자 재발송 기능
  - 관리자에게 실패 알림

### 5.4 필수 문서 체크

- **문제**: 계좌 사본 또는 고유번호증이 없으면 이메일 발송 불가
- **해결**:
  - API 요청 처리 전 필수 문서 존재 여부 확인:
    - 계좌 사본 (`category='account'`)
    - 고유번호증 (`category='tax'`)
  - 하나라도 없으면 명확한 에러 메시지 반환 (누락된 문서명 포함)
  - 프론트엔드에서도 사전 체크하여 발송 버튼 비활성화

### 5.5 member_id 매칭

- **문제**: 이메일 수신자 ID와 문서의 member_id가 다를 수 있음
- **해결**:
  - fund_members를 통해 profile_id 매칭
  - 매칭되지 않는 수신자는 개인별 문서 없이 공통 문서만 발송

## 6. 대안 검토

### 대안 1: ZIP 파일로 묶어서 발송

- 모든 문서를 ZIP으로 압축하여 발송
- **장점**: 발송 횟수 감소
- **단점**: 사용자 편의성 저하, 모바일에서 ZIP 해제 불편

### 대안 2: 링크로 다운로드

- 이메일에는 다운로드 링크만 첨부
- **장점**: 이메일 크기 감소
- **단점**: 추가 인증 필요, 사용자 경험 저하

### 최종 선택: 개별 이메일 발송

- **이유**: 사용자가 자신의 문서만 받아서 혼란 감소, 보안 강화

## 7. 예상 효과

### 7.1 사용자 경험 개선

- 조합원이 자신에게 필요한 문서만 받음
- 다른 조합원의 개인 정보 노출 방지

### 7.2 관리 편의성

- 규약 및 동의서 문서 자동 첨부:
  - 결성총회 의안 동의서 (개인별)
  - 규약 동의서 (개인별)
  - 개인정보 동의서 (개인별)
- 필수 문서 자동 첨부로 누락 방지:
  - 계좌 사본
  - 고유번호증
- 필수 문서 체크로 발송 전 검증

### 7.3 확장성

- 향후 다른 총회 유형에도 동일한 패턴 적용 가능
- 개인별 문서 관리 체계 확립

## 8. 롤백 계획

문제 발생 시 롤백 절차:

1. **Phase 1 롤백**: API 요청 구조 원복
   - `documents` 객체 → `document_ids` 배열로 복원
   - 수신자별 발송 → 일괄 발송으로 복원
2. **Phase 2 롤백**: 프론트엔드 코드 원복
   - 이메일 발송 모달 UI 원상 복구

**데이터 영향:**

- DB 스키마 변경 없음 (규약 동의서 및 개인정보 동의서 개별 PDF는 이미 구현 완료)
- Storage 변경 없음
