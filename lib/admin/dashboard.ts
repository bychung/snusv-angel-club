import { createBrandServerClient } from '@/lib/supabase/server';

export interface Stats {
  totalUsers: number;
  totalInvestment: number;
  totalUnits: number;
  registeredUsers: number;
}

export interface ActivityItem {
  id: string; // 실제 change 레코드의 UUID
  source: 'fmc' | 'pc'; // 'fmc' = fund_member_changes, 'pc' = profile_changes
  type: 'signup' | 'profile_update' | 'investment_update' | 'fund_application';
  user_name: string;
  user_email: string;
  timestamp: string;
  details?: string;
  updated_by_name?: string; // 수정자 이름
}

interface FundMemberChangeData {
  id: string;
  fund_member_id: string;
  changed_by: string | null;
  field_name: 'investment_units' | 'total_units' | 'both' | 'created';
  old_value: string;
  new_value: string;
  changed_at: string;
}

interface ProfileChangeData {
  id: string;
  profile_id: string;
  changed_by: string | null;
  field_name: 'role' | 'email' | 'phone' | 'name' | 'user_id';
  old_value: string;
  new_value: string;
  changed_at: string;
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
    // 최근 펀드 멤버 변경 이력 조회 (브랜드별)
    const { data: fundMemberChanges } = await brandClient.fundMemberChanges
      .select(
        `
        id,
        fund_member_id,
        changed_by,
        field_name,
        old_value,
        new_value,
        changed_at
      `
      )
      .order('changed_at', { ascending: false })
      .limit(10);

    // 최근 프로필 변경 이력 조회 (브랜드별)
    const { data: profileChanges } = await brandClient.profileChanges
      .select(
        `
        id,
        profile_id,
        changed_by,
        field_name,
        old_value,
        new_value,
        changed_at
      `
      )
      .order('changed_at', { ascending: false })
      .limit(10);

    const activityList: ActivityItem[] = [];

    // 펀드 멤버 변경 이력에 대한 추가 정보 조회
    if (fundMemberChanges && fundMemberChanges.length > 0) {
      // fund_member_id 목록 수집
      const fundMemberIds =
        fundMemberChanges.map((change: any) => change.fund_member_id) || [];

      // changed_by 목록 수집
      const changedByIds = fundMemberChanges
        .filter((change: any) => change.changed_by)
        .map((change: any) => change.changed_by);

      // fund_members 정보 조회 (조합원 이름, 이메일, 펀드 이름)
      const { data: fundMembersData } = await brandClient.fundMembers
        .select(
          `
          id,
          profiles (
            name,
            email
          ),
          funds (
            name
          )
        `
        )
        .in('id', fundMemberIds);

      const fundMembersMap = new Map<string, any>();
      fundMembersData?.forEach((fm: any) => {
        fundMembersMap.set(fm.id, fm);
      });

      // changed_by 프로필 정보 조회
      const changedByProfilesMap = new Map<string, any>();
      if (changedByIds.length > 0) {
        const { data: changedByProfiles } = await brandClient.profiles
          .select('id, name')
          .in('id', changedByIds);

        changedByProfiles?.forEach((profile: any) => {
          changedByProfilesMap.set(profile.id, profile);
        });
      }

      // 펀드 멤버 변경 이력 활동 추가
      fundMemberChanges.forEach((change: FundMemberChangeData) => {
        const fundMemberData = fundMembersMap.get(change.fund_member_id);
        if (!fundMemberData) return;

        const fundName =
          (fundMemberData.funds as any)?.name || '알 수 없는 펀드';
        const changedByProfile = change.changed_by
          ? changedByProfilesMap.get(change.changed_by)
          : null;

        // 변경 내용 포맷팅 및 타입 결정
        let details = '';
        let activityType: ActivityItem['type'] = 'investment_update';

        if (change.field_name === 'created') {
          // 신규 출자 신청
          details = `${fundName} - 신규 출자 신청`;
          activityType = 'fund_application';
        } else if (change.field_name === 'both') {
          const oldValues = JSON.parse(change.old_value);
          const newValues = JSON.parse(change.new_value);
          details = `${fundName} - 출자좌수: ${oldValues.investment_units}좌 → ${newValues.investment_units}좌, 약정출자좌수: ${oldValues.total_units}좌 → ${newValues.total_units}좌`;
        } else if (change.field_name === 'investment_units') {
          details = `${fundName} - 출자좌수: ${change.old_value}좌 → ${change.new_value}좌`;
        } else if (change.field_name === 'total_units') {
          details = `${fundName} - 약정출자좌수: ${change.old_value}좌 → ${change.new_value}좌`;
        }

        activityList.push({
          id: change.id,
          source: 'fmc',
          type: activityType,
          user_name: (fundMemberData.profiles as any)?.name || 'Unknown',
          user_email:
            (fundMemberData.profiles as any)?.email || 'unknown@email.com',
          timestamp: change.changed_at,
          details,
          updated_by_name: changedByProfile?.name,
        });
      });
    }

