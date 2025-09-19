import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

/**
 * 사용자가 관리자인지 확인 (DB 기반, 클라이언트용)
 */
export async function isAdmin(user: User | null): Promise<boolean> {
  if (!user?.email) return false;

  try {
    const supabase = createClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('email', user.email)
      .single();

    if (error || !profile) {
      console.error('Failed to check admin role:', error);
      return false;
    }

    return profile.role === 'ADMIN';
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
    const supabase = createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

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
