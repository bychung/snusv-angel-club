// 개인정보 수집·이용·제공 동의서 미리보기 API
// GET /api/admin/funds/:fundId/generated-documents/personal-info-consent-form/preview

import { previewPersonalInfoConsentForm } from '@/lib/admin/personal-info-consent-form';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/funds/[fundId]/generated-documents/personal-info-consent-form/preview
 * 개인정보 동의서 미리보기 (저장 없이 PDF만 생성)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { fundId } = await params;

    // PDF 생성 (저장 없이)
    const pdfBuffer = await previewPersonalInfoConsentForm(fundId);

    // PDF 반환
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition':
          'inline; filename="personal-info-consent-form-preview.pdf"',
      },
    });
  } catch (error) {
    console.error('개인정보 동의서 미리보기 오류:', error);

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
      { error: '개인정보 동의서 미리보기 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
