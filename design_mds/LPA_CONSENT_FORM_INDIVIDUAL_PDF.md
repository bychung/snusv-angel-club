# 규약 동의서 개별 PDF 생성 기획

## 1. 개요

현재 규약 동의서(LPA Consent Form)는 통합 PDF만 생성되어 `fund_documents` 테이블에 저장됩니다.
이를 개선하여 **통합 PDF + 개별 조합원별 PDF**를 모두 지원하도록 변경합니다.

### 목적

- 조합원 총회 이메일 발송 시 각 조합원에게 자신의 동의서만 첨부하기 위함
- 결성총회 의안 동의서(`formation_consent_form`)와 동일한 패턴 적용

### 현재 상태

- ✅ `assembly_documents`의 `formation_consent_form`: 통합 + 개별 PDF 지원
- ❌ `fund_documents`의 `lpa_consent_form`: 통합 PDF만 지원

### 변경 후

- ✅ `fund_documents`의 `lpa_consent_form`: 통합 + 개별 PDF 지원

## 2. 핵심 설계: Hybrid 방식

### 2.1 기본 원칙

**초기 생성 시:**

- 통합 PDF만 생성 및 Storage 저장
- 개별 PDF는 DB 레코드만 생성 (파일은 생성하지 않음)

**사용 시 (이메일 발송 등):**

- 개별 PDF가 없으면 통합 PDF에서 분리하여 생성
- 한번 생성되면 Storage에 저장하여 재사용 (캐싱)

**장점:**

- 초기 생성 비용 최소화
- 실제 사용되는 PDF만 생성
- Storage 효율적 사용

## 3. DB 스키마 변경

### 3.1 마이그레이션

**파일:** `supabase/migrations/XXX_add_lpa_consent_form_split_support.sql`

```sql
-- fund_documents 테이블에 개별 문서 지원 필드 추가
ALTER TABLE fund_documents
ADD COLUMN is_split_parent BOOLEAN DEFAULT false,
ADD COLUMN parent_document_id UUID REFERENCES fund_documents(id) ON DELETE CASCADE,
ADD COLUMN member_id UUID REFERENCES profiles(id);

-- 인덱스 추가
CREATE INDEX idx_fund_documents_parent
ON fund_documents(parent_document_id)
WHERE parent_document_id IS NOT NULL;

CREATE INDEX idx_fund_documents_member
ON fund_documents(member_id)
WHERE member_id IS NOT NULL;

CREATE INDEX idx_fund_documents_active_version
ON fund_documents(fund_id, type, is_active, version_number);

-- 주석
COMMENT ON COLUMN fund_documents.is_split_parent IS '통합 문서 여부 (true: 통합 문서, false: 개별 문서)';
COMMENT ON COLUMN fund_documents.parent_document_id IS '개별 문서의 경우 통합 문서 ID 참조';
COMMENT ON COLUMN fund_documents.member_id IS '개별 문서의 경우 해당 조합원 profile_id';
```

### 3.2 문서 구조

```
Parent (통합 문서):
{
  id: 'parent-doc-id',
  fund_id: 'fund-123',
  type: 'lpa_consent_form',
  version_number: 1,
  is_active: true,
  is_split_parent: true,           // 통합 문서 표시
  parent_document_id: null,
  member_id: null,
  pdf_storage_path: 'path/to/full.pdf',  // 통합 PDF
  generation_context: {
    fund: {...},
    lpMembers: [...],
    memberPages: [                 // 페이지 매핑 정보
      { member_id: 'abc', member_name: '김철수', page_number: 1 },
      { member_id: 'def', member_name: '박영희', page_number: 2 },
      { member_id: 'ghi', member_name: '최민수', page_number: 3 }
    ]
  }
}

Children (개별 문서):
{
  id: 'child-doc-id-1',
  fund_id: 'fund-123',
  type: 'lpa_consent_form',
  version_number: 1,
  is_active: true,
  is_split_parent: false,          // 개별 문서 표시
  parent_document_id: 'parent-doc-id',
  member_id: 'abc',                // 조합원 ID
  pdf_storage_path: null,          // 처음에는 null (아직 생성 안 함)
  generation_context: {
    page_number: 1,                // 통합 PDF에서의 페이지 번호
    member_name: '김철수'
  }
}
```

