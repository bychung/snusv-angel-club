import { getFundDetails } from '@/lib/admin/funds';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest } from 'next/server';

/**
 * GET /api/admin/funds/[fundId]/details
 * 관리자용 펀드 상세 정보 조회
 *
 * 멤버십 확인 없이 모든 펀드 접근 가능
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  const { fundId } = await params;

  if (!fundId) {
    return Response.json({ error: '펀드 ID가 필요합니다' }, { status: 400 });
  }

  try {
    // 관리자 권한 검증
    const { user } = await validateAdminAuth(request);

    // 펀드 상세 정보 조회 (관리자는 모든 펀드 접근 가능)
    const fundDetails = await getFundDetails(fundId, user.id);

    // 관리자는 모든 문서 다운로드 가능하도록 변경
    const enhancedDetails = {
      ...fundDetails,
      user_permission: 'admin' as const,
      documents_status: Object.fromEntries(
        Object.entries(fundDetails.documents_status).map(([key, value]) => [
          key,
          { ...value, downloadable: true }, // 관리자는 모든 문서 다운로드 가능
        ])
      ),
    };

    return Response.json(enhancedDetails);
  } catch (error) {
    console.error('관리자 펀드 상세 정보 조회 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '내부 서버 오류가 발생했습니다',
      },
      { status: 500 }
    );
  }
}
