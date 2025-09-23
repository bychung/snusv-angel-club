import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

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

/**
 * API 요청에서 관리자 권한 검증
 */
export async function validateAdminAuth(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 사용자 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('인증이 필요합니다');
    }

    // 사용자 프로필 및 권한 확인
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('사용자 프로필을 찾을 수 없습니다');
    }

    if (profile.role !== 'ADMIN') {
      throw new Error('관리자 권한이 필요합니다');
    }

    return { user, profile };
  } catch (error) {
    console.error('관리자 권한 검증 실패:', error);
    throw error;
  }
}
