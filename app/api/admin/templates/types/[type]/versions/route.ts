// 템플릿 버전 히스토리 조회 API
// GET /api/admin/templates/types/:type/versions - 특정 타입의 모든 버전 조회

import { getTemplatesByType } from '@/lib/admin/document-templates';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { type } = await params;
    const searchParams = request.nextUrl.searchParams;
    const fundId = searchParams.get('fundId');

    // 글로벌 템플릿 또는 펀드별 템플릿 조회
    const templates = await getTemplatesByType(type, fundId || null);

    return NextResponse.json({
      type,
      versions: templates,
    });
  } catch (error) {
    console.error('템플릿 버전 조회 오류:', error);

    if (error instanceof Error) {
      if (error.message === '인증이 필요합니다') {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message === '관리자 권한이 필요합니다') {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: '템플릿 버전 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
