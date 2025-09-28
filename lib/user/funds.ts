import { createBrandServerClient } from '@/lib/supabase/server';

/**
 * 특정 사용자가 신청한 모든 펀드 ID 목록을 조회합니다
 */
export async function getUserAppliedFundIds(userId: string): Promise<string[]> {
  const brandClient = await createBrandServerClient();

  // 1. 사용자 프로필 조회
  const { data: userProfile } = await brandClient.profiles
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!userProfile) {
    return [];
  }

  // 2. 해당 프로필이 신청한 모든 펀드 ID 조회
  const { data: fundMembers } = await brandClient.fundMembers
    .select('fund_id')
    .eq('profile_id', userProfile.id);

  if (!fundMembers) {
    return [];
  }

  return fundMembers.map((member: any) => member.fund_id);
}
