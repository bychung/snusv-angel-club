// 템플릿 관리 API
// GET /api/admin/templates/:templateId - 템플릿 상세 조회
// PUT /api/admin/templates/:templateId - 템플릿 내용 수정 (새 버전 생성)
// DELETE /api/admin/templates/:templateId - 템플릿 버전 삭제
// ⚠️ PUT/DELETE는 SYSTEM_ADMIN 전용 API

import {
  activateTemplate,
  createTemplate,
  deleteTemplate,
  getTemplateById,
  getTemplatesByType,
} from '@/lib/admin/document-templates';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { requireSystemAdmin } from '@/lib/auth/system-admin';
import { NextRequest, NextResponse } from 'next/server';

// 템플릿 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { templateId } = await params;

    const template = await getTemplateById(templateId);

    if (!template) {
      return NextResponse.json(
        { error: '템플릿을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('템플릿 조회 오류:', error);

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
      { error: '템플릿 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 템플릿 수정 (새 버전 생성)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    // 관리자 권한 검증
    const { user, profile } = await validateAdminAuth(request);

    // SYSTEM_ADMIN 전용 체크
    if (!requireSystemAdmin(user)) {
      return NextResponse.json(
        {
          error:
            '시스템 관리자 권한이 필요합니다. 템플릿 수정은 SYSTEM_ADMIN만 가능합니다.',
        },
        { status: 403 }
      );
    }

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
    const existingTemplate = await getTemplateById(templateId);

    if (!existingTemplate) {
      return NextResponse.json(
        { error: '템플릿을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 새 버전으로 템플릿 생성 (기존 appendix 유지)
    const newTemplate = await createTemplate({
      type: existingTemplate.type,
      version,
      content,
      appendix: existingTemplate.appendix, // 기존 어펜딕스 그대로 유지
      description,
      isActive: true, // 새로 생성된 템플릿을 바로 활성화
      createdBy: profile?.id,
    });

    console.log(
      `[템플릿 수정] SYSTEM_ADMIN ${user.email}이(가) 템플릿 v${version}을 생성했습니다.`
    );

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

// 템플릿 버전 삭제
export async function DELETE(
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
            '시스템 관리자 권한이 필요합니다. 템플릿 삭제는 SYSTEM_ADMIN만 가능합니다.',
        },
        { status: 403 }
      );
    }

    const { templateId } = await params;

    // 삭제할 템플릿 조회
    const templateToDelete = await getTemplateById(templateId);

    if (!templateToDelete) {
      return NextResponse.json(
        { error: '템플릿을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const wasActive = templateToDelete.is_active;
    const templateType = templateToDelete.type;
    const fundId = templateToDelete.fund_id;

    // 템플릿 삭제
    await deleteTemplate(templateId);

    // 활성화된 버전을 삭제한 경우, 이전 버전을 자동 활성화
    if (wasActive) {
      // 같은 타입의 남은 버전들 조회 (삭제된 것 제외)
      const remainingVersions = await getTemplatesByType(
        templateType,
        fundId || null
      );

      // 가장 최근 버전(첫 번째)을 활성화
      if (remainingVersions.length > 0) {
        const latestVersion = remainingVersions[0];
        await activateTemplate(latestVersion.id);
        console.log(
          `[템플릿 삭제] 활성 버전 삭제됨. v${latestVersion.version}을 자동 활성화했습니다.`
        );
      } else {
        console.log(
          `[템플릿 삭제] ${templateType} 타입의 모든 버전이 삭제되었습니다.`
        );
      }
    }

    console.log(
      `[템플릿 삭제] SYSTEM_ADMIN ${user.email}이(가) 템플릿 v${templateToDelete.version}을 삭제했습니다.`
    );

    return NextResponse.json({
      message: '템플릿이 삭제되었습니다.',
      activatedVersion: wasActive
        ? (await getTemplatesByType(templateType, fundId || null))[0]?.version
        : null,
    });
  } catch (error) {
    console.error('템플릿 삭제 오류:', error);

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
      { error: '템플릿 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
