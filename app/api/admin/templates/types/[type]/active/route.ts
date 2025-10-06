// 활성 템플릿 조회 API
// GET /api/admin/templates/types/:type/active - 특정 타입의 활성 템플릿 조회

import { getActiveTemplate } from '@/lib/admin/document-templates';
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

    const template = await getActiveTemplate(type);

    if (!template) {
      return NextResponse.json(
        { error: '활성 템플릿을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('활성 템플릿 조회 오류:', error);

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
      { error: '활성 템플릿 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
