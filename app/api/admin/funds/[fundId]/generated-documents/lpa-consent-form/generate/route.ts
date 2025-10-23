// LPA 규약 동의서 생성 API
// POST /api/admin/funds/:fundId/generated-documents/lpa-consent-form/generate

import { generateLpaConsentForm } from '@/lib/admin/consent-form';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/admin/funds/[fundId]/generated-documents/lpa-consent-form/generate
 * 규약 동의서 생성
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    // 관리자 권한 검증
    const { user, profile } = await validateAdminAuth(request);

    if (!profile) {
      return NextResponse.json(
        { error: '프로필 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const { fundId } = await params;

    // 규약 동의서 생성
    const result = await generateLpaConsentForm({
      fundId,
      userId: profile.id,
    });

    return NextResponse.json(
      {
        document: result.document,
        message: '규약 동의서가 생성되었습니다.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('규약 동의서 생성 실패:', error);

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
      { error: '규약 동의서 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}