## 4. 타입 정의 수정

### 4.1 FundDocument 인터페이스

**파일:** `types/database.ts`

```typescript
export interface FundDocument {
  id: string;
  fund_id: string;
  type: FundDocumentType | string;
  version_number: number;
  is_active: boolean;
  template_id?: string | null;
  template_version: string;
  processed_content: any;
  generation_context?: any | null;
  pdf_storage_path?: string | null;
  generated_at: string;
  generated_by?: string | null;
  created_at?: string;
  updated_at?: string;

  // 신규 필드
  is_split_parent?: boolean;
  parent_document_id?: string | null;
  member_id?: string | null;
}
```

### 4.2 MemberPage 인터페이스

**파일:** `types/assemblies.ts` (이미 존재)

```typescript
export interface MemberPage {
  member_id: string;
  member_name: string;
  page_number: number; // 1-based
}
```

## 5. 구현 상세

### 5.1 PDF 생성 로직 수정

#### 5.1.1 generateLpaConsentFormPDF 수정

**파일:** `lib/pdf/lpa-consent-form-generator.ts`

```typescript
export async function generateLpaConsentFormPDF(
  template: LpaConsentFormTemplate,
  context: LpaConsentFormContext
): Promise<{
  pdfBuffer: Buffer;
  memberPages: MemberPage[]; // 추가
}> {
  // ... 기존 PDF 생성 로직 ...

  const memberPages: MemberPage[] = [];

  // 각 조합원별로 페이지 생성하면서 매핑 정보 수집
  for (let i = 0; i < lpMembersOnly.length; i++) {
    const member = lpMembersOnly[i];

    memberPages.push({
      member_id: member.id, // 실제 profile_id
      member_name: member.name,
      page_number: i + 1, // 1-based
    });

    // 페이지 렌더링...
  }

  return { pdfBuffer, memberPages };
}
```

#### 5.1.2 buildLpaConsentFormContext 수정

**파일:** `lib/admin/consent-form.ts`

현재 `context.lpMembers`에는 profile_id가 없으므로, fund_members를 통해 profile_id를 포함하도록 수정:

```typescript
export async function buildLpaConsentFormContext(
  fundId: string
): Promise<LpaConsentFormContext> {
  // ... 기존 로직 ...

  const lpMembersData: Array<{
    id: string;  // profile_id 추가
    name: string;
    address: string;
    birthDateOrBusinessNumber: string;
    contact: string;
    shares: number;
    entity_type: 'individual' | 'corporate';
  }> = lpMembers.map((member: any) => {
    const profile = member.profile;
    return {
      id: profile?.id,  // profile_id 추가
      name: profile?.name || '',
      // ... 기타 필드
    };
  });

  return { ..., lpMembers: lpMembersData };
}
```

### 5.2 규약 동의서 생성 함수 수정

**파일:** `lib/admin/consent-form.ts`

