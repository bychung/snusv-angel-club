import { createBrandServerClient } from '@/lib/supabase/server';
import type { FundMember, Profile } from '@/types/database';

export interface MemberWithFund extends Profile {
  fund_members?: (FundMember & {
    fund?: {
      name: string;
      abbreviation?: string | null;
      par_value: number;
      payment_schedule: 'lump_sum' | 'capital_call';
    };
  })[];
  registration_status: 'registered' | 'survey_only';
}

/**
 * 특정 펀드의 조합원 목록을 조회합니다 (서버에서만 실행)
 * @param fundId - 펀드 ID
 * @param includeDeleted - 삭제된 조합원도 포함할지 여부 (기본값: false)
 */
export async function getFundMembers(
  fundId: string,
  includeDeleted: boolean = false
): Promise<MemberWithFund[]> {
  const brandClient = await createBrandServerClient();

  // includeDeleted에 따라 적절한 select 메서드 선택
  const selectMethod = includeDeleted
    ? brandClient.fundMembers.selectWithDeleted
    : brandClient.fundMembers.select;

  const { data: fundMembers, error } = await selectMethod(
    `
      *,
      profile:profiles (*),
      fund:funds (name, abbreviation, par_value, payment_schedule)
    `
  )
    .eq('fund_id', fundId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('펀드 조합원 조회 실패:', error);
    throw error;
  }

  // 프로필과 fund_member 정보를 합쳐서 형태 변환
  const membersWithStatus: MemberWithFund[] =
    fundMembers?.map((fundMember: any) => ({
      ...fundMember.profile,
      fund_members: [fundMember],
      registration_status: fundMember.profile?.user_id
        ? 'registered'
        : 'survey_only',
    })) || [];

  return membersWithStatus;
}

/**
 * 모든 사용자 목록을 조회합니다 (서버에서만 실행)
 */
export async function getAllUsers(): Promise<MemberWithFund[]> {
  const brandClient = await createBrandServerClient();

  let query = brandClient.profiles
    .select(
      `
      *,
      fund_members (
        id,
        investment_units,
        deleted_at,
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

  const { data: profiles, error } = await query;

  if (error) {
    console.error('사용자 목록 조회 실패:', error);
    throw error;
  }

  const usersWithStatus: MemberWithFund[] = profiles.map((profile: any) => ({
    ...profile,
    // soft delete된 조합원 제외
    fund_members: (profile.fund_members || []).filter(
      (member: any) => !member.deleted_at
    ),
    registration_status: profile.user_id ? 'registered' : 'survey_only',
  }));

  return usersWithStatus;
}
