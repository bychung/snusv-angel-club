// 개인정보 수집·이용·제공 동의서 생성 API
// POST /api/admin/funds/:fundId/generated-documents/personal-info-consent-form/generate

import { generatePersonalInfoConsentForm } from '@/lib/admin/personal-info-consent-form';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/admin/funds/[fundId]/generated-documents/personal-info-consent-form/generate
 * 개인정보 동의서 생성
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    // 관리자 권한 검증
    const { user } = await validateAdminAuth(request);

    const { fundId } = await params;

    // 개인정보 동의서 생성
    const { document } = await generatePersonalInfoConsentForm({
      fundId,
      userId: user.id,
    });

    return NextResponse.json({
      document,
      message: '개인정보 동의서가 생성되었습니다.',
    });
  } catch (error) {
    console.error('개인정보 동의서 생성 오류:', error);

    if (error instanceof Error) {
      if (error.message.includes('인증')) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message.includes('권한')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.message.includes('개인 조합원이 없습니다')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: '개인정보 동의서 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