```typescript
export async function generateLpaConsentForm(params: {
  fundId: string;
  userId: string;
}): Promise<{
  document: LpaConsentFormDocument;
  pdfBuffer: Buffer;
}> {
  const brandClient = await createBrandServerClient();

  // 1. 최신 글로벌 템플릿 가져오기
  const { template, templateId, templateVersion } =
    await getLatestLpaConsentFormTemplate();

  // 2. 현재 조합원 정보로 컨텍스트 생성
  const context = await buildLpaConsentFormContext(params.fundId);

  // 3. 다음 버전 번호 계산
  const { data: existingDocs } = await brandClient.fundDocuments
    .select('version_number')
    .eq('fund_id', params.fundId)
    .eq('type', 'lpa_consent_form')
    .order('version_number', { ascending: false })
    .limit(1);

  const nextVersion =
    existingDocs && existingDocs.length > 0
      ? existingDocs[0].version_number + 1
      : 1;

  // 4. 기존 문서들 비활성화
  if (nextVersion > 1) {
    await brandClient.fundDocuments
      .update({ is_active: false })
      .eq('fund_id', params.fundId)
      .eq('type', 'lpa_consent_form');
  }

  // 5. PDF 생성 (memberPages 포함)
  const { generateLpaConsentFormPDF } = await import(
    '@/lib/pdf/lpa-consent-form-generator'
  );
  const { pdfBuffer, memberPages } = await generateLpaConsentFormPDF(
    template,
    context
  );

  // 6. 통합 PDF Storage에 업로드
  const { uploadFileToStorage } = await import('../storage/upload');
  const fileName = `lpa-consent-form-v${nextVersion}.pdf`;
  const storagePath = `${params.fundId}/lpa-consent-form/${fileName}`;

  const pdfUrl = await uploadFileToStorage({
    file: pdfBuffer,
    bucket: 'generated-documents',
    path: storagePath,
    brand: getCurrentBrand(),
  });

  // 7. 통합 문서 DB 저장 (memberPages를 generation_context에 포함)
  const contextWithMapping = {
    ...context,
    memberPages, // 페이지 매핑 정보 추가
  };

  const { data: parentDoc, error: parentDocError } =
    await brandClient.fundDocuments
      .insert({
        fund_id: params.fundId,
        type: 'lpa_consent_form',
        version_number: nextVersion,
        is_active: true,
        template_id: templateId || null,
        template_version: templateVersion,
        processed_content: template,
        generation_context: contextWithMapping,
        generated_by: params.userId,
        pdf_storage_path: pdfUrl,
        is_split_parent: true, // 통합 문서 표시
      })
      .select()
      .single();

  if (parentDocError || !parentDoc) {
    throw new Error(
      `통합 문서 저장 실패: ${parentDocError?.message || '알 수 없는 오류'}`
    );
  }

  // 8. 개별 문서 레코드만 생성 (PDF는 생성하지 않음)
  const individualInserts = memberPages.map(memberPage => ({
    fund_id: params.fundId,
    type: 'lpa_consent_form' as const,
    version_number: nextVersion,
    is_active: true,
    template_id: templateId || null,
    template_version: templateVersion,
    processed_content: template,
    generation_context: {
      page_number: memberPage.page_number,
      member_name: memberPage.member_name,
    },
    generated_by: params.userId,
    pdf_storage_path: null, // 아직 생성하지 않음
    is_split_parent: false,
    parent_document_id: parentDoc.id,
    member_id: memberPage.member_id,
  }));

  const { error: childrenError } = await brandClient.fundDocuments.insert(
    individualInserts
  );

  if (childrenError) {
    console.error('개별 문서 레코드 생성 실패:', childrenError);
    throw new Error(`개별 문서 레코드 생성 실패: ${childrenError.message}`);
  }

  return {
    document: {
      id: parentDoc.id,
      fund_id: parentDoc.fund_id,
      type: 'lpa_consent_form',
      content: template,
      context: contextWithMapping,
      version: templateVersion,
      template_id: templateId || undefined,
      pdf_url: pdfUrl,
      generated_at: parentDoc.generated_at,
      generated_by: params.userId,
    },
    pdfBuffer,
  };
}
```

### 5.3 개별 PDF 생성 헬퍼 함수

**파일:** `lib/admin/consent-form.ts`

