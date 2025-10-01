import { getFundDetails } from '@/lib/admin/funds';
import { requireFundAccess, validateUserAccess } from '@/lib/auth/permissions';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  const { fundId } = await params;

  if (!fundId) {
    return Response.json({ error: '펀드 ID가 필요합니다' }, { status: 400 });
  }

  try {
    // 인증 및 사용자 확인
    const authResult = await validateUserAccess(request, '[fund-details]');
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;

    // 펀드 접근 권한 확인
    const accessResult = await requireFundAccess(
      user,
      fundId,
      '[fund-details]'
    );
    if (accessResult instanceof Response) return accessResult;

    // 펀드 상세 정보 조회
    const fundDetails = await getFundDetails(fundId, user.id);

    return Response.json(fundDetails);
  } catch (error) {
    console.error('펀드 상세 정보 조회 실패:', error);
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
