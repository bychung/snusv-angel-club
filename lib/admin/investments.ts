import { createClient } from '@/lib/supabase/server';
import type {
  CompanyInvestmentResponse,
  FundPortfolioResponse,
  InvestmentFilters,
  InvestmentInput,
  InvestmentsResponse,
  InvestmentStats,
  InvestmentWithDetails,
} from '@/types/investments';

/**
 * 투자 목록 조회 (필터링 및 페이징 지원)
 */
export async function getInvestments(
  filters: InvestmentFilters = {},
  page: number = 1,
  limit: number = 20
): Promise<InvestmentsResponse> {
  const supabase = await createClient();
  const offset = (page - 1) * limit;

  // investment_details 뷰를 사용하여 조인된 데이터와 계산된 필드를 한 번에 가져옴
  let query = supabase
    .from('investment_details')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  // 회사 ID 필터링
  if (filters.company_ids && filters.company_ids.length > 0) {
    query = query.in('company_id', filters.company_ids);
  }

  // 펀드 ID 필터링
  if (filters.fund_ids && filters.fund_ids.length > 0) {
    query = query.in('fund_id', filters.fund_ids);
  }

  // 카테고리 필터링
  if (filters.categories && filters.categories.length > 0) {
    query = query.overlaps('company_category', filters.categories);
  }

  // 투자일 필터링
  if (filters.investment_date_after) {
    query = query.gte('investment_date', filters.investment_date_after);
  }
  if (filters.investment_date_before) {
    query = query.lte('investment_date', filters.investment_date_before);
  }

  // 투자금액 필터링
  if (filters.min_investment_amount) {
    query = query.gte('total_investment_amount', filters.min_investment_amount);
  }
  if (filters.max_investment_amount) {
    query = query.lte('total_investment_amount', filters.max_investment_amount);
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`투자 목록 조회 실패: ${error.message}`);
  }

  const total = count || 0;
  const hasMore = total > offset + limit;

  return {
    investments: data || [],
    total,
    page,
    limit,
    hasMore,
  };
}

/**
 * 투자 상세 조회
 */
export async function getInvestmentById(
  investmentId: string
): Promise<InvestmentWithDetails | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('investment_details')
    .select('*')
    .eq('id', investmentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // 데이터 없음
    }
    throw new Error(`투자 조회 실패: ${error.message}`);
  }

  return data;
}

/**
 * 펀드별 포트폴리오 조회
 */
export async function getFundPortfolio(
  fundId: string
): Promise<FundPortfolioResponse | null> {
  const supabase = await createClient();

  // 펀드 정보 조회
  const { data: fund, error: fundError } = await supabase
    .from('funds')
    .select('*')
    .eq('id', fundId)
    .single();

  if (fundError) {
    if (fundError.code === 'PGRST116') {
      return null;
    }
    throw new Error(`펀드 조회 실패: ${fundError.message}`);
  }

  // 해당 펀드의 투자 목록 조회
  const { data: investments, error: investmentError } = await supabase
    .from('investment_details')
    .select('*')
    .eq('fund_id', fundId)
    .order('investment_date', { ascending: false });

  if (investmentError) {
    throw new Error(`포트폴리오 조회 실패: ${investmentError.message}`);
  }

  // 총 투자금액 계산
  const totalInvestmentAmount =
    investments?.reduce(
      (sum, inv) => sum + (inv.total_investment_amount || 0),
      0
    ) || 0;

  return {
    fund,
    investments: investments || [],
    total_investment_amount: totalInvestmentAmount,
    portfolio_count: investments?.length || 0,
  };
}

/**
 * 회사별 투자 현황 조회
 */
export async function getCompanyInvestments(
  companyId: string
): Promise<CompanyInvestmentResponse | null> {
  const supabase = await createClient();

  // 회사 정보 조회
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();

  if (companyError) {
    if (companyError.code === 'PGRST116') {
      return null;
    }
    throw new Error(`회사 조회 실패: ${companyError.message}`);
  }

  // 해당 회사의 투자 목록 조회
  const { data: investments, error: investmentError } = await supabase
    .from('investment_details')
    .select('*')
    .eq('company_id', companyId)
    .order('investment_date', { ascending: false });

  if (investmentError) {
    throw new Error(`회사 투자 현황 조회 실패: ${investmentError.message}`);
  }

  // 총 투자 유치금액 계산
  const totalRaised =
    investments?.reduce(
      (sum, inv) => sum + (inv.total_investment_amount || 0),
      0
    ) || 0;

  return {
    company,
    investments: investments || [],
    total_raised: totalRaised,
    investor_count: investments?.length || 0,
  };
}

/**
 * 투자 생성
 */
