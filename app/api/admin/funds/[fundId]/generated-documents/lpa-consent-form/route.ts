// LPA 규약 동의서 조회 API
// GET /api/admin/funds/:fundId/generated-documents/lpa-consent-form

import { getLatestLpaConsentForm } from '@/lib/admin/consent-form';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/funds/[fundId]/generated-documents/lpa-consent-form
 * 최신 규약 동의서 문서 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { fundId } = await params;

    // 최신 문서 조회
    const document = await getLatestLpaConsentForm(fundId);

    if (!document) {
      return NextResponse.json(
        { error: '규약 동의서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error('규약 동의서 조회 오류:', error);

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
      { error: '규약 동의서 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
