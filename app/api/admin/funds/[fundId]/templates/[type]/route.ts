import { saveFundDocument } from '@/lib/admin/fund-documents';
import { loadLPATemplateForDocument } from '@/lib/admin/lpa-context';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest } from 'next/server';

// 규약 수정용 템플릿 조회 (fund_documents 기반, 없으면 글로벌 템플릿)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string; type: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { fundId, type } = await params;

    // 현재는 LPA만 지원
    if (type !== 'lpa') {
      return Response.json(
        { error: '지원하지 않는 문서 타입입니다' },
        { status: 400 }
      );
    }

    // fund_documents 기반 템플릿 로드 (없으면 글로벌 템플릿)
    const { template, isFromFundDocument } = await loadLPATemplateForDocument(
      fundId
    );

    if (!template) {
      return Response.json(
        { error: '템플릿을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // DocumentTemplate 형식으로 반환 (UI 호환성)
    return Response.json({
      template: {
        id: isFromFundDocument ? null : undefined,
        fund_id: fundId,
        type: type,
        version: template.version,
        description: template.description,
        content: template.content,
        appendix: template.appendix,
        is_active: true,
        created_by: null,
        created_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('템플릿 조회 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '템플릿을 불러오는데 실패했습니다',
      },
      { status: 500 }
    );
  }
}

// 규약 저장 (fund_documents에 새 버전 생성)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string; type: string }> }
) {
  try {
    // 관리자 권한 검증 및 사용자 정보 가져오기
    const { user, profile } = await validateAdminAuth(request);

    const { fundId, type } = await params;
    const body = await request.json();
    const { modifiedContent, modifiedAppendix, changeDescription } = body;

    // 입력 검증
    if (!modifiedContent) {
      return Response.json(
        { error: '수정된 내용이 필요합니다' },
        { status: 400 }
      );
    }

    // 현재는 LPA만 지원
    if (type !== 'lpa') {
      return Response.json(
        { error: '지원하지 않는 문서 타입입니다' },
        { status: 400 }
      );
    }

    // fund_documents에 새 버전으로 저장
    const newDocument = await saveFundDocument({
      fundId,
      type,
      templateId: undefined, // fund_document 기반이므로 templateId 없음
      templateVersion: 'custom', // 커스텀 규약
      processedContent: modifiedContent,
      generationContext: {
        description: changeDescription || '규약 수정',
        modifiedAt: new Date().toISOString(),
        modifiedBy: profile?.name || user.email,
      },
      generatedBy: profile?.id,
    });

    return Response.json({
      success: true,
      document: newDocument,
      newVersion: newDocument.version_number,
    });
  } catch (error) {
    console.error('규약 저장 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : '규약 저장에 실패했습니다',
      },
      { status: 500 }
    );
  }
}
