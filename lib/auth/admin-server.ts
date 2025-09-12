import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

/**
 * 사용자가 관리자인지 확인 (DB 기반, 서버용)
 */
export async function isAdminServer(user: User | null): Promise<boolean> {
  if (!user?.email) return false;

  try {
    const supabase = await createClient();
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
