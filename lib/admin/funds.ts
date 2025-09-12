import { createClient } from '@/lib/supabase/server';
import type { Fund } from '@/types/database';

export interface FundWithStats extends Fund {
  memberCount: number;
  totalInvestment: number;
  registeredMembers: number;
  surveyOnlyMembers: number;
}

/**
 * 모든 펀드 목록과 통계를 조회합니다 (서버에서만 실행)
 */
export async function getAllFunds(): Promise<FundWithStats[]> {
  const supabase = await createClient();

  // 펀드 목록과 관련 통계 조회
  const { data: fundsData, error } = await supabase
    .from('funds')
    .select(
      `
      *,
      fund_members (
        id,
        investment_units,
        profile:profiles (
          id,
          user_id
        )
      )
    `
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('펀드 목록 조회 실패:', error);
    throw error;
  }

  // 각 펀드별 통계 계산
  const fundsWithStats: FundWithStats[] =
    fundsData?.map(fund => {
      const members = fund.fund_members || [];
      const totalInvestment = members.reduce(
        (sum: number, member: any) => sum + member.investment_units,
        0
      );
      const registeredMembers = members.filter((member: any) => member.profile?.user_id).length;
      const surveyOnlyMembers = members.filter((member: any) => !member.profile?.user_id).length;

      return {
        ...fund,
        memberCount: members.length,
        totalInvestment,
        registeredMembers,
        surveyOnlyMembers,
      };
    }) || [];

  return fundsWithStats;
}