```typescript
/**
 * 개별 조합원의 규약 동의서 PDF 가져오기 (없으면 생성)
 */
export async function getIndividualLpaConsentFormPdf(
  fundId: string,
  memberId: string
): Promise<{ path: string; buffer: Buffer }> {
  const brandClient = await createBrandServerClient();
  const { createStorageClient } = await import('@/lib/supabase/server');
  const storageClient = createStorageClient();

  // 1. 활성 개별 문서 레코드 조회
  const { data: individualDoc, error: docError } =
    await brandClient.fundDocuments
      .select('*')
      .eq('fund_id', fundId)
      .eq('type', 'lpa_consent_form')
      .eq('is_active', true)
      .eq('is_split_parent', false)
      .eq('member_id', memberId)
      .maybeSingle();

  if (docError || !individualDoc) {
    throw new Error('개별 문서 레코드를 찾을 수 없습니다');
  }

  // 2. 이미 생성된 PDF가 있으면 반환
  if (individualDoc.pdf_storage_path) {
    const { data: fileData, error: downloadError } = await storageClient.storage
      .from('generated-documents')
      .download(individualDoc.pdf_storage_path);

    if (!downloadError && fileData) {
      const buffer = Buffer.from(await fileData.arrayBuffer());
      return {
        path: individualDoc.pdf_storage_path,
        buffer,
      };
    }
  }

  // 3. PDF가 없으면 생성
  // 3-1. 통합 문서 조회
  const { data: parentDoc, error: parentError } =
    await brandClient.fundDocuments
      .select('*')
      .eq('id', individualDoc.parent_document_id)
      .single();

  if (parentError || !parentDoc) {
    throw new Error('통합 문서를 찾을 수 없습니다');
  }

  // 3-2. 통합 PDF 다운로드
  const { data: fullPdfData, error: fullPdfError } = await storageClient.storage
    .from('generated-documents')
    .download(parentDoc.pdf_storage_path);

  if (fullPdfError || !fullPdfData) {
    throw new Error('통합 PDF 다운로드 실패');
  }

  const fullPdfBuffer = Buffer.from(await fullPdfData.arrayBuffer());

  // 3-3. 페이지 번호 추출
  const pageNumber = individualDoc.generation_context?.page_number;
  if (!pageNumber) {
    throw new Error('페이지 번호를 찾을 수 없습니다');
  }

  // 3-4. PDF 분리
  const { splitPDFByPages } = await import('@/lib/pdf/pdf-splitter');
  const individualBuffer = await splitPDFByPages(fullPdfBuffer, [pageNumber]);

  // 3-5. Storage에 저장
  const { uploadFileToStorage } = await import('../storage/upload');
  const fileName = `lpa-consent-form-v${individualDoc.version_number}-${memberId}.pdf`;
  const storagePath = `${fundId}/lpa-consent-form/individual/${fileName}`;

  const uploadedPath = await uploadFileToStorage({
    file: individualBuffer,
    bucket: 'generated-documents',
    path: storagePath,
    brand: getCurrentBrand(),
  });

  // 3-6. DB 업데이트
  await brandClient.fundDocuments
    .update({ pdf_storage_path: uploadedPath })
    .eq('id', individualDoc.id);

  return {
    path: uploadedPath,
    buffer: individualBuffer,
  };
}

/**
 * 활성 버전의 모든 개별 규약 동의서 조회
 */
export async function getIndividualLpaConsentForms(
  fundId: string
): Promise<Array<FundDocument & { member_id: string }>> {
  const brandClient = await createBrandServerClient();

  const { data: individualDocs } = await brandClient.fundDocuments
    .select('*')
    .eq('fund_id', fundId)
    .eq('type', 'lpa_consent_form')
    .eq('is_active', true)
    .eq('is_split_parent', false)
    .not('member_id', 'is', null);

  return (individualDocs || []) as Array<FundDocument & { member_id: string }>;
}
```

## 6. 조합원 변경 시 처리

### 6.1 기본 원칙: 항상 버전 업그레이드

**모든 변경 (정보 수정, 추가, 삭제)에 대해 버전 업그레이드 적용**

이유:

- 법적 문서로서 완벽한 히스토리 추적 필요
- 로직 단순화 (일관된 처리)
- "과거에 발송한 동의서는 어떤 내용이었나?" 추적 가능

### 6.2 변경 시나리오별 처리

#### 시나리오 1: 조합원 정보 변경 (출자좌수, 주소 등)

