import {
  createInvestment,
  getInvestments,
  getInvestmentStats,
} from '@/lib/admin/investments';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import type { InvestmentFilters, InvestmentInput } from '@/types/investments';
import { NextRequest } from 'next/server';

// 투자 목록 조회 및 통계 (관리자만)
export async function GET(request: NextRequest) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { searchParams } = new URL(request.url);

    // 통계 요청인지 확인
    const statsOnly = searchParams.get('stats') === 'true';
    if (statsOnly) {
      const stats = await getInvestmentStats();
      return Response.json({ stats });
    }

    // 필터 파라미터 파싱
    const filters: InvestmentFilters = {};

    const companyIdsParam = searchParams.get('company_ids');
    if (companyIdsParam) {
      filters.company_ids = companyIdsParam.split(',').filter(Boolean);
    }

    const fundIdsParam = searchParams.get('fund_ids');
    if (fundIdsParam) {
      filters.fund_ids = fundIdsParam.split(',').filter(Boolean);
    }

    const categoriesParam = searchParams.get('categories');
    if (categoriesParam) {
      filters.categories = categoriesParam.split(',').filter(Boolean);
    }

    const investmentDateAfter = searchParams.get('investment_date_after');
    if (investmentDateAfter) {
      filters.investment_date_after = investmentDateAfter;
    }

    const investmentDateBefore = searchParams.get('investment_date_before');
    if (investmentDateBefore) {
      filters.investment_date_before = investmentDateBefore;
    }

    const minInvestmentAmount = searchParams.get('min_investment_amount');
    if (minInvestmentAmount) {
      filters.min_investment_amount = parseInt(minInvestmentAmount);
    }

    const maxInvestmentAmount = searchParams.get('max_investment_amount');
    if (maxInvestmentAmount) {
      filters.max_investment_amount = parseInt(maxInvestmentAmount);
    }

    // 페이징 파라미터
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    const result = await getInvestments(filters, page, limit);

    return Response.json(result);
  } catch (error) {
    console.error('투자 목록 조회 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '투자 목록을 불러오는데 실패했습니다',
      },
      { status: 500 }
    );
  }
}

// 투자 생성 (관리자만)
export async function POST(request: NextRequest) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const body = await request.json();
    const investmentData: InvestmentInput = body;

    // 입력 데이터 검증
    if (!investmentData.company_id?.trim()) {
      return Response.json({ error: '회사 ID는 필수입니다' }, { status: 400 });
    }

    if (!investmentData.fund_id?.trim()) {
      return Response.json({ error: '펀드 ID는 필수입니다' }, { status: 400 });
    }

    // 투자일 형식 검증
    if (investmentData.investment_date) {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(investmentData.investment_date)) {
        return Response.json(
          { error: '투자일 형식이 올바르지 않습니다 (YYYY-MM-DD)' },
          { status: 400 }
        );
      }
    }

    // 숫자 필드 검증
    if (
      investmentData.unit_price !== undefined &&
      investmentData.unit_price < 0
    ) {
      return Response.json(
        { error: '투자단가는 0 이상이어야 합니다' },
        { status: 400 }
      );
    }

    if (
      investmentData.investment_shares !== undefined &&
      investmentData.investment_shares < 0
    ) {
      return Response.json(
        { error: '투자 주식수는 0 이상이어야 합니다' },
        { status: 400 }
      );
    }

    if (
      investmentData.issued_shares !== undefined &&
      investmentData.issued_shares <= 0
    ) {
      return Response.json(
        { error: '총발행주식수는 0보다 커야 합니다' },
        { status: 400 }
      );
    }

    // 지분율 검증 (투자주식수가 총발행주식수를 초과하지 않아야 함)
    if (investmentData.investment_shares && investmentData.issued_shares) {
      if (investmentData.investment_shares > investmentData.issued_shares) {
        return Response.json(
          { error: '투자 주식수가 총발행주식수를 초과할 수 없습니다' },
          { status: 400 }
        );
      }
    }

    const investment = await createInvestment(investmentData);

    return Response.json(
      {
        message: '투자가 성공적으로 등록되었습니다',
        investment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('투자 생성 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : '투자 등록에 실패했습니다',
      },
      { status: 500 }
    );
  }
}
