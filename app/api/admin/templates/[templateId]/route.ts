// 템플릿 수정 API
// PUT /api/admin/templates/:templateId - 템플릿 내용 수정 (새 버전 생성)

import { createTemplate } from '@/lib/admin/document-templates';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    // 관리자 권한 검증
    const user = await validateAdminAuth(request);

    const { templateId } = await params;
    const body = await request.json();

    const { content, version, description } = body;

    if (!content || !version) {
      return NextResponse.json(
        { error: '필수 데이터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 기존 템플릿 조회하여 type 가져오기
    const { getTemplateById } = await import('@/lib/admin/document-templates');
    const existingTemplate = await getTemplateById(templateId);

    if (!existingTemplate) {
      return NextResponse.json(
        { error: '템플릿을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 새 버전으로 템플릿 생성
    const newTemplate = await createTemplate({
      type: existingTemplate.type,
      version,
      content,
      description,
      isActive: true, // 새로 생성된 템플릿을 바로 활성화
      createdBy: user.profile?.id,
    });

    return NextResponse.json({
      template: newTemplate,
      message: `템플릿이 v${version}으로 저장되었습니다.`,
    });
  } catch (error) {
    console.error('템플릿 수정 오류:', error);

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
      { error: '템플릿 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
