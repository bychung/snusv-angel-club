// 개인정보 수집·이용·제공 동의서 생성 및 관리 로직

import { createBrandServerClient } from '@/lib/supabase/server';
import type {
  PersonalInfoConsentFormContext,
  PersonalInfoConsentFormDiff,
  PersonalInfoConsentFormDocument,
  PersonalInfoConsentFormTemplate,
} from '@/types/assemblies';
import * as fs from 'fs';
import * as path from 'path';
import { getCurrentBrand } from '../branding';
import { getNameForSorting } from '../format-utils';

/**
 * 최신 개인정보 동의서 템플릿 가져오기
 * DB에서 찾지 못하면 파일 시스템에서 로드
 */
export async function getLatestPersonalInfoConsentFormTemplate(): Promise<{
  template: PersonalInfoConsentFormTemplate;
  templateId?: string;
  templateVersion: string;
}> {
  const brandClient = await createBrandServerClient();

  // 1. DB에서 템플릿 조회 시도
  const { data: templateData, error } = await brandClient.documentTemplates
    .select('*')
    .eq('type', 'personal_info_consent_form')
    .eq('is_active', true)
    .single();

  if (templateData && !error) {
    return {
      template: templateData.content as PersonalInfoConsentFormTemplate,
      templateId: templateData.id,
      templateVersion: templateData.version,
    };
  }

  // 2. DB에 없으면 파일에서 로드
  console.log('DB에서 템플릿을 찾을 수 없어 파일 시스템에서 로드합니다.');
  const templatePath = path.join(
    process.cwd(),
    'template',
    'personal-info-consent-form-template.json'
  );

  try {
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    const fileTemplate = JSON.parse(templateContent);

    return {
      template: fileTemplate.content as PersonalInfoConsentFormTemplate,
      templateId: undefined,
      templateVersion: fileTemplate.version || '1.0.0',
    };
  } catch (fileError) {
    throw new Error(
      `개인정보 동의서 템플릿을 찾을 수 없습니다. DB 오류: ${
        error?.message
      }, 파일 오류: ${
        fileError instanceof Error ? fileError.message : '알 수 없는 오류'
      }`
    );
  }
}

/**
 * 펀드의 조합원 정보로 개인정보 동의서 컨텍스트 생성
 * 개인 조합원(entity_type = 'individual')만 대상
 */
