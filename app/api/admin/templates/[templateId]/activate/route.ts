// 템플릿 활성화 API
// POST /api/admin/templates/:templateId/activate - 템플릿 활성화
// ⚠️ SYSTEM_ADMIN 전용 API

import { activateTemplate } from '@/lib/admin/document-templates';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { requireSystemAdmin } from '@/lib/auth/system-admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    // 관리자 권한 검증
    const { user } = await validateAdminAuth(request);

    // SYSTEM_ADMIN 전용 체크
    if (!requireSystemAdmin(user)) {
      return NextResponse.json(
        {
          error:
            '시스템 관리자 권한이 필요합니다. 템플릿 활성화는 SYSTEM_ADMIN만 가능합니다.',
        },
        { status: 403 }
      );
    }

    const { templateId } = await params;

    const template = await activateTemplate(templateId);

    console.log(
      `[템플릿 활성화] SYSTEM_ADMIN ${user.email}이(가) 템플릿 ${templateId}를 활성화했습니다.`
    );

    return NextResponse.json({
      template,
      message: '템플릿이 활성화되었습니다.',
    });
  } catch (error) {
    console.error('템플릿 활성화 오류:', error);

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
      { error: '템플릿 활성화 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