```
기존 버전 1:
- parent-v1 (is_active: true → false)
  ├─ child-v1-김철수 (is_active: true → false, pdf_storage_path: 'path/v1/kim.pdf')
  ├─ child-v1-박영희 (is_active: true → false, pdf_storage_path: 'path/v1/park.pdf')
  └─ child-v1-최민수 (is_active: true → false, pdf_storage_path: null)

새 버전 2:
- parent-v2 (is_active: true) ← 새로 생성
  ├─ child-v2-김철수 (is_active: true, pdf_storage_path: null) ← 새 레코드
  ├─ child-v2-박영희 (is_active: true, pdf_storage_path: null) ← 새 레코드
  └─ child-v2-최민수 (is_active: true, pdf_storage_path: null) ← 새 레코드
```

**처리:**

1. 기존 버전의 모든 레코드 비활성화 (`is_active: false`)
2. 새 버전의 통합 PDF 생성 및 저장
3. 새 버전의 개별 레코드만 생성 (`pdf_storage_path: null`)

**결과:**

- 버전 1의 개별 PDF는 보존 (히스토리)
- 버전 2의 개별 PDF는 사용 시 생성
- 박영희 PDF는 v1과 v2에 동일한 내용으로 존재 가능 (중복 허용)

#### 시나리오 2: 조합원 추가

```
기존 버전 1: 김철수, 박영희, 최민수 (3명)

새 버전 2: 김철수, 박영희, 이순신, 최민수 (4명)
            ↑ 가나다순 정렬로 페이지 번호 변경
```

**처리:** 시나리오 1과 동일

**주의:**

- 페이지 번호가 변경되므로 모든 조합원의 레코드 재생성 필요
- `memberPages` 매핑이 새로 계산됨

#### 시나리오 3: 조합원 삭제

**처리:** 시나리오 1과 동일

### 6.3 구현 함수

**파일:** `lib/admin/consent-form.ts`

```typescript
/**
 * 규약 동의서 재생성 (버전 업그레이드)
 * 조합원 정보 변경, 추가, 삭제 시 호출
 */
export async function regenerateLpaConsentForm(params: {
  fundId: string;
  userId: string;
}): Promise<{
  document: LpaConsentFormDocument;
  pdfBuffer: Buffer;
}> {
  // generateLpaConsentForm과 동일한 로직
  // (이미 기존 버전 비활성화 로직 포함)
  return await generateLpaConsentForm(params);
}
```

## 7. 중복 파일 처리

### 7.1 기본 방침: 중복 허용

**이유:**

- Storage 비용이 매우 낮음 (조합원 30명 × 10버전 = 30MB ≈ $0.001/월)
- 코드 복잡도 감소
- 유지보수 용이성 증가
- 안정성 우선

**결과:**

- 변경되지 않은 조합원의 PDF도 버전마다 중복 생성 가능
- 문제없음: 각 버전은 독립적인 스냅샷

### 7.2 정리 작업 불필요

오래된 버전의 개별 PDF 정리 스크립트는 구현하지 않음:

- 법적 문서로서 히스토리 보존 중요
- Storage 비용이 실제 문제가 되지 않음
- 필요 시 수동으로 삭제 가능

## 8. 구현 체크리스트

### Phase 1: DB 및 타입 준비

- [ ] DB 마이그레이션 파일 생성
- [ ] 마이그레이션 실행
- [ ] `types/database.ts` - FundDocument 인터페이스 수정
- [ ] `types/assemblies.ts` - LpaConsentFormContext에 id 필드 추가

### Phase 2: PDF 생성 로직

- [ ] `lib/pdf/lpa-consent-form-generator.ts` - memberPages 반환 추가
- [ ] `lib/admin/consent-form.ts` - buildLpaConsentFormContext에 profile_id 포함
- [ ] `lib/admin/consent-form.ts` - generateLpaConsentForm 수정
- [ ] `lib/admin/consent-form.ts` - getIndividualLpaConsentFormPdf 함수 추가
- [ ] `lib/admin/consent-form.ts` - getIndividualLpaConsentForms 함수 추가

