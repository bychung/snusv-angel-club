// 조합원 이메일 발송 API

import { validateAdminAuth } from '@/lib/auth/admin-server';
import { sendAssemblyEmail } from '@/lib/email/assembly-notifications';
import { createBrandServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/admin/funds/{fundId}/members/email/send
 * 조합원 이메일 발송
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    const { fundId } = await params;

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
    const { recipient_ids, subject, body: emailBody } = body;

    // 유효성 검증
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

    if (!subject || !subject.trim()) {
      return NextResponse.json(
        { error: '제목을 입력해주세요.' },
        { status: 400 }
      );
    }

    if (!emailBody || !emailBody.trim()) {
      return NextResponse.json(
        { error: '본문을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 펀드 정보 조회
    const brandClient = await createBrandServerClient();
    const { data: fund, error: fundError } = await brandClient.funds
      .select('id, name')
      .eq('id', fundId)
      .single();

    if (fundError || !fund) {
      return NextResponse.json(
        { error: '펀드 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 수신자 이메일 주소 조회
    const { data: recipients, error: recipientsError } =
      await brandClient.profiles
        .select('id, email, name')
        .in('id', recipient_ids);

    if (recipientsError || !recipients || recipients.length === 0) {
      return NextResponse.json(
        { error: '수신자 정보를 가져오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    // 수신자가 해당 펀드의 조합원인지 확인
    const { data: fundMembers, error: fundMembersError } =
      await brandClient.fundMembers
        .select('profile_id')
        .eq('fund_id', fundId)
        .in('profile_id', recipient_ids);

    if (fundMembersError || !fundMembers) {
      return NextResponse.json(
        { error: '조합원 정보를 확인하는데 실패했습니다.' },
        { status: 500 }
      );
    }

    const validRecipientIds = new Set(
      fundMembers.map((m: any) => m.profile_id)
    );
    const validRecipients = recipients.filter((r: any) =>
      validRecipientIds.has(r.id)
    );

    if (validRecipients.length === 0) {
      return NextResponse.json(
        { error: '해당 펀드의 조합원이 아닙니다.' },
        { status: 403 }
      );
    }

    // 이메일 주소 추출 (필터링: 이메일이 있는 수신자만)
    const recipientEmails = validRecipients
      .filter((r: any) => r.email)
      .map((r: any) => r.email);

    if (recipientEmails.length === 0) {
      return NextResponse.json(
        { error: '유효한 이메일 주소가 없습니다.' },
        { status: 400 }
      );
    }

    // 이메일 발송
    const result = await sendAssemblyEmail({
      brand: profile.brand,
      recipients: recipientEmails,
      subject: subject.trim(),
      body: emailBody.trim(),
      attachments: [], // 첨부파일 없음
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '이메일 발송에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${recipientEmails.length}명에게 이메일을 발송했습니다.`,
    });
  } catch (error) {
    console.error('조합원 이메일 발송 실패:', error);

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
