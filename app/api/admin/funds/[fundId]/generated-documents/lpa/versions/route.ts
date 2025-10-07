import { getFundDocumentVersions } from '@/lib/admin/fund-documents';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest } from 'next/server';

/**
 * GET /api/admin/funds/{fundId}/documents/{category}/versions
 * 특정 펀드의 특정 타입 문서의 모든 버전 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { fundId } = await params;

    if (!fundId) {
      return Response.json(
        { error: '펀드 ID와 문서 타입이 필요합니다' },
        { status: 400 }
      );
    }

    // 버전 히스토리 조회 (최신순)
    const versions = await getFundDocumentVersions(fundId, 'lpa');

    // 생성자 정보 포함하여 반환
    // TODO: 필요시 profiles와 조인하여 생성자 이름/이메일 포함
    return Response.json({ versions });
  } catch (error) {
    console.error('문서 버전 조회 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '문서 버전 조회 중 오류 발생',
      },
      { status: 500 }
    );
  }
}
