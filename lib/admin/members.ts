import { createBrandServerClient } from '@/lib/supabase/server';
import type { FundMember, Profile } from '@/types/database';

export interface MemberWithFund extends Profile {
  fund_members?: (FundMember & {
    fund?: { name: string; abbreviation?: string | null; par_value: number };
  })[];
  registration_status: 'registered' | 'survey_only';
}

export interface MemberFilters {
  search?: string;
  filter?: 'all' | 'registered' | 'survey_only';
}

/**
 * 특정 펀드의 조합원 목록을 조회합니다 (서버에서만 실행)
 */
export async function getFundMembers(
  fundId: string,
  filters: MemberFilters = {}
): Promise<MemberWithFund[]> {
  const brandClient = await createBrandServerClient();

  let query = brandClient.fundMembers
    .select(
      `
      *,
      profile:profiles (*),
      fund:funds (name, abbreviation, par_value)
    `
    )
    .eq('fund_id', fundId)
    .order('created_at', { ascending: false });

  // 검색어 필터 (프로필 정보에서 검색)
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    query = query.or(
      `profile.name.ilike.%${searchTerm}%,profile.email.ilike.%${searchTerm}%,profile.phone.like.%${searchTerm}%`
    );
  }

  const { data: fundMembers, error } = await query;

  if (error) {
    console.error('펀드 조합원 조회 실패:', error);
    throw error;
  }

  // 프로필과 fund_member 정보를 합쳐서 형태 변환
  let membersWithStatus: MemberWithFund[] =
    fundMembers?.map((fundMember: any) => ({
      ...fundMember.profile,
      fund_members: [fundMember],
      registration_status: fundMember.profile?.user_id
        ? 'registered'
        : 'survey_only',
    })) || [];

  // 상태 필터
  if (filters.filter && filters.filter !== 'all') {
    membersWithStatus = membersWithStatus.filter(
      member => member.registration_status === filters.filter
    );
  }

  return membersWithStatus;
}

/**
 * 모든 사용자 목록을 조회합니다 (서버에서만 실행)
 */
export async function getAllUsers(
  filters: MemberFilters = {}
): Promise<MemberWithFund[]> {
  const brandClient = await createBrandServerClient();

  let query = brandClient.profiles
    .select(
      `
      *,
      fund_members (
        id,
        investment_units,
        created_at,
        updated_at,
        fund:funds (
          name,
          abbreviation,
          par_value
        )
      )
    `
    )
    .order('created_at', { ascending: false });

  // 검색어 필터
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    query = query.or(
      `name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.like.%${searchTerm}%`
    );
  }

  const { data: profiles, error } = await query;

  if (error) {
    console.error('사용자 목록 조회 실패:', error);
    throw error;
  }

  let usersWithStatus: MemberWithFund[] = profiles.map((profile: any) => ({
    ...profile,
    registration_status: profile.user_id ? 'registered' : 'survey_only',
  }));

  // 상태 필터
  if (filters.filter && filters.filter !== 'all') {
    usersWithStatus = usersWithStatus.filter(
      member => member.registration_status === filters.filter
    );
  }

  return usersWithStatus;
}