export async function createInvestment(
  investmentData: InvestmentInput
): Promise<InvestmentWithDetails> {
  const supabase = await createClient();

  // 회사 및 펀드 존재 확인
  const { count: companyCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('id', investmentData.company_id);

  if (!companyCount || companyCount === 0) {
    throw new Error('존재하지 않는 회사입니다.');
  }

  const { count: fundCount } = await supabase
    .from('funds')
    .select('*', { count: 'exact', head: true })
    .eq('id', investmentData.fund_id);

  if (!fundCount || fundCount === 0) {
    throw new Error('존재하지 않는 펀드입니다.');
  }

  // 중복 투자 확인
  const { data: existing } = await supabase
    .from('investments')
    .select('id')
    .eq('company_id', investmentData.company_id)
    .eq('fund_id', investmentData.fund_id)
    .single();

  if (existing) {
    throw new Error('이미 해당 회사에 투자한 펀드입니다.');
  }

  const { data, error } = await supabase
    .from('investments')
    .insert({
      company_id: investmentData.company_id,
      fund_id: investmentData.fund_id,
      investment_date: investmentData.investment_date || null,
      unit_price: investmentData.unit_price || null,
      investment_shares: investmentData.investment_shares || null,
      issued_shares: investmentData.issued_shares || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`투자 생성 실패: ${error.message}`);
  }

  // 상세 정보 반환
  const detailedInvestment = await getInvestmentById(data.id);
  if (!detailedInvestment) {
    throw new Error('생성된 투자 정보를 조회할 수 없습니다.');
  }

  return detailedInvestment;
}

/**
 * 투자 정보 수정
 */
export async function updateInvestment(
  investmentId: string,
  investmentData: Partial<InvestmentInput>
): Promise<InvestmentWithDetails> {
  const supabase = await createClient();

  // 투자 존재 확인
  const existing = await getInvestmentById(investmentId);
  if (!existing) {
    throw new Error('존재하지 않는 투자입니다.');
  }

  // 회사나 펀드 변경 시 중복 확인
  if (investmentData.company_id || investmentData.fund_id) {
    const companyId = investmentData.company_id || existing.company_id;
    const fundId = investmentData.fund_id || existing.fund_id;

    const { data: duplicate } = await supabase
      .from('investments')
      .select('id')
      .eq('company_id', companyId)
      .eq('fund_id', fundId)
      .neq('id', investmentId)
      .single();

    if (duplicate) {
      throw new Error('이미 해당 회사에 투자한 펀드입니다.');
    }
  }

  const updateData: any = {};

  if (investmentData.company_id !== undefined)
    updateData.company_id = investmentData.company_id;
  if (investmentData.fund_id !== undefined)
    updateData.fund_id = investmentData.fund_id;
  if (investmentData.investment_date !== undefined)
    updateData.investment_date = investmentData.investment_date || null;
  if (investmentData.unit_price !== undefined)
    updateData.unit_price = investmentData.unit_price || null;
  if (investmentData.investment_shares !== undefined)
    updateData.investment_shares = investmentData.investment_shares || null;
  if (investmentData.issued_shares !== undefined)
    updateData.issued_shares = investmentData.issued_shares || null;

  const { error } = await supabase
    .from('investments')
    .update(updateData)
    .eq('id', investmentId);

  if (error) {
    throw new Error(`투자 정보 수정 실패: ${error.message}`);
  }

  // 수정된 상세 정보 반환
  const updatedInvestment = await getInvestmentById(investmentId);
  if (!updatedInvestment) {
    throw new Error('수정된 투자 정보를 조회할 수 없습니다.');
  }

  return updatedInvestment;
}

/**
 * 투자 삭제
 */
export async function deleteInvestment(investmentId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('investments')
    .delete()
    .eq('id', investmentId);

  if (error) {
    throw new Error(`투자 삭제 실패: ${error.message}`);
  }
}

/**
 * 투자 통계 조회
 */
export async function getInvestmentStats(): Promise<InvestmentStats> {
  const supabase = await createClient();

  const { data, error } = await supabase.from('investment_details').select('*');

  if (error) {
    throw new Error(`투자 통계 조회 실패: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return {
      total_investments: 0,
      total_amount: 0,
      total_companies: 0,
      total_funds: 0,
      avg_investment_amount: 0,
      category_breakdown: {},
    };
  }

  const totalAmount = data.reduce(
    (sum, inv) => sum + (inv.total_investment_amount || 0),
    0
  );
  const uniqueCompanies = new Set(data.map(inv => inv.company_id)).size;
  const uniqueFunds = new Set(data.map(inv => inv.fund_id)).size;

  // 카테고리별 분석
  const categoryBreakdown: Record<string, { count: number; amount: number }> =
    {};

  data.forEach(inv => {
    if (inv.company_category && Array.isArray(inv.company_category)) {
      inv.company_category.forEach((category: string) => {
        if (!categoryBreakdown[category]) {
          categoryBreakdown[category] = { count: 0, amount: 0 };
        }
        categoryBreakdown[category].count += 1;
        categoryBreakdown[category].amount += inv.total_investment_amount || 0;
      });
    }
  });

  return {
    total_investments: data.length,
    total_amount: totalAmount,
    total_companies: uniqueCompanies,
    total_funds: uniqueFunds,
    avg_investment_amount: data.length > 0 ? totalAmount / data.length : 0,
    category_breakdown: categoryBreakdown,
  };
}
