import type { User } from '@supabase/supabase-js';
import { createBrandServerClient } from '../supabase/server';

export interface ProfileAccessResult {
  isAdmin: boolean;
  accessibleProfileIds: string[];
  hasAccess: boolean;
}

export interface FundAccessResult extends ProfileAccessResult {
  fundMemberProfileIds: string[];
}

/**
 * 사용자가 접근 가능한 프로필 ID들을 반환
 * 1. 본인 프로필 (있는 경우)
 * 2. profile_permissions로 권한 부여받은 프로필들
 *
 * 참고: 관리자도 일반 사용자와 동일하게 처리됩니다.
 * 관리자 권한으로 모든 데이터에 접근하려면 Admin API를 사용하세요.
 */
export async function getAccessibleProfileIds(
  user: User,
  logPrefix: string = '[profile-access]'
): Promise<ProfileAccessResult> {
  const brandClient = await createBrandServerClient();

  console.log(`${logPrefix} 사용자 ${user.id}의 접근 가능한 프로필 확인`);

  const accessibleProfileIds: string[] = [];

  // 1. 본인 프로필 확인
  const { data: ownProfile } = await brandClient.profiles
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (ownProfile) {
    accessibleProfileIds.push(ownProfile.id);
    console.log(`${logPrefix} 본인 프로필 발견: ${ownProfile.id}`);
  }

  // 2. profile_permissions를 통해 권한이 있는 프로필들 확인
  const { data: permissions } = await brandClient.profilePermissions
    .select('profile_id')
    .eq('user_id', user.id);

  if (permissions && permissions.length > 0) {
    const permissionProfileIds = permissions.map((p: any) => p.profile_id);
    accessibleProfileIds.push(...permissionProfileIds);
    console.log(
      `${logPrefix} 권한이 있는 프로필들: ${permissionProfileIds.join(', ')}`
    );
  }

  const hasAccess = accessibleProfileIds.length > 0;

  if (!hasAccess) {
    console.log(`${logPrefix} 접근 가능한 프로필이 없음`);
  }

  return {
    isAdmin: false,
    accessibleProfileIds,
    hasAccess,
  };
}

/**
 * 특정 펀드에 대한 접근 권한 확인
 * 접근 가능한 프로필들이 해당 펀드 멤버인지 확인
 *
 * 참고: 관리자도 일반 사용자와 동일하게 펀드 멤버십을 확인합니다.
 */
export async function checkFundAccess(
  user: User,
  fundId: string,
  logPrefix: string = '[fund-access]'
): Promise<FundAccessResult> {
  const brandClient = await createBrandServerClient();
  const profileAccess = await getAccessibleProfileIds(user, logPrefix);

  if (!profileAccess.hasAccess) {
    return {
      ...profileAccess,
      fundMemberProfileIds: [],
    };
  }

  // 접근 가능한 프로필들이 해당 펀드 멤버인지 확인
  const { data: fundMembers } = await brandClient.fundMembers
    .select('profile_id')
    .eq('fund_id', fundId)
    .in('profile_id', profileAccess.accessibleProfileIds);

  const fundMemberProfileIds = fundMembers
    ? fundMembers.map((m: any) => m.profile_id)
    : [];
  const hasFundAccess = fundMemberProfileIds.length > 0;

  console.log(
    `${logPrefix} 펀드 ${fundId} 접근 권한: ${
      hasFundAccess ? '있음' : '없음'
    } (${fundMemberProfileIds.length}개 프로필)`
  );

  return {
    ...profileAccess,
    fundMemberProfileIds,
    hasAccess: hasFundAccess,
  };
}

/**
 * API에서 사용할 표준 인증 확인 헬퍼
 * 사용자 인증만 확인합니다. (관리자 여부는 체크하지 않음)
 *
 * 참고: 관리자 권한이 필요한 경우 validateAdminAuth를 사용하세요.
 */
export async function validateUserAccess(
  request: Request,
  logPrefix: string = '[auth-check]'
): Promise<{ user: User } | Response> {
  const brandClient = await createBrandServerClient();

  const {
    data: { user },
    error: authError,
  } = await brandClient.raw.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  console.log(`${logPrefix} 사용자 인증 완료: ${user.id}`);

  return { user };
}

/**
 * 펀드 접근 권한을 확인하고 접근이 거부된 경우 에러 응답 반환
 */
export async function requireFundAccess(
  user: User,
  fundId: string,
  logPrefix: string = '[fund-auth]'
): Promise<FundAccessResult | Response> {
  const access = await checkFundAccess(user, fundId, logPrefix);

  if (!access.hasAccess) {
    if (access.accessibleProfileIds.length === 0) {
      return Response.json(
        { error: '접근 가능한 프로필이 없습니다' },
        { status: 403 }
      );
    } else {
      return Response.json(
        { error: '해당 펀드에 접근할 권한이 없습니다' },
        { status: 403 }
      );
    }
  }

  return access;
}

/**
 * 프로필 접근 권한만 확인 (펀드 무관)
 */
export async function requireProfileAccess(
  user: User,
  logPrefix: string = '[profile-auth]'
): Promise<ProfileAccessResult | Response> {
  const access = await getAccessibleProfileIds(user, logPrefix);

  if (!access.hasAccess) {
    return Response.json(
      { error: '접근 가능한 프로필이 없습니다' },
      { status: 403 }
    );
  }

  return access;
}
