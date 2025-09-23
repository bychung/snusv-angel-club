import { createClient } from '@/lib/supabase/server';
import type {
  CompaniesResponse,
  Company,
  CompanyFilters,
  CompanyInput,
} from '@/types/companies';

/**
 * 회사 목록 조회 (필터링 및 페이징 지원)
 */
export async function getCompanies(
  filters: CompanyFilters = {},
  page: number = 1,
  limit: number = 20
): Promise<CompaniesResponse> {
  const supabase = await createClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from('companies')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  // 카테고리 필터링
  if (filters.categories && filters.categories.length > 0) {
    query = query.overlaps('category', filters.categories);
  }

  // 검색 필터링 (회사명 기준)
  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  // 설립일 필터링
  if (filters.establishedAfter) {
    query = query.gte('established_at', filters.establishedAfter);
  }
  if (filters.establishedBefore) {
    query = query.lte('established_at', filters.establishedBefore);
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`회사 목록 조회 실패: ${error.message}`);
  }

  const total = count || 0;
  const hasMore = total > offset + limit;

  return {
    companies: data || [],
    total,
    page,
    limit,
    hasMore,
  };
}

/**
 * 회사 상세 조회
 */
export async function getCompanyById(
  companyId: string
): Promise<Company | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // 데이터 없음
    }
    throw new Error(`회사 조회 실패: ${error.message}`);
  }

  return data;
}

/**
 * 회사 생성
 */
export async function createCompany(
  companyData: CompanyInput
): Promise<Company> {
  const supabase = await createClient();

  // 사업자등록번호 중복 확인
  if (companyData.business_number) {
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('business_number', companyData.business_number)
      .single();

    if (existing) {
      throw new Error('이미 등록된 사업자등록번호입니다.');
    }
  }

  const { data, error } = await supabase
    .from('companies')
    .insert({
      name: companyData.name,
      description: companyData.description || null,
      website: companyData.website || null,
      business_number: companyData.business_number || null,
      registration_number: companyData.registration_number || null,
      category: companyData.category,
      established_at: companyData.established_at || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`회사 생성 실패: ${error.message}`);
  }

  return data;
}

/**
 * 회사 정보 수정
 */
export async function updateCompany(
  companyId: string,
  companyData: Partial<CompanyInput>
): Promise<Company> {
  const supabase = await createClient();

  // 사업자등록번호 중복 확인 (본인 제외)
  if (companyData.business_number) {
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('business_number', companyData.business_number)
      .neq('id', companyId)
      .single();

    if (existing) {
      throw new Error('이미 등록된 사업자등록번호입니다.');
    }
  }

  const updateData: any = {};

  if (companyData.name !== undefined) updateData.name = companyData.name;
  if (companyData.description !== undefined)
    updateData.description = companyData.description || null;
  if (companyData.website !== undefined)
    updateData.website = companyData.website || null;
  if (companyData.business_number !== undefined)
    updateData.business_number = companyData.business_number || null;
  if (companyData.registration_number !== undefined)
    updateData.registration_number = companyData.registration_number || null;
  if (companyData.category !== undefined)
    updateData.category = companyData.category;
  if (companyData.established_at !== undefined)
    updateData.established_at = companyData.established_at || null;

  const { data, error } = await supabase
    .from('companies')
    .update(updateData)
    .eq('id', companyId)
    .select()
    .single();

  if (error) {
    throw new Error(`회사 정보 수정 실패: ${error.message}`);
  }

  return data;
}

/**
 * 회사 삭제
 */
export async function deleteCompany(companyId: string): Promise<void> {
  const supabase = await createClient();

  // 투자 내역이 있는지 확인
  const { count: investmentCount } = await supabase
    .from('investments')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId);

  if (investmentCount && investmentCount > 0) {
    throw new Error('투자 내역이 있는 회사는 삭제할 수 없습니다.');
  }

  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', companyId);

  if (error) {
    throw new Error(`회사 삭제 실패: ${error.message}`);
  }
}

/**
 * 회사명으로 검색
 */
export async function searchCompaniesByName(
  query: string,
  limit: number = 10
): Promise<Company[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name')
    .limit(limit);

  if (error) {
    throw new Error(`회사 검색 실패: ${error.message}`);
  }

  return data || [];
}

/**
 * 카테고리별 회사 통계
 */
export async function getCompanyStatsByCategory(): Promise<
  Record<string, number>
> {
  const supabase = await createClient();

  const { data, error } = await supabase.from('companies').select('category');

  if (error) {
    throw new Error(`카테고리 통계 조회 실패: ${error.message}`);
  }

  const stats: Record<string, number> = {};

  data?.forEach(company => {
    company.category.forEach((cat: string) => {
      stats[cat] = (stats[cat] || 0) + 1;
    });
  });

  return stats;
}
