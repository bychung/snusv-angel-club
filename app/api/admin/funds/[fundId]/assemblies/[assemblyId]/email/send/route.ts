// 이메일 발송 API

import {
  createAssemblyEmail,
  getAssemblyDocument,
  getLatestAccountDocument,
  getLatestLpaDocument,
  getLatestTaxDocument,
  updateAssemblyEmailStatus,
  updateAssemblyStatus,
} from '@/lib/admin/assemblies';
import { retryWithDelay } from '@/lib/api-utils';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { sendAssemblyEmail } from '@/lib/email/assembly-notifications';
import {
  createBrandServerClient,
  createStorageClient,
} from '@/lib/supabase/server';
import type { EmailAttachment } from '@/types/email';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Storage에서 파일 다운로드 헬퍼
 */
async function downloadFromStorage(path: string): Promise<Buffer> {
  const storageClient = createStorageClient();
  const { data, error } = await storageClient.storage
    .from('generated-documents')
    .download(path);

  if (error || !data) {
    throw new Error(`파일 다운로드 실패: ${path}`);
  }

  return Buffer.from(await data.arrayBuffer());
}

/**
 * documents 테이블의 file_url에서 파일 다운로드
 */
async function downloadFromDocumentsStorage(fileUrl: string): Promise<Buffer> {
  const storageClient = createStorageClient();

  // file_url은 full URL 형태이므로 bucket과 path 추출
  // 예: https://...supabase.co/storage/v1/object/public/fund-documents/path/to/file
  // 또는: https://...supabase.co/storage/v1/object/public/documents/path/to/file
  const urlObj = new URL(fileUrl);
  const pathMatch = urlObj.pathname.match(/\/object\/public\/([^/]+)\/(.+)$/);

  if (!pathMatch) {
    throw new Error(`잘못된 파일 URL: ${fileUrl}`);
  }

  const bucket = pathMatch[1]; // 'fund-documents' 또는 'documents'
  const path = pathMatch[2]; // 실제 파일 경로

  const { data, error } = await storageClient.storage
    .from(bucket)
    .download(path);

  if (error || !data) {
    throw new Error(
      `파일 다운로드 실패: ${fileUrl} (bucket: ${bucket}, path: ${path})`
    );
  }

  return Buffer.from(await data.arrayBuffer());
}