### Phase 3: 테스트

- [ ] 규약 동의서 생성 테스트 (통합 + 개별 레코드)
- [ ] 개별 PDF lazy generation 테스트
- [ ] 조합원 정보 변경 시 버전 업그레이드 테스트
- [ ] 조합원 추가 시 버전 업그레이드 테스트
- [ ] 조합원 삭제 시 버전 업그레이드 테스트

## 9. 사용 예시

### 9.1 규약 동의서 생성

```typescript
// 관리자가 규약 동의서 생성
const result = await generateLpaConsentForm({
  fundId: 'fund-123',
  userId: 'admin-456',
});

// 결과:
// - 통합 PDF 저장됨
// - 조합원 30명의 개별 레코드 생성 (PDF는 null)
```

### 9.2 이메일 발송 시 개별 PDF 사용

```typescript
// 조합원별로 이메일 발송
for (const member of selectedMembers) {
  const { buffer } = await getIndividualLpaConsentFormPdf(fundId, member.id);

  // 처음 호출: 통합 PDF에서 분리 → Storage 저장 → 반환
  // 두번째 호출: 저장된 파일 반환

  await sendEmail({
    to: member.email,
    attachments: [
      {
        filename: '규약 동의서.pdf',
        content: buffer,
      },
    ],
  });
}
```

### 9.3 조합원 정보 변경 후 재생성

```typescript
// 조합원의 출자좌수 변경
await updateFundMember(memberId, { total_units: 20 });

// 규약 동의서 재생성 (버전 업그레이드)
const result = await regenerateLpaConsentForm({
  fundId: 'fund-123',
  userId: 'admin-456',
});

// 결과:
// - 기존 버전 1: is_active = false
// - 새 버전 2: 통합 PDF 생성, 개별 레코드 생성 (PDF는 null)
```

## 10. 예상 질문 및 답변

### Q1: 조합원 1명만 변경되어도 30명 전체 레코드가 새로 생성되나요?

**A:** 네, 맞습니다. 하지만 레코드만 생성되고 개별 PDF는 실제 사용 시에만 생성됩니다. 변경되지 않은 조합원의 PDF는 이전 버전 파일을 계속 사용할 수도 있고, 새로 생성될 수도 있습니다 (중복 허용).

### Q2: 동일한 내용의 PDF가 중복 생성되지 않나요?

**A:** 중복 생성될 수 있습니다. 하지만 Storage 비용이 매우 낮고(월 $0.001 수준), 코드 복잡도를 낮추는 것이 더 중요하다고 판단했습니다.

### Q3: 오래된 버전의 파일은 삭제하지 않나요?

**A:** 삭제하지 않습니다. 법적 문서로서 히스토리 보존이 중요하며, Storage 비용도 문제가 되지 않습니다.

### Q4: 페이지 번호는 어떻게 관리하나요?

**A:** 통합 문서의 `generation_context.memberPages`에 전체 매핑 정보가 저장되고, 각 개별 문서의 `generation_context.page_number`에도 저장됩니다.

### Q5: 조합원이 삭제되었는데 해당 레코드는 어떻게 되나요?

**A:** 새 버전이 생성되면서 기존 버전의 모든 레코드는 `is_active: false`가 됩니다. 삭제된 조합원의 레코드는 새 버전에 생성되지 않습니다.

## 11. 다음 단계

이 기획이 완료되면:

1. `assembly_documents`의 `formation_consent_form` (결성총회 의안 동의서)과 일관된 구조
2. 이메일 발송 시 개인별 문서 첨부 가능
3. 다음 기획안: "조합원 총회 이메일 첨부 파일 개선" 진행

## 12. 참고 문서

- `design_mds/FORMATION_CONSENT_FORM.md` - 결성총회 의안 동의서 구현 (참고 구조)
- `design_mds/ASSEMBLY_EMAIL_ATTACHMENT_IMPROVEMENT.md` - 전체 이메일 개선 기획
- `DOCUMENT_VERSIONING.md` - 문서 버전 관리 시스템
