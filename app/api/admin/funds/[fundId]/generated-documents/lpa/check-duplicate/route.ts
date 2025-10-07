// LPA 중복 체크 API Route

import { isDocumentDuplicate } from '@/lib/admin/fund-documents';
import { buildLPAContext, loadLPATemplate } from '@/lib/admin/lpa-context';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/funds/[fundId]/generated-documents/lpa/check-duplicate
 * LPA 중복 여부 확인 (버튼 비활성화용)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    // 관리자 권한 검증
    const { user } = await validateAdminAuth(request);

    const { fundId } = await params;

    // 1. 컨텍스트 구성 (중복 체크용, isPreview=false)
    const context = await buildLPAContext(fundId, user.id, false);

    // 2. 템플릿 로드
    const { templateVersion } = await loadLPATemplate();

    // 3. 중복 체크
    const generationContext = {
      ...context,
      generatedAt: context.generatedAt.toISOString(),
    };

    const isDuplicate = await isDocumentDuplicate(
      fundId,
      'lpa',
      generationContext,
      templateVersion
    );

    return NextResponse.json({
      isDuplicate,
      message: isDuplicate
        ? '이미 동일한 내용의 조합 규약이 존재합니다.'
        : '새로운 문서를 생성할 수 있습니다.',
    });
  } catch (error) {
    console.error('LPA 중복 체크 오류:', error);

    // validateAdminAuth에서 발생한 인증/권한 에러 처리
    if (error instanceof Error) {
      if (error.message === '인증이 필요합니다') {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message === '관리자 권한이 필요합니다') {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }

    // 알 수 없는 오류
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '중복 체크 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
