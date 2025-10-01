import type { User } from '@supabase/supabase-js';
import { createBrandClient } from '../supabase/client';

/**
 * 사용자가 관리자인지 확인 (DB 기반, 클라이언트용)
 * 1. 본인 프로필의 role 확인
 * 2. profile_permissions를 통해 admin 권한이 있는 프로필 확인
 */
export async function isAdmin(user: User | null): Promise<boolean> {
  if (!user?.id) return false;

  try {
    const brandClient = await createBrandClient();

    console.log(`[isAdmin] 사용자 ID: ${user.id}, 이메일: ${user.email}`);

    // 1. 먼저 본인 프로필의 role 확인 (기존 로직)
    const { data: ownProfile, error: ownError } = await brandClient.profiles
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!ownError && ownProfile) {
      console.log(`[isAdmin] 본인 프로필 role: ${ownProfile.role}`);
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
      console.log(`[isAdmin] ${permissions.length}개의 admin 권한 발견`);

      // admin 권한을 가진 프로필 중 하나라도 ADMIN role이면 true
      const hasAdminProfile = permissions.some(
        (perm: any) => perm.profiles?.role === 'ADMIN'
      );

      if (hasAdminProfile) {
        console.log(`[isAdmin] ADMIN role을 가진 프로필에 admin 권한 있음`);
        return true;
      }
    }

    console.log(`[isAdmin] 관리자 권한 없음`);
    return false;
  } catch (error) {
    console.error('Admin check failed:', error);
    return false;
  }
}

/**
 * 관리자 권한 확인 (클라이언트)
 */
export async function checkAdminAccess(): Promise<{
  isAdmin: boolean;
  user: User | null;
}> {
  try {
    const brandClient = createBrandClient();
    const {
      data: { user },
      error,
    } = await brandClient.raw.auth.getUser();

    if (error || !user) {
      return { isAdmin: false, user: null };
    }

    const adminStatus = await isAdmin(user);

    return {
      isAdmin: adminStatus,
      user,
    };
  } catch (error) {
    console.error('Admin access check failed:', error);
    return { isAdmin: false, user: null };
  }
}

/**
 * 관리자 권한이 필요한 컴포넌트를 감싸는 HOC
 * 실제 구현에서는 AdminLayout 컴포넌트에서 권한 체크를 수행합니다.
 * 이 함수는 향후 확장을 위한 플레이스홀더입니다.
 */
export function withAdminAuth<T extends object>(
  WrappedComponent: React.ComponentType<T>
) {
  return function AdminProtectedComponent(props: T) {
    // AdminLayout 컴포넌트에서 실제 권한 체크를 수행하므로
    // 여기서는 단순히 컴포넌트를 반환합니다.
    // 실제 사용 시에는 JSX로 <WrappedComponent {...props} /> 형태로 사용됩니다.
    return null; // 플레이스홀더
  };
}