    // 프로필 변경 이력에 대한 추가 정보 조회
    if (profileChanges && profileChanges.length > 0) {
      // profile_id 목록 수집 (변경된 프로필들)
      const profileIds = profileChanges.map(
        (change: ProfileChangeData) => change.profile_id
      );

      // changed_by 목록 수집
      const profileChangedByIds = profileChanges
        .filter((change: ProfileChangeData) => change.changed_by)
        .map((change: ProfileChangeData) => change.changed_by as string);

      // 모든 관련 프로필 ID 수집 (중복 제거)
      const allProfileIds = Array.from(
        new Set([...profileIds, ...profileChangedByIds])
      );

      // 프로필 정보 조회
      const { data: relatedProfiles } = await brandClient.profiles
        .select('id, name, email')
        .in('id', allProfileIds);

      const profilesMap = new Map<string, any>();
      relatedProfiles?.forEach((profile: any) => {
        profilesMap.set(profile.id, profile);
      });

      // 프로필 변경 이력 활동 추가
      profileChanges.forEach((change: ProfileChangeData) => {
        const targetProfile = profilesMap.get(change.profile_id);
        if (!targetProfile) return;

        const changedByProfile = change.changed_by
          ? profilesMap.get(change.changed_by)
          : null;

        // user_id 필드는 회원가입을 의미
        if (change.field_name === 'user_id') {
          activityList.push({
            id: change.id,
            source: 'pc',
            type: 'signup',
            user_name: targetProfile.name,
            user_email: targetProfile.email,
            timestamp: change.changed_at,
            details: '회원가입 완료',
          });
          return;
        }

        // 필드명 한글 변환 (user_id 제외)
        const fieldNameMap: Record<
          'role' | 'email' | 'phone' | 'name',
          string
        > = {
          role: '권한',
          email: '이메일',
          phone: '전화번호',
          name: '이름',
        };

        // role 값 한글 변환
        const roleMap: Record<string, string> = {
          ADMIN: '관리자',
          USER: '일반',
        };

        let oldValueDisplay = change.old_value;
        let newValueDisplay = change.new_value;

        if (change.field_name === 'role') {
          oldValueDisplay = roleMap[change.old_value] || change.old_value;
          newValueDisplay = roleMap[change.new_value] || change.new_value;
        }

        const details = `${
          fieldNameMap[change.field_name as 'role' | 'email' | 'phone' | 'name']
        }: ${oldValueDisplay} → ${newValueDisplay}`;

        activityList.push({
          id: change.id,
          source: 'pc',
          type: 'profile_update',
          user_name: targetProfile.name,
          user_email: targetProfile.email,
          timestamp: change.changed_at,
          details,
          updated_by_name: changedByProfile?.name,
        });
      });
    }

    // 시간순 정렬
    activityList.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return activityList.slice(0, 20);
  } catch (error) {
    console.error('최근 활동 조회 실패:', error);
    throw error;
  }
}
