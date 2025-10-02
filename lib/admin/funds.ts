import { createBrandServerClient } from '@/lib/supabase/server';
import type { Fund } from '@/types/database';
import { DocumentCategory } from '@/types/documents';

export interface FundWithStats extends Fund {
  memberCount: number;
  totalInvestment: number;
  totalCommittedAmount: number;
  registeredMembers: number;
  surveyOnlyMembers: number;
}

export interface FundMemberInfo {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  entity_type: 'individual' | 'corporate';
}

export interface DocumentStatus {
  exists: boolean;
  latest_upload: string | null;
  downloadable: boolean;
}

export interface FundDetailsResponse {
  fund: Fund & { gp_info: FundMemberInfo[]; totalInvestment: number };
  documents_status: {
    agreement: DocumentStatus;
    tax: DocumentStatus;
    account: DocumentStatus;
    registration: DocumentStatus;
  };
  user_permission: 'user' | 'admin';
}

/**
 * 모든 펀드 목록과 통계를 조회합니다 (서버에서만 실행)
 */
export async function getAllFunds(): Promise<FundWithStats[]> {
  const brandClient = await createBrandServerClient();

  // 펀드 목록과 관련 통계 조회 (브랜드별)
  const { data: fundsData, error } = await brandClient.funds
    .select(
      `
      *,
      fund_members (
        id, 
        investment_units,
        total_units,
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
    fundsData?.map((fund: any) => {
      const members = fund.fund_members || [];
      const totalInvestment = members.reduce(
        (sum: number, member: any) =>
          sum + member.investment_units * fund.par_value,
        0
      );
      const totalCommittedAmount = members.reduce(
        (sum: number, member: any) => sum + member.total_units * fund.par_value,
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
        totalCommittedAmount,
        registeredMembers,
        surveyOnlyMembers,
      };
    }) || [];

  return fundsWithStats;
}

/**
 * 특정 펀드의 상세 정보를 조회합니다 (서버에서만 실행)
 *
 * 참고: 이 함수는 일반 API에서 사용되므로 관리자 여부와 무관하게 실제 멤버십만 확인합니다.
 */
export async function getFundDetails(
  fundId: string,
  userId?: string
): Promise<FundDetailsResponse> {
  const brandClient = await createBrandServerClient();

  // 1. 펀드 기본 정보 조회 (브랜드별)
  const { data: fund, error: fundError } = await brandClient.funds
    .select('*')
    .eq('id', fundId)
    .single();

  if (fundError || !fund) {
    throw new Error('펀드를 찾을 수 없습니다');
  }

  // 2. GP 정보 조회 (gp_id 배열에서, 브랜드별)
  let gp_info: FundMemberInfo[] = [];
  if (fund.gp_id && fund.gp_id.length > 0) {
    const { data: gpProfiles } = await brandClient.profiles
      .select('id, name, email, role, entity_type')
      .in('id', fund.gp_id);

    gp_info =
      gpProfiles?.map((profile: any) => ({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role as 'ADMIN' | 'USER',
        entity_type: profile.entity_type as 'individual' | 'corporate',
      })) || [];
  }

  // 3. 펀드 멤버 정보 조회 (전체 결성 금액 계산용, 브랜드별)
  const { data: fundMembers } = await brandClient.fundMembers
    .select('investment_units')
    .eq('fund_id', fundId);

  const totalInvestment =
    fundMembers?.reduce(
      (sum: number, member: any) =>
        sum + member.investment_units * fund.par_value,
      0
    ) || 0;

  // 4. 사용자가 해당 펀드에 참여하는지 확인
  // (본인 프로필 + profile_permissions를 통한 권한이 있는 프로필 모두 확인)
  let isParticipant = false;
  if (userId) {
    const accessibleProfileIds: string[] = [];

    // 4-1. 본인 프로필 확인
    const { data: ownProfile } = await brandClient.profiles
      .select('id')
      .eq('user_id', userId)
      .single();

    if (ownProfile) {
      accessibleProfileIds.push(ownProfile.id);
    }

    // 4-2. profile_permissions를 통해 권한이 있는 프로필들 확인
    const { data: permissions } = await brandClient.profilePermissions
      .select('profile_id')
      .eq('user_id', userId);

    if (permissions && permissions.length > 0) {
      const permissionProfileIds = permissions.map((p: any) => p.profile_id);
      accessibleProfileIds.push(...permissionProfileIds);
    }

    // 4-3. 접근 가능한 프로필 중 하나라도 펀드 멤버인지 확인
    if (accessibleProfileIds.length > 0) {
      const { count } = await brandClient.fundMembers
        .select('*', { count: 'exact', head: true })
        .eq('fund_id', fundId)
        .in('profile_id', accessibleProfileIds);

      isParticipant = (count || 0) > 0;
    }
  }

  // 5. 문서 상태 조회
  const documentCategories = [
    DocumentCategory.AGREEMENT,
    DocumentCategory.TAX,
    DocumentCategory.ACCOUNT,
    DocumentCategory.REGISTRATION,
  ] as const;
  const documents_status = {} as FundDetailsResponse['documents_status'];

  for (const category of documentCategories) {
    const { data: docs } = await brandClient.documents
      .select('created_at')
      .eq('fund_id', fundId)
      .eq('category', category)
      .order('created_at', { ascending: false })
      .limit(1);

    const exists = !!(docs && docs.length > 0);
    // 펀드 참여자는 account, agreement 문서만 다운로드 가능
    const downloadable =
      isParticipant && ['account', 'agreement'].includes(category);

    documents_status[category] = {
      exists,
      latest_upload: exists && docs ? docs[0].created_at : null,
      downloadable,
    };
  }

  return {
    fund: { ...fund, gp_info, totalInvestment },
    documents_status,
    user_permission: 'user',
  };
}

/**
 * 특정 펀드의 조합원 목록을 조회합니다 (GP 선택용, 관리자 전용)
 */
export async function getFundMembers(
  fundId: string
): Promise<FundMemberInfo[]> {
  const brandClient = await createBrandServerClient();

  const { data, error } = await brandClient.fundMembers
    .select(
      `
      profile:profiles (
        id, name, email, role, entity_type
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
      email: item.profile.email,
      role: item.profile.role as 'ADMIN' | 'USER',
      entity_type: item.profile.entity_type as 'individual' | 'corporate',
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
    closed_at?: string;
    registered_at?: string;
    dissolved_at?: string;
    par_value?: number;
    min_units?: number;
    display_locations?: ('dashboard' | 'homepage')[];
  }
): Promise<Fund> {
  const brandClient = await createBrandServerClient();

  // 빈 문자열인 날짜 필드들을 null로 변환
  const sanitizedUpdates = { ...updates };
  if (sanitizedUpdates.closed_at === '') {
    sanitizedUpdates.closed_at = undefined;
  }
  if (sanitizedUpdates.registered_at === '') {
    sanitizedUpdates.registered_at = undefined;
  }
  if (sanitizedUpdates.dissolved_at === '') {
    sanitizedUpdates.dissolved_at = undefined;
  }

  const { data, error } = await brandClient.funds
    .update({
      ...sanitizedUpdates,
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
