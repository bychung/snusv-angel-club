import { isAdminServer } from '@/lib/auth/admin-server';
import { GmailService } from '@/lib/email/gmail';
import { createBrandServerClient } from '@/lib/supabase/server';
import { EmailSenderConfig } from '@/types/email';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 관리자 권한 확인
    const brandClient = await createBrandServerClient();
    const {
      data: { user },
      error: authError,
    } = await brandClient.raw.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const isAdmin = await isAdminServer(user);
    if (!isAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 401 }
      );
    }

    // Gmail 인증 정보 확인
    const credentials = GmailService.getGmailCredentials();
    const gmailService = new GmailService(credentials);

    // 테스트 이메일 발송
    const emailConfig: EmailSenderConfig = {
      from: credentials.senderEmail,
      replyTo: credentials.senderEmail,
      to: ['by@decentier.com'],
      subject: '[SNUSV Angel Club] 테스트 이메일',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb; text-align: center;">SNUSV Angel Club</h2>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">테스트 이메일</h3>
            <p style="color: #6b7280; line-height: 1.6;">
              안녕하세요,<br><br>
              이것은 SNUSV Angel Club에서 발송하는 테스트 이메일입니다.<br><br>
              이메일 발송 기능이 정상적으로 작동하고 있습니다.<br><br>
              <strong>발송 시각:</strong> ${new Date().toLocaleString('ko-KR', {
                timeZone: 'Asia/Seoul',
              })}<br><br>
              감사합니다.<br>
              <strong>SNUSV ANGEL CLUB</strong>
            </p>
          </div>
          <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 30px;">
            <p>이 이메일은 시스템 테스트를 위해 자동으로 발송되었습니다.</p>
          </div>
        </div>
      `,
    };

    const result = await gmailService.sendEmail(emailConfig);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: '테스트 이메일이 성공적으로 발송되었습니다.',
        messageId: result.messageId,
        to: emailConfig.to[0],
      });
    } else {
      return NextResponse.json(
        {
          error: '이메일 발송에 실패했습니다.',
          details: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Test email send error:', error);

    let errorMessage = '알 수 없는 오류가 발생했습니다.';

    if (error instanceof Error) {
      if (error.message.includes('Gmail credentials')) {
        errorMessage =
          'Gmail 인증 정보가 올바르게 설정되지 않았습니다. 환경변수를 확인해주세요.';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
