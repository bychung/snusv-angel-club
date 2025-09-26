import type { Company } from './companies';
import type { Fund } from './database';

export interface Investment {
  id: string;
  company_id: string;
  fund_id: string;
  investment_date?: string | null;
  unit_price?: number | null; // 투자단가 (원 단위)
  investment_shares?: number | null; // 주식수
  issued_shares?: number | null; // 총발행주식수
  brand: string;
  created_at: string;
  updated_at: string;
}

// 관계 데이터 포함된 투자 정보
export interface InvestmentWithDetails extends Investment {
  company?: Company;
  fund?: Fund;
  company_name?: string;
  company_category?: string[];
  company_website?: string;
  fund_name?: string;
  fund_abbreviation?: string;
  total_investment_amount?: number; // 계산된 총 투자금액
  ownership_percentage?: number; // 계산된 지분율
}

// 투자 생성/수정용 입력 타입
export interface InvestmentInput {
  company_id: string;
  fund_id: string;
  investment_date?: string; // YYYY-MM-DD 형식
  unit_price?: number;
  investment_shares?: number;
  issued_shares?: number;
  brand: string;
}

// 투자 필터링 옵션
export interface InvestmentFilters {
  company_ids?: string[];
  fund_ids?: string[];
  categories?: string[];
  investment_date_after?: string;
  investment_date_before?: string;
  min_investment_amount?: number;
  max_investment_amount?: number;
}

// 페이징된 투자 목록 응답
export interface InvestmentsResponse {
  investments: InvestmentWithDetails[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// 펀드별 포트폴리오 응답
export interface FundPortfolioResponse {
  fund: Fund;
  investments: InvestmentWithDetails[];
  total_investment_amount: number;
  portfolio_count: number;
}

// 회사별 투자 현황 응답
export interface CompanyInvestmentResponse {
  company: Company;
  investments: InvestmentWithDetails[];
  total_raised: number;
  investor_count: number;
}

// 투자 통계
export interface InvestmentStats {
  total_investments: number;
  total_amount: number;
  total_companies: number;
  total_funds: number;
  avg_investment_amount: number;
  category_breakdown: Record<
    string,
    {
      count: number;
      amount: number;
    }
  >;
}

// 유틸리티 함수들
export function calculateInvestmentAmount(
  unitPrice?: number | null,
  shares?: number | null
): number {
  if (!unitPrice || !shares) return 0;
  return unitPrice * shares;
}

export function calculateOwnershipPercentage(
  investmentShares?: number | null,
  issuedShares?: number | null
): number {
  if (!investmentShares || !issuedShares || issuedShares === 0) return 0;
  return (investmentShares / issuedShares) * 100;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercentage(percentage: number): string {
  return `${percentage.toFixed(2)}%`;
}