export async function buildPersonalInfoConsentFormContext(
  fundId: string
): Promise<PersonalInfoConsentFormContext> {
  const brandClient = await createBrandServerClient();

  // 1. 펀드 정보 조회 (gp_id, closed_at 포함)
  const { data: fund, error: fundError } = await brandClient.funds
    .select('id, name, gp_id, closed_at')
    .eq('id', fundId)
    .single();

  if (fundError || !fund) {
    throw new Error(
      `펀드 조회 실패: ${fundError?.message || '알 수 없는 오류'}`
    );
  }

  // 2. 조합원 정보 조회 (soft delete된 것 제외)
  const { data: fundMembers, error: membersError } =
    await brandClient.fundMembers
      .select(
        `
      id,
      profile_id,
      total_units,
      profile:profiles (
        id,
        name,
        email,
        address,
        phone,
        birth_date,
        business_number,
        entity_type,
        ceo
      )
    `
      )
      .eq('fund_id', fundId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

  if (membersError) {
    throw new Error(
      `조합원 조회 실패: ${membersError?.message || '알 수 없는 오류'}`
    );
  }

  if (!fundMembers || fundMembers.length === 0) {
    throw new Error('조합원 정보가 없습니다.');
  }

  // 3. GP 조합원 구분
  const gpMembers = fundMembers.filter((member: any) =>
    fund.gp_id && Array.isArray(fund.gp_id)
      ? fund.gp_id.includes(member.profile_id)
      : false
  );

  const lpMembers = fundMembers.filter(
    (member: any) =>
      !fund.gp_id ||
      !Array.isArray(fund.gp_id) ||
      !fund.gp_id.includes(member.profile_id)
  );

  // 4. GP 리스트 문자열 생성
  const gpList = gpMembers.map((m: any) => m.profile?.name || '').join(', ');

  // 5. LP 조합원 정보 배열 생성 (개인 조합원만 필터링)
  const individualLpMembers = lpMembers.filter(
    (member: any) =>
      member.profile?.entity_type === 'individual' && member.profile?.birth_date // 생년월일이 있어야 개인정보 동의서 생성 가능
  );

  const lpMembersData: Array<{
    id: string; // profile_id
    name: string;
    birthDate: string; // YYMMDD 형식
  }> = individualLpMembers.map((member: any) => {
    const profile = member.profile;
    return {
      id: profile?.id || '',
      name: profile?.name || '',
      birthDate: profile?.birth_date || '', // YYMMDD 형식
    };
  });

  // 6. LP 조합원 가나다순 정렬
  lpMembersData.sort((a, b) => {
    const nameA = getNameForSorting(a.name);
    const nameB = getNameForSorting(b.name);
    return nameA.localeCompare(nameB, 'ko-KR');
  });

  // 7. 템플릿 버전 가져오기
  const { templateVersion } = await getLatestPersonalInfoConsentFormTemplate();

  return {
    fund: {
      name: fund.name,
      closedAt: fund.closed_at || undefined, // ISO 날짜 문자열
    },
    gpList,
    lpMembers: lpMembersData,
    generatedAt: new Date().toISOString(),
    templateVersion,
  };
}

/**
 * 최신 개인정보 동의서 문서 조회 (parent 문서만)
 */
export async function getLatestPersonalInfoConsentForm(
  fundId: string
): Promise<PersonalInfoConsentFormDocument | null> {
  const brandClient = await createBrandServerClient();

  const { data, error } = await brandClient.fundDocuments
    .select('*')
    .eq('fund_id', fundId)
    .eq('type', 'personal_info_consent_form')
    .eq('is_active', true)
    .eq('is_split_parent', true) // parent 문서만 조회
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('개인정보 동의서 조회 오류:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    fund_id: data.fund_id,
    type: 'personal_info_consent_form',
    content: data.processed_content as PersonalInfoConsentFormTemplate,
    context: data.generation_context as PersonalInfoConsentFormContext,
    version: data.template_version,
    template_id: data.template_id || undefined,
    pdf_url: data.pdf_storage_path || undefined,
    generated_at: data.generated_at,
    generated_by: data.generated_by || undefined,
    created_at: data.generated_at,
  };
}

/**
 * 조합원 정보 비교 (Diff 계산)
 */
export function comparePersonalInfoMembers(
  oldContext: PersonalInfoConsentFormContext,
  newContext: PersonalInfoConsentFormContext
): PersonalInfoConsentFormDiff {
  const oldMembers = oldContext.lpMembers || [];
  const newMembers = newContext.lpMembers || [];

  // 이름 기준으로 비교
  const oldNames = new Set(oldMembers.map(m => m.name));
  const newNames = new Set(newMembers.map(m => m.name));

  const added = newMembers.filter(m => !oldNames.has(m.name));
  const removed = oldMembers.filter(m => !newNames.has(m.name));
  const modified = newMembers
    .filter(m => oldNames.has(m.name))
    .map(newMember => {
      const oldMember = oldMembers.find(om => om.name === newMember.name);
      if (!oldMember) return null;

      const changes: Record<string, { old: string; new: string }> = {};

      if (oldMember.birthDate !== newMember.birthDate) {
        changes.birthDate = {
          old: oldMember.birthDate,
          new: newMember.birthDate,
        };
      }

      return Object.keys(changes).length > 0
        ? { name: newMember.name, changes }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  // 가나다순 정렬
  const sortedAdded = added
    .sort((a, b) => {
      const nameA = getNameForSorting(a.name);
      const nameB = getNameForSorting(b.name);
      return nameA.localeCompare(nameB, 'ko-KR');
    })
    .map(m => m.name);

  const sortedRemoved = removed
    .sort((a, b) => {
      const nameA = getNameForSorting(a.name);
      const nameB = getNameForSorting(b.name);
      return nameA.localeCompare(nameB, 'ko-KR');
    })
    .map(m => m.name);

  const sortedModified = modified.sort((a, b) => {
    const nameA = getNameForSorting(a.name);
    const nameB = getNameForSorting(b.name);
    return nameA.localeCompare(nameB, 'ko-KR');
  });

  const hasChanges =
    added.length > 0 ||
    removed.length > 0 ||
    modified.length > 0 ||
    oldContext.gpList !== newContext.gpList;

  return {
    hasChanges,
    contextChanges: hasChanges
      ? {
          lpMembersAdded: sortedAdded,
          lpMembersRemoved: sortedRemoved,
          lpMembersModified: sortedModified,
          gpListChanged:
            oldContext.gpList !== newContext.gpList
              ? { old: oldContext.gpList, new: newContext.gpList }
              : undefined,
        }
      : undefined,
  };
}

/**
 * 개인정보 동의서 Diff 계산 (최신 문서와 현재 조합원 정보 비교)
 */
export async function calculatePersonalInfoConsentFormDiff(
  fundId: string
): Promise<PersonalInfoConsentFormDiff> {
  // 1. 최신 문서 조회
  const latestDocument = await getLatestPersonalInfoConsentForm(fundId);

  // 2. 현재 조합원 정보로 컨텍스트 생성
  const currentContext = await buildPersonalInfoConsentFormContext(fundId);

  // 3. 최신 문서가 없거나 context가 없으면 변경사항 있음 (최초 생성)
  if (!latestDocument || !latestDocument.context) {
    // 가나다순 정렬
    const sortedMembers = currentContext.lpMembers
      .sort((a, b) => {
        const nameA = getNameForSorting(a.name);
        const nameB = getNameForSorting(b.name);
        return nameA.localeCompare(nameB, 'ko-KR');
      })
      .map(m => m.name);

    return {
      hasChanges: true,
      contextChanges: {
        lpMembersAdded: sortedMembers,
        lpMembersRemoved: [],
        lpMembersModified: [],
      },
    };
  }

  // 4. 조합원 정보 비교
  const contextDiff = comparePersonalInfoMembers(
    latestDocument.context,
    currentContext
  );

  // 5. 템플릿 버전 비교
  const templateVersionChanged =
    latestDocument.context.templateVersion !== currentContext.templateVersion;

  if (templateVersionChanged) {
    return {
      hasChanges: true,
      contextChanges: contextDiff.contextChanges,
      templateChanges: {
        versionChanged: {
          old: latestDocument.context.templateVersion,
          new: currentContext.templateVersion,
        },
        contentModified: true,
      },
    };
  }

  return contextDiff;
}

/**
 * 개인정보 동의서 생성
 */
export async function generatePersonalInfoConsentForm(params: {
  fundId: string;
  userId: string;
}): Promise<{
  document: PersonalInfoConsentFormDocument;
  pdfBuffer: Buffer;
}> {
  const brandClient = await createBrandServerClient();

  // 1. 최신 글로벌 템플릿 가져오기
  const { template, templateId, templateVersion } =
    await getLatestPersonalInfoConsentFormTemplate();

  // 2. 현재 조합원 정보로 컨텍스트 생성 (개인 조합원만)
  const context = await buildPersonalInfoConsentFormContext(params.fundId);

  // 개인 조합원이 없으면 오류
  if (context.lpMembers.length === 0) {
    throw new Error(
      '개인 조합원이 없습니다. 개인정보 동의서는 개인 조합원만 대상입니다.'
    );
  }

  // 3. 다음 버전 번호 계산
  const { data: existingDocs } = await brandClient.fundDocuments
    .select('version_number')
    .eq('fund_id', params.fundId)
    .eq('type', 'personal_info_consent_form')
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
      .eq('type', 'personal_info_consent_form');
  }

  // 5. PDF 생성 (memberPages 포함)
  const { generatePersonalInfoConsentFormPDF } = await import(
    '@/lib/pdf/personal-info-consent-form-generator'
  );
  const { pdfBuffer, memberPages } = await generatePersonalInfoConsentFormPDF(
    template,
    context
  );

  // 6. 통합 PDF Storage에 업로드
  const { uploadFileToStorage } = await import('../storage/upload');
  const fileName = `personal-info-consent-form-v${nextVersion}.pdf`;
  const storagePath = `${params.fundId}/personal-info-consent-form/${fileName}`;

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
        type: 'personal_info_consent_form',
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
  // 각 조합원은 2페이지를 차지함
  const individualInserts = memberPages.map((memberPage, index) => ({
    fund_id: params.fundId,
    type: 'personal_info_consent_form' as const,
    version_number: nextVersion,
    is_active: true,
    template_id: templateId || null,
    template_version: templateVersion,
    processed_content: template,
    generation_context: {
      page_number: memberPage.page_number, // 시작 페이지
      page_count: 2, // 각 조합원당 2페이지
      member_name: memberPage.member_name,
    },
    generated_by: params.userId,
    pdf_storage_path: null, // 아직 생성하지 않음
    is_split_parent: false,
    parent_document_id: parentDoc.id,
    profile_id: memberPage.member_id,
  }));

  if (individualInserts.length > 0) {
    const { error: childrenError } = await brandClient.fundDocuments.insert(
      individualInserts
    );

    if (childrenError) {
      console.error('개별 문서 레코드 생성 실패:', childrenError);
      throw new Error(`개별 문서 레코드 생성 실패: ${childrenError.message}`);
    }
  }

  return {
    document: {
      id: parentDoc.id,
      fund_id: parentDoc.fund_id,
      type: 'personal_info_consent_form',
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

/**
 * 개인정보 동의서 미리보기 (저장 없이 PDF만 생성)
 */
export async function previewPersonalInfoConsentForm(
  fundId: string
): Promise<Buffer> {
  // 1. 최신 템플릿 가져오기
  const { template } = await getLatestPersonalInfoConsentFormTemplate();

  // 2. 현재 조합원 정보로 컨텍스트 생성 (개인 조합원만)
  const context = await buildPersonalInfoConsentFormContext(fundId);

  // 개인 조합원이 없으면 오류
  if (context.lpMembers.length === 0) {
    throw new Error(
      '개인 조합원이 없습니다. 개인정보 동의서는 개인 조합원만 대상입니다.'
    );
  }

  // 3. PDF 생성
  const { generatePersonalInfoConsentFormPDF } = await import(
    '@/lib/pdf/personal-info-consent-form-generator'
  );
  const { pdfBuffer } = await generatePersonalInfoConsentFormPDF(
    template,
    context
  );

  return pdfBuffer;
}

/**
 * 개별 조합원의 개인정보 동의서 PDF 가져오기 (없으면 생성)
 * 각 조합원은 2페이지를 차지함
 */
export async function getIndividualPersonalInfoConsentFormPdf(
  fundId: string,
  profileId: string
): Promise<{ path: string; buffer: Buffer }> {
  const brandClient = await createBrandServerClient();
  const { createStorageClient } = await import('@/lib/supabase/server');
  const storageClient = createStorageClient();

  // 1. 활성 개별 문서 레코드 조회
  const { data: individualDoc, error: docError } =
    await brandClient.fundDocuments
      .select('*')
      .eq('fund_id', fundId)
      .eq('type', 'personal_info_consent_form')
      .eq('is_active', true)
      .eq('is_split_parent', false)
      .eq('profile_id', profileId)
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

  // 3-3. 페이지 번호 추출 (2페이지 연속)
  const pageNumber = individualDoc.generation_context?.page_number;
  if (!pageNumber) {
    throw new Error('페이지 번호를 찾을 수 없습니다');
  }

  // 각 조합원은 2페이지 (수집·이용 + 제3자 제공)
  const pageNumbers = [pageNumber, pageNumber + 1];

  // 3-4. PDF 분리
  const { extractPdfPages } = await import('@/lib/pdf/pdf-splitter');
  const individualBuffer = await extractPdfPages(fullPdfBuffer, pageNumbers);

  // 3-5. Storage에 저장
  const { uploadFileToStorage } = await import('../storage/upload');
  const fileName = `personal-info-consent-form-v${individualDoc.version_number}-${profileId}.pdf`;
  const storagePath = `${fundId}/personal-info-consent-form/individual/${fileName}`;

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
 * 활성 버전의 모든 개별 개인정보 동의서 조회
 */
export async function getIndividualPersonalInfoConsentForms(
  fundId: string
): Promise<
  Array<import('@/types/database').FundDocument & { profile_id: string }>
> {
  const brandClient = await createBrandServerClient();

  const { data: individualDocs } = await brandClient.fundDocuments
    .select('*')
    .eq('fund_id', fundId)
    .eq('type', 'personal_info_consent_form')
    .eq('is_active', true)
    .eq('is_split_parent', false)
    .not('profile_id', 'is', null);

  return (individualDocs || []) as Array<
    import('@/types/database').FundDocument & { profile_id: string }
  >;
}

/**
 * 개인정보 동의서 삭제
 * parent 문서와 모든 child 문서(개별 조합원용)를 함께 삭제합니다.
 * DB 레코드와 Storage 파일을 모두 삭제합니다.
 * 최신 버전(is_active=true)을 삭제하면 이전 버전을 활성화합니다.
 */
export async function deletePersonalInfoConsentForm(
  documentId: string
): Promise<void> {
  const brandClient = await createBrandServerClient();
  const { createStorageClient } = await import('@/lib/supabase/server');
  const storageClient = createStorageClient();

  // 1. 문서 조회
  const { data: doc, error: fetchError } = await brandClient.fundDocuments
    .select('*')
    .eq('id', documentId)
    .single();

  if (fetchError || !doc) {
    throw new Error('문서를 찾을 수 없습니다');
  }

  // 2. parent 문서가 아니면 오류
  if (!doc.is_split_parent) {
    throw new Error('parent 문서만 삭제할 수 있습니다');
  }

  const isActive = doc.is_active;
  const fundId = doc.fund_id;
  const versionNumber = doc.version_number;

  // 3. child 문서들 조회 (개별 조합원용)
  const { data: childDocs } = await brandClient.fundDocuments
    .select('*')
    .eq('parent_document_id', documentId);

  // 4. child 문서들의 PDF 삭제
  if (childDocs && childDocs.length > 0) {
    for (const childDoc of childDocs) {
      if (childDoc.pdf_storage_path) {
        try {
          await storageClient.storage
            .from('generated-documents')
            .remove([childDoc.pdf_storage_path]);
        } catch (error) {
          console.error(
            `child PDF 삭제 실패: ${childDoc.pdf_storage_path}`,
            error
          );
        }
      }
    }

    // 5. child 문서 레코드 삭제
    await brandClient.fundDocuments
      .delete()
      .eq('parent_document_id', documentId);
  }

  // 6. parent PDF 삭제
  if (doc.pdf_storage_path) {
    try {
      await storageClient.storage
        .from('generated-documents')
        .remove([doc.pdf_storage_path]);
    } catch (error) {
      console.error(`parent PDF 삭제 실패: ${doc.pdf_storage_path}`, error);
    }
  }

  // 7. parent 문서 레코드 삭제
  await brandClient.fundDocuments.delete().eq('id', documentId);

  // 8. 삭제한 문서가 활성 상태였으면 이전 버전 활성화
  if (isActive && versionNumber > 1) {
    const { data: prevVersion } = await brandClient.fundDocuments
      .select('*')
      .eq('fund_id', fundId)
      .eq('type', 'personal_info_consent_form')
      .eq('is_split_parent', true)
      .eq('version_number', versionNumber - 1)
      .maybeSingle();

    if (prevVersion) {
      // parent 문서와 child 문서들 모두 활성화
      await brandClient.fundDocuments
        .update({ is_active: true })
        .eq('fund_id', fundId)
        .eq('type', 'personal_info_consent_form')
        .eq('version_number', versionNumber - 1);
    }
  }
}
