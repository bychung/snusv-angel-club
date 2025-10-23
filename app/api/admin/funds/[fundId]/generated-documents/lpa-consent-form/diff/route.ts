// LPA 규약 동의서 Diff 조회 API
// GET /api/admin/funds/:fundId/generated-documents/lpa-consent-form/diff

import { calculateLpaConsentFormDiff } from '@/lib/admin/consent-form';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/funds/[fundId]/generated-documents/lpa-consent-form/diff
 * 이전 버전과의 차이점 계산
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
    const diff = await calculateLpaConsentFormDiff(fundId);

    return NextResponse.json({ diff });
  } catch (error) {
    console.error('규약 동의서 Diff 조회 오류:', error);

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
      { error: '규약 동의서 Diff 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