/**
 * POST /api/admin/funds/{fundId}/assemblies/{assemblyId}/email/send
 * 이메일 발송
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string; assemblyId: string }> }
) {
  try {
    const { fundId, assemblyId } = await params;

    // 인증 및 관리자 권한 확인
    const { user, profile } = await validateAdminAuth(request);

    if (!profile) {
      return NextResponse.json(
        { error: '프로필 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();
    const {
      to_ids = [],
      cc_ids = [],
      bcc_ids = [],
      subject,
      body: emailBody,
      documents,
    } = body;

    const totalRecipients = to_ids.length + cc_ids.length + bcc_ids.length;
    if (totalRecipients === 0) {
      return NextResponse.json(
        { error: '수신자를 선택해주세요.' },
        { status: 400 }
      );
    }

    if (!subject || !emailBody) {
      return NextResponse.json(
        { error: '제목과 본문이 필요합니다.' },
        { status: 400 }
      );
    }

    if (!documents) {
      return NextResponse.json(
        { error: '첨부할 문서 정보가 필요합니다.' },
        { status: 400 }
      );
    }

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
    const accountBuffer = await downloadFromDocumentsStorage(
      accountDocument.file_url
    );
    commonAttachments.push({
      filename: accountDocument.file_name || '계좌사본.pdf',
      content: accountBuffer,
      contentType: accountDocument.file_type || 'application/pdf',
    });

    // 1-2. 고유번호증 (필수, 자동 첨부)
    const taxBuffer = await downloadFromDocumentsStorage(taxDocument.file_url);
    commonAttachments.push({
      filename: taxDocument.file_name || '고유번호증.pdf',
      content: taxBuffer,
      contentType: taxDocument.file_type || 'application/pdf',
    });

    // 1-3. 결성총회 의안
    if (documents.common?.formation_agenda) {
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
    if (documents.common?.lpa) {
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

    // 2. 먼저 수신자 정보 조회하여 member_id 파악
    const allRecipientIds = [...to_ids, ...cc_ids, ...bcc_ids];
    const brandClient = await createBrandServerClient();

    // 수신자 정보 조회
    const { data: recipients, error: recipientsError } =
      await brandClient.profiles.select('id, email').in('id', allRecipientIds);

    if (recipientsError || !recipients || recipients.length === 0) {
      return NextResponse.json(
        { error: '수신자 정보를 가져오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    // 실제 수신자의 profile_id 목록 (DB에는 profile_id로 저장되어 있음)
    const recipientProfileIds = allRecipientIds;

    // ID로 이메일 매핑 생성
    const idToEmail = new Map<string, string>(
      recipients.map((r: any) => [r.id as string, r.email as string])
    );

    // 3. 개인별 첨부 파일 매핑 생성 (수신자 profile_id에 대해서만)
    const profileAttachmentsMap = new Map<string, EmailAttachment[]>();

    // 3-1. 결성총회 의안 동의서
    if (
      documents.individual?.formation_consent_form &&
      recipientProfileIds.length > 0
    ) {
      for (const profileId of recipientProfileIds) {
        await retryWithDelay(async () => {
          const { data: doc } = await brandClient.assemblyDocuments
            .select('*')
            .eq('assembly_id', assemblyId)
            .eq('type', 'formation_consent_form')
            .eq('profile_id', profileId)
            .eq('is_split_parent', false)
            .maybeSingle();

          if (!doc || !doc.pdf_storage_path) {
            return;
          }

          const buffer = await downloadFromStorage(doc.pdf_storage_path);
          const attachments = profileAttachmentsMap.get(profileId) || [];
          attachments.push({
            filename: '결성총회 의안 동의서.pdf',
            content: buffer,
            contentType: 'application/pdf',
          });
          profileAttachmentsMap.set(profileId, attachments);
        });
      }
    }

    // 3-2. 규약 동의서
    if (
      documents.individual?.lpa_consent_form &&
      recipientProfileIds.length > 0
    ) {
      const { getIndividualLpaConsentFormPdf } = await import(
        '@/lib/admin/consent-form'
      );

      for (const profileId of recipientProfileIds) {
        await retryWithDelay(async () => {
          const { data: doc } = await brandClient.fundDocuments
            .select('*')
            .eq('fund_id', fundId)
            .eq('type', 'lpa_consent_form')
            .eq('is_active', true)
            .eq('is_split_parent', false)
            .eq('profile_id', profileId)
            .maybeSingle();

          if (!doc) {
            return;
          }

          let buffer: Buffer;

          if (!doc.pdf_storage_path) {
            const result = await getIndividualLpaConsentFormPdf(
              fundId,
              profileId
            );
            buffer = result.buffer;
          } else {
            buffer = await downloadFromStorage(doc.pdf_storage_path);
          }

          const attachments = profileAttachmentsMap.get(profileId) || [];
          attachments.push({
            filename: '규약 동의서.pdf',
            content: buffer,
            contentType: 'application/pdf',
          });
          profileAttachmentsMap.set(profileId, attachments);
        });
      }
    }

    // 3-3. 개인정보 동의서
    if (
      documents.individual?.personal_info_consent_form &&
      recipientProfileIds.length > 0
    ) {
      const { getIndividualPersonalInfoConsentFormPdf } = await import(
        '@/lib/admin/personal-info-consent-form'
      );

      for (const profileId of recipientProfileIds) {
        await retryWithDelay(async () => {
          const { data: doc } = await brandClient.fundDocuments
            .select('*')
            .eq('fund_id', fundId)
            .eq('type', 'personal_info_consent_form')
            .eq('is_active', true)
            .eq('is_split_parent', false)
            .eq('profile_id', profileId)
            .maybeSingle();

          if (!doc) {
            return;
          }

          let buffer: Buffer;

          if (!doc.pdf_storage_path) {
            const result = await getIndividualPersonalInfoConsentFormPdf(
              fundId,
              profileId
            );
            buffer = result.buffer;
          } else {
            buffer = await downloadFromStorage(doc.pdf_storage_path);
          }

          const attachments = profileAttachmentsMap.get(profileId) || [];
          attachments.push({
            filename: '개인정보 동의서.pdf',
            content: buffer,
            contentType: 'application/pdf',
          });
          profileAttachmentsMap.set(profileId, attachments);
        });
      }
    }

    // 각 유형별 이메일 주소 추출
    const recipientEmails = recipients.map((r: any) => r.email);

    // 이메일 발송 기록 생성 (기존 구조 유지)
    const emailRecord = await createAssemblyEmail({
      assemblyId,
      recipientIds: allRecipientIds,
      recipientEmails,
      subject,
      body: emailBody,
      attachedDocumentIds: [], // 개별 첨부로 변경되어 문서 ID 목록이 의미 없음
      sentBy: profile.id,
      brand: profile.brand,
    });

    // 백그라운드에서 수신자별 개별 이메일 발송
    sendIndividualEmailsInBackground({
      emailId: emailRecord.id,
      brand: profile.brand,
      recipientGroups: { to: to_ids, cc: cc_ids, bcc: bcc_ids },
      idToEmail,
      subject,
      body: emailBody,
      commonAttachments,
      profileAttachmentsMap,
      assemblyId,
    });

    return NextResponse.json({
      email_id: emailRecord.id,
      status: 'sending',
      message: '이메일 발송이 시작되었습니다.',
    });
  } catch (error) {
    console.error('이메일 발송 실패:', error);

    if (error instanceof Error) {
      if (error.message.includes('인증')) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message.includes('권한')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: '이메일 발송에 실패했습니다.' },
      { status: 500 }
    );
  }
}

interface SendIndividualEmailsParams {
  emailId: string;
  brand: string;
  recipientGroups: { to: string[]; cc: string[]; bcc: string[] };
  idToEmail: Map<string, string>;
  subject: string;
  body: string;
  commonAttachments: EmailAttachment[];
  profileAttachmentsMap: Map<string, EmailAttachment[]>;
  assemblyId: string;
}

/**
 * 백그라운드에서 수신자별 개별 이메일 발송
 */
