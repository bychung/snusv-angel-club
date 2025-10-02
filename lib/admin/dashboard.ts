import { createBrandServerClient } from '@/lib/supabase/server';

export interface Stats {
  totalUsers: number;
  totalInvestment: number;
  totalUnits: number;
  registeredUsers: number;
}

export interface ActivityItem {
  id: string;
  type: 'signup' | 'profile_update' | 'investment_update';
  user_name: string;
  user_email: string;
  timestamp: string;
  details?: string;
  updated_by_name?: string; // 수정자 이름 (출자 정보 수정 시)
}

/**
 * 관리자 대시보드 통계를 조회합니다 (서버에서만 실행)
 */
export async function getDashboardStats(): Promise<Stats> {
  const brandClient = await createBrandServerClient();

  try {
    // 전체 프로필 수 (브랜드별)
    const { count: totalUsers } = await brandClient.profiles.select('*', {
      count: 'exact',
      head: true,
    });

    // 회원가입한 사용자 수 (user_id가 있는 경우, 브랜드별)
    const { count: registeredUsers } = await brandClient.profiles
      .select('*', { count: 'exact', head: true })
      .not('user_id', 'is', null);

    // 총 출자 정보 (브랜드별) - fund의 par_value와 함께 조회
    const { data: fundData } = await brandClient.fundMembers.select(
      `investment_units, funds(par_value)`
    );

    const totalUnits =
      fundData?.reduce(
        (sum: number, item: any) => sum + item.investment_units,
        0
      ) || 0;

    // 각 펀드의 par_value를 고려한 총 투자금액 계산
    const totalInvestment =
      fundData?.reduce((sum: number, item: any) => {
        const parValue = item.funds?.par_value || 1000000; // 기본값 100만원
        return sum + item.investment_units * parValue;
      }, 0) || 0;

    return {
      totalUsers: totalUsers || 0,
      totalInvestment,
      totalUnits,
      registeredUsers: registeredUsers || 0,
    };
  } catch (error) {
    console.error('통계 조회 실패:', error);
    throw error;
  }
}

/**
 * 최근 활동 내역을 조회합니다 (서버에서만 실행)
 */
export async function getRecentActivity(): Promise<ActivityItem[]> {
  const brandClient = await createBrandServerClient();

  try {
    // 최근 프로필 생성/업데이트 활동 (브랜드별)
    const { data: profiles } = await brandClient.profiles
      .select('id, name, email, created_at, updated_at, user_id')
      .order('updated_at', { ascending: false })
      .limit(10);

    // 최근 펀드 멤버 업데이트 (브랜드별)
    const { data: fundMembers } = await brandClient.fundMembers
      .select(
        `
        id,
        investment_units,
        created_at,
        updated_at,
        updated_by,
        profiles (
          name,
          email
        ),
        funds (
          name
        )
      `
      )
      .order('updated_at', { ascending: false })
      .limit(10);

    const activityList: ActivityItem[] = [];

    // 프로필 활동 추가
    profiles?.forEach((profile: any) => {
      // 회원가입 활동 (user_id가 있고 created_at과 updated_at이 비슷한 경우)
      const isNewSignup =
        profile.user_id &&
        Math.abs(
          new Date(profile.created_at).getTime() -
            new Date(profile.updated_at).getTime()
        ) < 60000;

      if (isNewSignup) {
        activityList.push({
          id: `signup-${profile.id}`,
          type: 'signup',
          user_name: profile.name,
          user_email: profile.email,
          timestamp: profile.updated_at,
          details: '회원가입 완료',
        });
      } else if (profile.created_at !== profile.updated_at) {
        activityList.push({
          id: `profile-${profile.id}`,
          type: 'profile_update',
          user_name: profile.name,
          user_email: profile.email,
          timestamp: profile.updated_at,
          details: '프로필 정보 수정',
        });
      }
    });

    // updated_by에 해당하는 프로필 정보를 가져오기 위한 ID 목록 수집
    const updatedByIds =
      fundMembers
        ?.filter((m: any) => m.updated_by)
        .map((m: any) => m.updated_by) || [];

    // updated_by 프로필 정보 조회 (배치로 한 번에 조회)
    const updatedByProfilesMap = new Map<string, any>();
    if (updatedByIds.length > 0) {
      const { data: updatedByProfiles } = await brandClient.profiles
        .select('id, name')
        .in('id', updatedByIds);

      updatedByProfiles?.forEach((profile: any) => {
        updatedByProfilesMap.set(profile.id, profile);
      });
    }

    // 펀드 멤버 활동 추가
    fundMembers?.forEach((member: any) => {
      if (member.created_at !== member.updated_at) {
        const fundName = (member.funds as any)?.name || '알 수 없는 펀드';
        const updatedByProfile = member.updated_by
          ? updatedByProfilesMap.get(member.updated_by)
          : null;

        activityList.push({
          id: `fund-${member.id}`,
          type: 'investment_update',
          user_name: (member.profiles as any)?.name || 'Unknown',
          user_email: (member.profiles as any)?.email || 'unknown@email.com',
          timestamp: member.updated_at,
          details: `${fundName} - 출자좌수 변경: ${member.investment_units}좌`,
          updated_by_name: updatedByProfile?.name,
        });
      }
    });

    // 시간순 정렬
    activityList.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return activityList.slice(0, 8);
  } catch (error) {
    console.error('최근 활동 조회 실패:', error);
    throw error;
  }
}
