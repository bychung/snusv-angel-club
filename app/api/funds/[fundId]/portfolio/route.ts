import { getFundPortfolio } from '@/lib/admin/investments';
import { createBrandServerClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

// 펀드별 포트폴리오 조회 (사용자용 - 권한 제한적)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    const { fundId } = await params;
    const brandClient = await createBrandServerClient();

    // 사용자 인증 확인
    const {
      data: { user },
      error: authError,
    } = await brandClient.raw.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 사용자 프로필 조회 (브랜드별)
    const { data: profile, error: profileError } = await brandClient.profiles
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return Response.json(
        { error: '사용자 프로필을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 해당 펀드의 조합원인지 확인 (브랜드별)
    const { count: memberCount } = await brandClient.fundMembers
      .select('*', { count: 'exact', head: true })
      .eq('fund_id', fundId)
      .eq('profile_id', profile.id);

    if (!memberCount || memberCount === 0) {
      return Response.json(
        { error: '해당 펀드의 조합원이 아닙니다' },
        { status: 403 }
      );
    }

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
