import type { User } from '@supabase/supabase-js';

/**
 * 환경변수에서 시스템 관리자 이메일 목록을 가져옵니다
 * @returns 시스템 관리자 이메일 배열 (소문자, 공백 제거)
 */
function getSystemAdminEmails(): string[] {
  const emailsEnv = process.env.SYSTEM_ADMIN_EMAILS || '';

  if (!emailsEnv.trim()) {
    return [];
  }

  return emailsEnv
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(email => email.length > 0);
}

/**
 * 주어진 이메일이 시스템 관리자인지 확인
 * @param email - 확인할 이메일 주소
 * @returns 시스템 관리자 여부
 */
export function isSystemAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;

  const systemAdminEmails = getSystemAdminEmails();
  const normalizedEmail = email.trim().toLowerCase();

  return systemAdminEmails.includes(normalizedEmail);
}

/**
 * 사용자가 시스템 관리자인지 확인
 * 환경변수 SYSTEM_ADMIN_EMAILS에 등록된 이메일과 비교
 *
 * @param user - Supabase User 객체
 * @returns 시스템 관리자 여부
 *
 * @example
 * const user = await supabase.auth.getUser();
 * if (isSystemAdmin(user)) {
 *   // 시스템 관리자 전용 기능
 * }
 */
export function isSystemAdmin(user: User | null): boolean {
  if (!user?.email) return false;

  const result = isSystemAdminEmail(user.email);

  if (result) {
    console.log(`[isSystemAdmin] SYSTEM_ADMIN 권한 확인: ${user.email}`);
  }

  return result;
}

/**
 * 시스템 관리자 전용 권한이 필요한 작업에 사용
 * (일반 ADMIN은 접근 불가, SYSTEM_ADMIN만 접근 가능)
 *
 * @param user - Supabase User 객체
 * @returns 시스템 관리자 여부
 *
 * @example
 * // API 라우트에서 사용
 * if (!requireSystemAdmin(user)) {
 *   return NextResponse.json(
 *     { error: '시스템 관리자 권한이 필요합니다' },
 *     { status: 403 }
 *   );
 * }
 */
export function requireSystemAdmin(user: User | null): boolean {
  return isSystemAdmin(user);
}

/**
 * 시스템 관리자 이메일 목록을 조회 (디버깅용)
 * ⚠️ 프로덕션 환경에서는 보안상 조심해서 사용해야 합니다
 *
 * @returns 시스템 관리자 이메일 배열
 */
export function getSystemAdminEmailsList(): string[] {
  return getSystemAdminEmails();
}
