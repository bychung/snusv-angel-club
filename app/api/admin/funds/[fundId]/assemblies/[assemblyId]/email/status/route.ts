// 이메일 발송 상태 조회 API

import { getAssemblyEmails } from '@/lib/admin/assemblies';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/funds/{fundId}/assemblies/{assemblyId}/email/status
 * 이메일 발송 상태 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string; assemblyId: string }> }
) {
  try {
    const { assemblyId } = await params;

    // 인증 및 관리자 권한 확인
    await validateAdminAuth(request);

    // 이메일 발송 기록 조회
    const emails = await getAssemblyEmails(assemblyId);

    // 결과 포맷팅
    const formattedEmails = emails.map(email => ({
      id: email.id,
      status: email.status,
      recipient_count: email.recipient_emails.length,
      sent_at: email.sent_at,
      error_message: email.error_message,
      created_at: email.created_at,
    }));

    return NextResponse.json({ emails: formattedEmails });
  } catch (error) {
    console.error('이메일 상태 조회 실패:', error);

    if (error instanceof Error) {
      if (error.message.includes('인증')) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message.includes('권한')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: '이메일 상태 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}
