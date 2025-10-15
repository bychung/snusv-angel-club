import {
  activateTemplate,
  getTemplateById,
} from '@/lib/admin/document-templates';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest } from 'next/server';

// 펀드별 템플릿 활성화
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string; type: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { fundId, type } = await params;
    const body = await request.json();
    const { templateId } = body;

    // 입력 검증
    if (!templateId) {
      return Response.json(
        { error: '템플릿 ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 템플릿 검증 (해당 펀드의 템플릿인지 확인)
    const template = await getTemplateById(templateId);
    if (!template) {
      return Response.json(
        { error: '템플릿을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if (template.fund_id !== fundId || template.type !== type) {
      return Response.json({ error: '잘못된 템플릿입니다' }, { status: 400 });
    }

    // 템플릿 활성화
    const activatedTemplate = await activateTemplate(templateId);

    return Response.json({
      success: true,
      template: activatedTemplate,
    });
  } catch (error) {
    console.error('템플릿 활성화 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '템플릿 활성화에 실패했습니다',
      },
      { status: 500 }
    );
  }
}
