import type { User } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { createBrandServerClient } from '../supabase/server';

/**
 * 사용자가 관리자인지 확인 (DB 기반, 서버용)
 * 1. 본인 프로필의 role 확인
 * 2. profile_permissions를 통해 admin 권한이 있는 프로필 확인
 */
export async function isAdminServer(user: User | null): Promise<boolean> {
  if (!user?.id) return false;

  try {
    const brandClient = await createBrandServerClient();

    console.log(`[isAdminServer] 사용자 ID: ${user.id}, 이메일: ${user.email}`);

    // 1. 먼저 본인 프로필의 role 확인 (기존 로직)
    const { data: ownProfile, error: ownError } = await brandClient.profiles
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!ownError && ownProfile) {
      console.log(`[isAdminServer] 본인 프로필 role: ${ownProfile.role}`);
      if (ownProfile.role === 'ADMIN') {
        return true;
      }
    }

    // 2. profile_permissions를 통해 admin 권한이 있는 프로필 확인
    const { data: permissions, error: permError } =
      await brandClient.profilePermissions
        .select(
          `
        permission_type,
        profile_id,
        profiles!profile_permissions_profile_id_fkey!inner (
          role
        )
      `
        )
        .eq('user_id', user.id)
        .eq('permission_type', 'admin');

    if (permError) {
      console.error('권한 확인 실패:', permError);
      return false;
    }

    if (permissions && permissions.length > 0) {
      console.log(`[isAdminServer] ${permissions.length}개의 admin 권한 발견`);

      // admin 권한을 가진 프로필 중 하나라도 ADMIN role이면 true
      const hasAdminProfile = permissions.some(
        (perm: any) => perm.profiles?.role === 'ADMIN'
      );

      if (hasAdminProfile) {
        console.log(
          `[isAdminServer] ADMIN role을 가진 프로필에 admin 권한 있음`
        );
        return true;
      }
    }

    console.log(`[isAdminServer] 관리자 권한 없음`);
    return false;
  } catch (error) {
    console.error('Admin check failed:', error);
    return false;
  }
}

/**
 * API 요청에서 관리자 권한 검증
 * profile_permissions도 고려하여 권한 확인
 */
export async function validateAdminAuth(request: NextRequest) {
  try {
    const brandClient = await createBrandServerClient();

    // 사용자 인증 확인
    const {
      data: { user },
      error: authError,
    } = await brandClient.raw.auth.getUser();
    if (authError || !user) {
      throw new Error('인증이 필요합니다');
    }

    // isAdminServer를 사용하여 권한 확인 (profile_permissions 포함)
    const isAdmin = await isAdminServer(user);
    if (!isAdmin) {
      throw new Error('관리자 권한이 필요합니다');
    }

    // 본인 프로필 조회 (있는 경우에만)
    const { data: profile } = await brandClient.profiles
      .select('*')
      .eq('user_id', user.id)
      .single();

    return { user, profile: profile || null };
  } catch (error) {
    console.error('관리자 권한 검증 실패:', error);
    throw error;
  }
}
