// 템플릿 목록 조회 API
// GET /api/admin/templates?category=assembly - 조합원 총회 템플릿 목록 조회
// POST /api/admin/templates - 새 템플릿 생성 (SYSTEM_ADMIN 전용)

import { getAssemblyTemplates } from '@/lib/admin/assembly-templates';
import {
  createTemplate,
  getActiveTemplate,
} from '@/lib/admin/document-templates';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { requireSystemAdmin } from '@/lib/auth/system-admin';
import { NextRequest, NextResponse } from 'next/server';

// 템플릿 목록 조회
export async function GET(request: NextRequest) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');

    // 조합원 총회 템플릿 필터링
    if (category === 'assembly') {
      const templates = await getAssemblyTemplates();
      return NextResponse.json({ templates });
    }

    // 기타 필터링은 향후 추가
    return NextResponse.json(
      { error: '지원하지 않는 카테고리입니다.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('템플릿 목록 조회 오류:', error);

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
      { error: '템플릿 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 새 템플릿 생성 (SYSTEM_ADMIN 전용)
export async function POST(request: NextRequest) {
  try {
    // 관리자 권한 검증
    const { user, profile } = await validateAdminAuth(request);

    // SYSTEM_ADMIN 전용 체크
    if (!requireSystemAdmin(user)) {
      return NextResponse.json(
        {
          error:
            '시스템 관리자 권한이 필요합니다. 템플릿 생성은 SYSTEM_ADMIN만 가능합니다.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const { type, version, content, appendix, description, editable, fundId } =
      body;

    if (!type || !version || !content) {
      return NextResponse.json(
        { error: '필수 데이터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 기존 활성 템플릿 확인
    const existingTemplate = await getActiveTemplate(type, fundId || null);

    // 새 버전으로 템플릿 생성
    const newTemplate = await createTemplate({
      type,
      version,
      content,
      appendix,
      description,
      editable: editable ?? true,
      isActive: true, // 새로 생성된 템플릿을 바로 활성화
      fundId: fundId || null,
      createdBy: profile?.id,
    });

    console.log(
      `[템플릿 생성] SYSTEM_ADMIN ${user.email}이(가) ${type} v${version}을 생성했습니다.`
    );

    return NextResponse.json({
      template: newTemplate,
      previous_version: existingTemplate?.version || null,
      message: `템플릿이 v${version}으로 생성되었습니다.`,
    });
  } catch (error) {
    console.error('템플릿 생성 오류:', error);

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
      { error: '템플릿 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
