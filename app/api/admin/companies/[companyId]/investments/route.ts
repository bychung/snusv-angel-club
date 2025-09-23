import { getCompanyInvestments } from '@/lib/admin/investments';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest } from 'next/server';

// 회사별 투자 현황 조회 (관리자만)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { companyId } = await params;

    const companyInvestments = await getCompanyInvestments(companyId);

    if (!companyInvestments) {
      return Response.json(
        { error: '회사를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return Response.json(companyInvestments);
  } catch (error) {
    console.error('회사 투자 현황 조회 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '회사 투자 현황을 불러오는데 실패했습니다',
      },
      { status: 500 }
    );
  }
}
