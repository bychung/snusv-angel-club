import { createClient } from '@/lib/supabase/server';
import type { Fund } from '@/types/database';

export interface FundWithStats extends Fund {
  memberCount: number;
  totalInvestment: number;
  registeredMembers: number;
  surveyOnlyMembers: number;
}

export interface FundMemberInfo {
  id: string;
  name: string;
  role: 'ADMIN' | 'USER';
}

export interface DocumentStatus {
  exists: boolean;
  latest_upload: string | null;
  downloadable: boolean;
}

export interface FundDetailsResponse {
  fund: Fund & { gp_info: FundMemberInfo[] };
  documents_status: {
    account: DocumentStatus;
    tax: DocumentStatus;
    registration: DocumentStatus;
    agreement: DocumentStatus;
  };
  user_permission: 'user' | 'admin';
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
      const registeredMembers = members.filter(
        (member: any) => member.profile?.user_id
      ).length;
      const surveyOnlyMembers = members.filter(
        (member: any) => !member.profile?.user_id
      ).length;

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

/**
 * 특정 펀드의 상세 정보를 조회합니다 (서버에서만 실행)
 */
export async function getFundDetails(
  fundId: string,
  userId?: string,
  isAdmin: boolean = false
): Promise<FundDetailsResponse> {
  const supabase = await createClient();

  // 1. 펀드 기본 정보 조회
  const { data: fund, error: fundError } = await supabase
    .from('funds')
    .select('*')
    .eq('id', fundId)
    .single();

  if (fundError || !fund) {
    throw new Error('펀드를 찾을 수 없습니다');
  }

  // 2. GP 정보 조회 (gp_id 배열에서)
  let gp_info: FundMemberInfo[] = [];
  if (fund.gp_id && fund.gp_id.length > 0) {
    const { data: gpProfiles } = await supabase
      .from('profiles')
      .select('id, name, role')
      .in('id', fund.gp_id);

    gp_info =
      gpProfiles?.map(profile => ({
        id: profile.id,
        name: profile.name,
        role: profile.role as 'ADMIN' | 'USER',
      })) || [];
  }

  // 3. 사용자가 해당 펀드에 참여하는지 확인
  let isParticipant = false;
  if (userId && !isAdmin) {
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (userProfile) {
      const { count } = await supabase
        .from('fund_members')
        .select('*', { count: 'exact', head: true })
        .eq('fund_id', fundId)
        .eq('profile_id', userProfile.id);

      isParticipant = (count || 0) > 0;
    }
  }

  // 4. 문서 상태 조회
  const documentCategories = [
    'account',
    'tax',
    'registration',
    'agreement',
  ] as const;
  const documents_status = {} as FundDetailsResponse['documents_status'];

  for (const category of documentCategories) {
    const { data: docs } = await supabase
      .from('documents')
      .select('created_at')
      .eq('fund_id', fundId)
      .eq('category', category)
      .order('created_at', { ascending: false })
      .limit(1);

    const exists = !!(docs && docs.length > 0);
    const downloadable =
      isAdmin || (isParticipant && ['account', 'agreement'].includes(category));

    documents_status[category] = {
      exists,
      latest_upload: exists && docs ? docs[0].created_at : null,
      downloadable,
    };
  }

  return {
    fund: { ...fund, gp_info },
    documents_status,
    user_permission: isAdmin ? 'admin' : 'user',
  };
}

/**
 * 특정 펀드의 조합원 목록을 조회합니다 (GP 선택용, 관리자 전용)
 */
export async function getFundMembers(
  fundId: string
): Promise<FundMemberInfo[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('fund_members')
    .select(
      `
      profile:profiles (
        id, name, role
      )
    `
    )
    .eq('fund_id', fundId);

  if (error) {
    console.error('펀드 조합원 조회 실패:', error);
    throw error;
  }

  if (!data) return [];

  return data
    .filter((item: any) => item?.profile)
    .map((item: any) => ({
      id: item.profile.id,
      name: item.profile.name,
      role: item.profile.role as 'ADMIN' | 'USER',
    }));
}

/**
 * 펀드 기본 정보를 수정합니다 (관리자 전용)
 */
export async function updateFundDetails(
  fundId: string,
  updates: {
    name?: string;
    abbreviation?: string;
    tax_number?: string;
    gp_id?: string[];
    address?: string;
    status?:
      | 'ready'
      | 'processing'
      | 'applied'
      | 'active'
      | 'closing'
      | 'closed';
    account?: string;
    account_bank?: string;
  }
): Promise<Fund> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('funds')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', fundId)
    .select()
    .single();

  if (error) {
    console.error('펀드 정보 수정 실패:', error);
    throw error;
  }

  return data;
}
