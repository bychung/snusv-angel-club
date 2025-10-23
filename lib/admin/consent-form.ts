// LPA 규약 동의서 생성 및 관리 로직

import { createBrandServerClient } from '@/lib/supabase/server';
import type {
  LpaConsentFormContext,
  LpaConsentFormDiff,
  LpaConsentFormDocument,
  LpaConsentFormTemplate,
} from '@/types/assemblies';
import * as fs from 'fs';
import * as path from 'path';
import { getCurrentBrand } from '../branding';
import { getNameForSorting } from '../format-utils';

/**
 * 최신 LPA 규약 동의서 템플릿 가져오기
 * DB에서 찾지 못하면 파일 시스템에서 로드
 */
export async function getLatestLpaConsentFormTemplate(): Promise<{
  template: LpaConsentFormTemplate;
  templateId?: string;
  templateVersion: string;
}> {
  const brandClient = await createBrandServerClient();

  // 1. DB에서 템플릿 조회 시도
  const { data: templateData, error } = await brandClient.documentTemplates
    .select('*')
    .eq('type', 'lpa_consent_form')
    .eq('is_active', true)
    .single();

  if (templateData && !error) {
    return {
      template: templateData.content as LpaConsentFormTemplate,
      templateId: templateData.id,
      templateVersion: templateData.version,
    };
  }

  // 2. DB에 없으면 파일에서 로드
  console.log('DB에서 템플릿을 찾을 수 없어 파일 시스템에서 로드합니다.');
  const templatePath = path.join(
    process.cwd(),
    'template',
    'lpa-consent-form-template.json'
  );

  try {
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    const fileTemplate = JSON.parse(templateContent) as LpaConsentFormTemplate;

    return {
      template: fileTemplate,
      templateVersion: '1.0.0',
    };
  } catch (fileError) {
    throw new Error(
      `규약 동의서 템플릿을 찾을 수 없습니다. DB 오류: ${
        error?.message
      }, 파일 오류: ${
        fileError instanceof Error ? fileError.message : '알 수 없는 오류'
      }`
    );
  }
}

/**
 * 펀드의 조합원 정보로 규약 동의서 컨텍스트 생성
 */
export async function buildLpaConsentFormContext(
  fundId: string
): Promise<LpaConsentFormContext> {
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
        entity_type
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

  // 5. LP 조합원 정보 배열 생성
  const lpMembersData = lpMembers.map((member: any) => {
    const profile = member.profile;
    return {
      name: profile?.name || '',
      address: profile?.address || '',
      birthDateOrBusinessNumber:
        profile?.entity_type === 'corporate'
          ? profile?.business_number || ''
          : profile?.birth_date || '',
      contact: profile?.phone || '',
      shares: member.total_units || 0,
    };
  });

  // 6. 템플릿 버전 가져오기
  const { templateVersion } = await getLatestLpaConsentFormTemplate();

  return {
    fund: {
      name: fund.name,
      closedAt: fund.closed_at || undefined, // ISO 날짜 문자열 (template-processor에서 포맷팅)
    },
    gpList,
    lpMembers: lpMembersData,
    generatedAt: new Date().toISOString(),
    templateVersion,
  };
}

/**
 * 최신 규약 동의서 문서 조회
 */
