import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

// 관리자 이메일 목록 (환경변수로 관리)
const ADMIN_EMAILS = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || [
  'admin@snusv.com',
  'manager@snusv.com',
];

/**
 * 사용자가 관리자인지 확인
 */
export function isAdmin(user: User | null): boolean {
  if (!user?.email) return false;
  return ADMIN_EMAILS.includes(user.email);
}

/**
 * 관리자 권한 확인 (클라이언트)
 */
export async function checkAdminAccess(): Promise<{ isAdmin: boolean; user: User | null }> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { isAdmin: false, user: null };
    }

    return {
      isAdmin: isAdmin(user),
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
export function withAdminAuth<T extends object>(WrappedComponent: React.ComponentType<T>) {
  return function AdminProtectedComponent(props: T) {
    // AdminLayout 컴포넌트에서 실제 권한 체크를 수행하므로
    // 여기서는 단순히 컴포넌트를 반환합니다.
    // 실제 사용 시에는 JSX로 <WrappedComponent {...props} /> 형태로 사용됩니다.
    return null; // 플레이스홀더
  };
}
