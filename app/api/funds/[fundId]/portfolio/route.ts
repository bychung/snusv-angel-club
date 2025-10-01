import { getFundPortfolio } from '@/lib/admin/investments';
import { requireFundAccess, validateUserAccess } from '@/lib/auth/permissions';
import { NextRequest } from 'next/server';

// 펀드별 포트폴리오 조회 (사용자용 - 권한 제한적)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    const { fundId } = await params;

    // 인증 및 사용자 확인
    const authResult = await validateUserAccess(request, '[fund-portfolio]');
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;

    // 펀드 접근 권한 확인
    const accessResult = await requireFundAccess(
      user,
      fundId,
      '[fund-portfolio]'
    );
    if (accessResult instanceof Response) return accessResult;

    // 포트폴리오 조회
    const portfolio = await getFundPortfolio(fundId);

    if (!portfolio) {
      return Response.json(
        { error: '펀드를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 민감한 정보 제거 (사용자에게는 필요 없는 정보)
    const sanitizedPortfolio = {
      fund: {
        id: portfolio.fund.id,
        name: portfolio.fund.name,
        abbreviation: portfolio.fund.abbreviation,
        status: portfolio.fund.status,
      },
      investments: portfolio.investments.map(inv => ({
        id: inv.id,
        company_id: inv.company_id,
        company_name: inv.company_name,
        company_category: inv.company_category,
        company_website: inv.company_website,
        investment_date: inv.investment_date,
        total_investment_amount: inv.total_investment_amount,
        ownership_percentage: inv.ownership_percentage,
        created_at: inv.created_at,
      })),
      total_investment_amount: portfolio.total_investment_amount,
      portfolio_count: portfolio.portfolio_count,
    };

    return Response.json(sanitizedPortfolio);
  } catch (error) {
    console.error('사용자 포트폴리오 조회 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '포트폴리오를 불러오는데 실패했습니다',
      },
      { status: 500 }
    );
  }
}
