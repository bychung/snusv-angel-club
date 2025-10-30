// 개인정보 수집·이용·제공 동의서 변경사항 확인 API
// GET /api/admin/funds/:fundId/generated-documents/personal-info-consent-form/diff

import { calculatePersonalInfoConsentFormDiff } from '@/lib/admin/personal-info-consent-form';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/funds/[fundId]/generated-documents/personal-info-consent-form/diff
 * 개인정보 동의서 변경사항 확인
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { fundId } = await params;

    // Diff 계산
    const diff = await calculatePersonalInfoConsentFormDiff(fundId);

    return NextResponse.json({ diff });
  } catch (error) {
    console.error('개인정보 동의서 변경사항 확인 오류:', error);

    if (error instanceof Error) {
      if (error.message.includes('인증')) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message.includes('권한')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: '변경사항 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
