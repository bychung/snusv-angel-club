// 이메일 발송 API

import {
  createAssemblyEmail,
  getAssemblyDocument,
  updateAssemblyEmailStatus,
  updateAssemblyStatus,
} from '@/lib/admin/assemblies';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { sendAssemblyEmail } from '@/lib/email/assembly-notifications';
import {
  createBrandServerClient,
  createStorageClient,
} from '@/lib/supabase/server';
import type { AssemblyDocumentType } from '@/types/assemblies';
import { DOCUMENT_TYPE_NAMES } from '@/types/assemblies';
import type { EmailAttachment } from '@/types/email';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/admin/funds/{fundId}/assemblies/{assemblyId}/email/send
 * 이메일 발송
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string; assemblyId: string }> }
) {
  try {
    const { assemblyId } = await params;

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
    const { recipient_ids, subject, body: emailBody, document_ids } = body;

    if (
      !recipient_ids ||
      !Array.isArray(recipient_ids) ||
      recipient_ids.length === 0
    ) {
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

    if (
      !document_ids ||
      !Array.isArray(document_ids) ||
      document_ids.length === 0
    ) {
      return NextResponse.json(
        { error: '첨부할 문서를 선택해주세요.' },
        { status: 400 }
      );
    }

    // 수신자 이메일 주소 조회
    const brandClient = await createBrandServerClient();
    const { data: recipients, error: recipientsError } =
      await brandClient.profiles.select('id, email').in('id', recipient_ids);

    if (recipientsError || !recipients || recipients.length === 0) {
      return NextResponse.json(
        { error: '수신자 정보를 가져오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    // const recipientEmails = recipients.map((r: { email: string }) => r.email);
    const recipientEmails = ['by@decentier.com']; // 테스트용

    // 첨부 파일 준비
    const attachments: EmailAttachment[] = [];
    const storageClient = createStorageClient();

    for (const docId of document_ids) {
      const document = await getAssemblyDocument(docId);

      if (!document || !document.pdf_storage_path) {
        continue;
      }

      // Storage에서 PDF 다운로드 (Service Role Key 사용)
      const { data: fileData, error: downloadError } =
        await storageClient.storage
          .from('generated-documents')
          .download(document.pdf_storage_path);

      if (downloadError || !fileData) {
        console.error('PDF 다운로드 실패:', downloadError);
        continue;
      }

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

    // 이메일 발송 기록 생성
    const emailRecord = await createAssemblyEmail({
      assemblyId,
      recipientIds: recipient_ids,
      recipientEmails,
      subject,
      body: emailBody,
      attachedDocumentIds: document_ids,
      sentBy: profile.id,
      brand: profile.brand,
    });

    // 백그라운드에서 이메일 발송 (await 하지 않음)
    sendEmailInBackground(
      emailRecord.id,
      profile.brand,
      recipientEmails,
      subject,
      emailBody,
      attachments,
      assemblyId
    );

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

/**
 * 백그라운드에서 이메일 발송
 */
async function sendEmailInBackground(
  emailId: string,
  brand: string,
  recipients: string[],
  subject: string,
  body: string,
  attachments: EmailAttachment[],
  assemblyId: string
): Promise<void> {
  try {
    // 상태를 'sending'으로 업데이트
    await updateAssemblyEmailStatus(emailId, 'sending');

    // 이메일 발송
    const result = await sendAssemblyEmail({
      brand,
      recipients,
      subject,
      body,
      attachments,
    });

    if (result.success) {
      // 성공 시 상태를 'sent'로 업데이트
      await updateAssemblyEmailStatus(emailId, 'sent');

      // 총회 상태를 'sent'로 업데이트
      await updateAssemblyStatus(assemblyId, 'sent');
    } else {
      // 실패 시 상태를 'failed'로 업데이트
      await updateAssemblyEmailStatus(
        emailId,
        'failed',
        result.error || '알 수 없는 오류'
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
