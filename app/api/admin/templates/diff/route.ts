import { compareTemplateVersions } from '@/lib/admin/template-diff';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest } from 'next/server';

/**
 * GET /api/admin/templates/diff?from={fromId}&to={toId}
 * 두 템플릿 버전을 비교하여 변경사항 반환
 */
export async function GET(request: NextRequest) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { searchParams } = new URL(request.url);
    const fromId = searchParams.get('from');
    const toId = searchParams.get('to');

    if (!fromId || !toId) {
      return Response.json(
        { error: '비교할 템플릿 ID가 필요합니다 (from, to)' },
        { status: 400 }
      );
    }

    if (fromId === toId) {
      return Response.json(
        { error: '동일한 템플릿은 비교할 수 없습니다' },
        { status: 400 }
      );
    }

    // Diff 생성
    const diff = await compareTemplateVersions(fromId, toId);

    return Response.json(diff);
  } catch (error) {
    console.error('템플릿 비교 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : '템플릿 비교 중 오류 발생',
      },
      { status: 500 }
    );
  }
}