async function sendIndividualEmailsInBackground(
  params: SendIndividualEmailsParams
): Promise<void> {
  const {
    emailId,
    brand,
    recipientGroups,
    idToEmail,
    subject,
    body,
    commonAttachments,
    profileAttachmentsMap,
    assemblyId,
  } = params;
  try {
    // 상태를 'sending'으로 업데이트
    await updateAssemblyEmailStatus(emailId, 'sending');

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // 모든 수신자를 순회하며 개별 이메일 발송
    const allRecipients = [
      ...recipientGroups.to.map(id => ({ id, type: 'to' as const })),
      ...recipientGroups.cc.map(id => ({ id, type: 'cc' as const })),
      ...recipientGroups.bcc.map(id => ({ id, type: 'bcc' as const })),
    ];

    for (const recipient of allRecipients) {
      const email = idToEmail.get(recipient.id);
      if (!email) {
        console.warn(`수신자 ${recipient.id}의 이메일을 찾을 수 없습니다.`);
        failCount++;
        continue;
      }

      // 개인별 첨부 파일 추가
      const personalAttachments = profileAttachmentsMap.get(recipient.id) || [];
      const recipientAttachments = [
        ...commonAttachments,
        ...personalAttachments,
      ];

      // 개별 이메일 발송
      try {
        const result = await sendAssemblyEmail({
          brand,
          recipients: [email],
          subject,
          body,
          attachments: recipientAttachments,
        });

        if (result.success) {
          successCount++;
        } else {
          failCount++;
          errors.push(`${email}: ${result.error}`);
          console.error(`이메일 발송 실패 (${email}):`, result.error);
        }
      } catch (error) {
        failCount++;
        const errorMsg =
          error instanceof Error ? error.message : '알 수 없는 오류';
        errors.push(`${email}: ${errorMsg}`);
        console.error(`이메일 발송 중 오류 (${email}):`, error);
      }

      // 과부하 방지를 위한 짧은 지연
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 결과에 따라 상태 업데이트
    if (failCount === 0) {
      // 모두 성공
      await updateAssemblyEmailStatus(emailId, 'sent');
      await updateAssemblyStatus(assemblyId, 'sent');
      console.log(`총회 이메일 발송 완료: ${successCount}명`);
    } else if (successCount === 0) {
      // 모두 실패
      await updateAssemblyEmailStatus(
        emailId,
        'failed',
        `모든 이메일 발송 실패. 오류: ${errors.slice(0, 3).join('; ')}`
      );
      console.error(`총회 이메일 발송 실패: ${failCount}명`);
    } else {
      // 일부 성공, 일부 실패
      await updateAssemblyEmailStatus(
        emailId,
        'sent',
        `일부 발송 실패: ${successCount}/${allRecipients.length} 성공, ${failCount} 실패`
      );
      await updateAssemblyStatus(assemblyId, 'sent');
      console.warn(
        `총회 이메일 일부 발송 실패: ${successCount}명 성공, ${failCount}명 실패`
      );
    }
  } catch (error) {
    console.error('이메일 발송 중 오류:', error);
    await updateAssemblyEmailStatus(
      emailId,
      'failed',
      error instanceof Error ? error.message : '알 수 없는 오류'
    );
  }
}
