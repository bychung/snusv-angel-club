import { getFundPortfolio } from '@/lib/admin/investments';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest } from 'next/server';

// 펀드별 포트폴리오 조회 (관리자만)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { fundId } = await params;

    const portfolio = await getFundPortfolio(fundId);

    if (!portfolio) {
      return Response.json(
        { error: '펀드를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return Response.json(portfolio);
  } catch (error) {
    console.error('펀드 포트폴리오 조회 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '펀드 포트폴리오를 불러오는데 실패했습니다',
      },
      { status: 500 }
    );
  }
}
