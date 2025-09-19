import { createClient } from '@/lib/supabase/server';

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
}

/**
 * 관리자 대시보드 통계를 조회합니다 (서버에서만 실행)
 */
export async function getDashboardStats(): Promise<Stats> {
  const supabase = await createClient();

  try {
    // 전체 프로필 수
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // 회원가입한 사용자 수 (user_id가 있는 경우)
    const { count: registeredUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .not('user_id', 'is', null);

    // 총 출자 정보
    const { data: fundData } = await supabase
      .from('fund_members')
      .select('investment_units');

    const totalUnits =
      fundData?.reduce((sum, item) => sum + item.investment_units, 0) || 0;
    const totalInvestment = totalUnits * 1000000; // 1좌당 100만원

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
  const supabase = await createClient();

  try {
    // 최근 프로필 생성/업데이트 활동
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email, created_at, updated_at, user_id')
      .order('updated_at', { ascending: false })
      .limit(10);

    // 최근 펀드 멤버 업데이트
    const { data: fundMembers } = await supabase
      .from('fund_members')
      .select(
        `
        id,
        investment_units,
        created_at,
        updated_at,
        profiles (
          name,
          email
        )
      `
      )
      .order('updated_at', { ascending: false })
      .limit(10);

    const activityList: ActivityItem[] = [];

    // 프로필 활동 추가
    profiles?.forEach(profile => {
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

    // 펀드 멤버 활동 추가
    fundMembers?.forEach(member => {
      if (member.created_at !== member.updated_at) {
        activityList.push({
          id: `fund-${member.id}`,
          type: 'investment_update',
          user_name: (member.profiles as any)?.name || 'Unknown',
          user_email: (member.profiles as any)?.email || 'unknown@email.com',
          timestamp: member.updated_at,
          details: `출자좌수 변경: ${member.investment_units}좌`,
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