export async function getLatestLpaConsentForm(
  fundId: string
): Promise<LpaConsentFormDocument | null> {
  const brandClient = await createBrandServerClient();

  const { data, error } = await brandClient.fundDocuments
    .select('*')
    .eq('fund_id', fundId)
    .eq('type', 'lpa_consent_form')
    .eq('is_active', true)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('규약 동의서 조회 오류:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    fund_id: data.fund_id,
    type: 'lpa_consent_form',
    content: data.processed_content as LpaConsentFormTemplate,
    context: data.generation_context as LpaConsentFormContext,
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
export function compareLpMembers(
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
      if (!oldMember) return null;

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
      if (
        oldMember.birthDateOrBusinessNumber !==
        newMember.birthDateOrBusinessNumber
      ) {
        changes.birthDateOrBusinessNumber = {
          old: oldMember.birthDateOrBusinessNumber,
          new: newMember.birthDateOrBusinessNumber,
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
 * 규약 동의서 Diff 계산 (최신 문서와 현재 조합원 정보 비교)
 */
export async function calculateLpaConsentFormDiff(
  fundId: string
): Promise<LpaConsentFormDiff> {
  // 1. 최신 문서 조회
  const latestDocument = await getLatestLpaConsentForm(fundId);

  // 2. 현재 조합원 정보로 컨텍스트 생성
  const currentContext = await buildLpaConsentFormContext(fundId);

  // 3. 최신 문서가 없으면 변경사항 있음 (최초 생성)
  if (!latestDocument) {
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
  const contextDiff = compareLpMembers(latestDocument.context, currentContext);

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
 * 규약 동의서 생성
 */
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

  // 5. PDF 생성 (아직 구현되지 않았으므로 임시로 빈 버퍼 사용)
  // TODO: PDF 생성기 구현 후 교체
  const { generateLpaConsentFormPDF } = await import(
    '@/lib/pdf/lpa-consent-form-generator'
  );
  const pdfBuffer = await generateLpaConsentFormPDF(template, context);

  // 6. 문서 저장 (PDF URL은 나중에 업데이트)
  const { data: document, error: insertError } = await brandClient.fundDocuments
    .insert({
      fund_id: params.fundId,
      type: 'lpa_consent_form',
      version_number: nextVersion,
      is_active: true,
      template_id: templateId || null,
      template_version: templateVersion,
      processed_content: template, // content
      generation_context: context, // context
      generated_by: params.userId,
    })
    .select()
    .single();

  if (insertError || !document) {
    throw new Error(
      `문서 저장 실패: ${insertError?.message || '알 수 없는 오류'}`
    );
  }

  // 7. Storage에 PDF 업로드
  const { uploadFileToStorage } = await import('../storage/upload');
  const fileName = `lpa-consent-form-v${nextVersion}.pdf`;
  const storagePath = `${params.fundId}/lpa-consent-form/${fileName}`;

  const pdfUrl = await uploadFileToStorage({
    file: pdfBuffer,
    bucket: 'generated-documents',
    path: storagePath,
    brand: getCurrentBrand(),
  });

  // 8. PDF URL 업데이트
  const { error: updateError } = await brandClient.fundDocuments
    .update({ pdf_storage_path: pdfUrl })
    .eq('id', document.id);

  if (updateError) {
    console.error('PDF URL 업데이트 실패:', updateError);
  }

  return {
    document: {
      id: document.id,
      fund_id: document.fund_id,
      type: 'lpa_consent_form',
      content: template,
      context,
      version: templateVersion,
      template_id: templateId || undefined,
      pdf_url: pdfUrl,
      generated_at: document.generated_at,
      generated_by: params.userId,
    },
    pdfBuffer,
  };
}

/**
 * 규약 동의서 미리보기 (저장 없이 PDF만 생성)
 */
export async function previewLpaConsentForm(fundId: string): Promise<Buffer> {
  // 1. 최신 템플릿 가져오기
  const { template } = await getLatestLpaConsentFormTemplate();

  // 2. 현재 조합원 정보로 컨텍스트 생성
  const context = await buildLpaConsentFormContext(fundId);

  // 3. PDF 생성
  const { generateLpaConsentFormPDF } = await import(
    '@/lib/pdf/lpa-consent-form-generator'
  );
  const pdfBuffer = await generateLpaConsentFormPDF(template, context);

  return pdfBuffer;
}

/**
 * LPA 규약 동의서 삭제
 * DB 레코드와 Storage 파일을 모두 삭제합니다.
 * 최신 버전(is_active=true)을 삭제하면 이전 버전을 활성화합니다.
 */
export async function deleteLpaConsentForm(documentId: string): Promise<void> {
  const brandClient = await createBrandServerClient();
  const { createStorageClient } = await import('@/lib/supabase/server');

  // 1. 문서 조회
  const { data: doc, error: fetchError } = await brandClient.fundDocuments
    .select('*')
    .eq('id', documentId)
    .eq('type', 'lpa_consent_form')
    .single();

  if (fetchError || !doc) {
    throw new Error('삭제할 규약 동의서를 찾을 수 없습니다.');
  }

  console.log('[deleteLpaConsentForm] 삭제 대상 문서:', {
    documentId,
    id: doc.id,
    fund_id: doc.fund_id,
    type: doc.type,
    version: doc.version,
    is_active: doc.is_active,
    pdf_storage_path: doc.pdf_storage_path,
  });

  // 2. Storage에서 PDF 파일 삭제
  if (doc.pdf_storage_path) {
    try {
      const storageClient = createStorageClient();
      const { error: storageError } = await storageClient.storage
        .from('generated-documents')
        .remove([doc.pdf_storage_path]);

      if (storageError) {
        console.error(
          '[deleteLpaConsentForm] Storage 파일 삭제 실패:',
          storageError
        );
        // Storage 삭제 실패해도 계속 진행 (파일이 이미 없을 수 있음)
      } else {
        console.log(
          '[deleteLpaConsentForm] Storage 파일 삭제 성공:',
          doc.pdf_storage_path
        );
      }
    } catch (error) {
      console.error('[deleteLpaConsentForm] Storage 삭제 중 오류:', error);
      // 계속 진행
    }
  }

  // 3. DB에서 문서 삭제 및 이전 버전 활성화 로직
  if (doc.is_active) {
    // 3-1. 같은 펀드의 같은 타입의 바로 이전 버전 찾기
    let previousVersion = null;
    try {
      const { data: previousVersions, error: prevError } =
        await brandClient.fundDocuments
          .select('*')
          .eq('fund_id', doc.fund_id)
          .eq('type', 'lpa_consent_form')
          .lt('version', doc.version)
          .order('version', { ascending: false })
          .limit(1);

      if (prevError) {
        console.warn('[deleteLpaConsentForm] 이전 버전 조회 실패:', prevError);
        // 이전 버전 조회 실패해도 계속 진행 (이전 버전이 없을 수 있음)
      } else {
        previousVersion =
          previousVersions && previousVersions.length > 0
            ? previousVersions[0]
            : null;
      }
    } catch (error) {
      console.warn('[deleteLpaConsentForm] 이전 버전 조회 중 오류:', error);
      // 계속 진행
    }

    console.log(
      '[deleteLpaConsentForm] 이전 버전:',
      previousVersion
        ? { id: previousVersion.id, version: previousVersion.version }
        : '없음'
    );

    // 3-2. 현재 문서 삭제
    const { error: deleteError } = await brandClient.fundDocuments
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      console.error('[deleteLpaConsentForm] 문서 삭제 실패:', deleteError);
      throw new Error(`규약 동의서 삭제 실패: ${deleteError.message}`);
    }

    console.log('[deleteLpaConsentForm] 문서 삭제 성공');

    // 3-3. 이전 버전이 있으면 활성화
    if (previousVersion) {
      const { error: updateError } = await brandClient.fundDocuments
        .update({ is_active: true })
        .eq('id', previousVersion.id);

      if (updateError) {
        console.error(
          '[deleteLpaConsentForm] 이전 버전 활성화 실패:',
          updateError
        );
        throw new Error(`이전 버전 활성화 실패: ${updateError.message}`);
      }
      console.log('[deleteLpaConsentForm] 이전 버전 활성화 성공');
    } else {
      console.log('[deleteLpaConsentForm] 이전 버전이 없어 활성화 건너뜀');
    }
  } else {
    // 4. 최신 버전이 아닌 경우 그냥 삭제
    const { error: deleteError } = await brandClient.fundDocuments
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      console.error('[deleteLpaConsentForm] 문서 삭제 실패:', deleteError);
      throw new Error(`규약 동의서 삭제 실패: ${deleteError.message}`);
    }

    console.log('[deleteLpaConsentForm] 문서 삭제 성공');
  }
}
