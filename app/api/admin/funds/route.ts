import { getAllFunds } from '@/lib/admin/funds';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest } from 'next/server';

// 펀드 목록 조회 (관리자만)
export async function GET(request: NextRequest) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const funds = await getAllFunds();

    return Response.json({
      funds,
      total: funds.length,
    });
  } catch (error) {
    console.error('펀드 목록 조회 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '펀드 목록을 불러오는데 실패했습니다',
      },
      { status: 500 }
    );
  }
}
