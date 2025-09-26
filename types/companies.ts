export interface Company {
  id: string;
  name: string;
  description?: string | null;
  website?: string | null;
  business_number?: string | null; // 사업자등록번호
  registration_number?: string | null; // 법인등록번호
  category: string[]; // 산업 카테고리 배열
  established_at?: string | null; // 설립일
  brand: string;
  created_at: string;
  updated_at: string;
}

// 회사 생성/수정용 입력 타입
export interface CompanyInput {
  name: string;
  description?: string;
  website?: string;
  business_number?: string;
  registration_number?: string;
  category: string[];
  established_at?: string; // YYYY-MM-DD 형식
  brand: string;
}

// 산업 카테고리 상수
export const INDUSTRY_CATEGORIES = [
  'AI/ML',
  'FinTech',
  'HealthTech',
  'EdTech',
  'LegalTech',
  'E-commerce',
  'SaaS',
  'Hardware',
  'Biotech',
  'CleanTech',
  'Gaming',
  'Media/Contents',
  'Food Tech',
  'Logistics',
  'Real Estate Tech',
  'Others',
] as const;

export type IndustryCategory = (typeof INDUSTRY_CATEGORIES)[number];

// 회사 필터링 옵션
export interface CompanyFilters {
  categories?: string[];
  search?: string;
  establishedAfter?: string;
  establishedBefore?: string;
}

// 페이징된 회사 목록 응답
export interface CompaniesResponse {
  companies: Company[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// 유틸리티 함수들
export function isValidCategory(
  category: string
): category is IndustryCategory {
  return INDUSTRY_CATEGORIES.includes(category as IndustryCategory);
}

export function validateCategories(categories: string[]): boolean {
  return categories.every(isValidCategory);
}
