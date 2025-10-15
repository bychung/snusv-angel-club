import { getTemplatesByType } from '@/lib/admin/document-templates';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest } from 'next/server';

// 펀드별 템플릿 버전 리스트 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string; type: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { fundId, type } = await params;

    // 펀드별 템플릿 전체 버전 조회
    const versions = await getTemplatesByType(type, fundId);

    return Response.json({
      versions,
      total: versions.length,
    });
  } catch (error) {
    console.error('템플릿 버전 목록 조회 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '템플릿 버전 목록을 불러오는데 실패했습니다',
      },
      { status: 500 }
    );
  }
}
