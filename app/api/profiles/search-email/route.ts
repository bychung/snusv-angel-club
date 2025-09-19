import { authenticateRequest } from '@/lib/auth/temp-token';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 인증 확인 (Supabase 세션 또는 임시 토큰)
    const authResult = await authenticateRequest(request, ['email-search']);
    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const { user } = authResult;

    const body = await request.json();
    const { email } = body;

    // 필수 필드 검증
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: '유효한 이메일을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '올바른 이메일 형식을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 타이밍 공격 방지를 위한 지연 시뮬레이션
    const startTime = Date.now();

    try {
      // profiles 테이블에서 완전 일치하는 이메일 검색 (user_id가 null인 것만)
      const { data: profiles, error: searchError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email.trim().toLowerCase())
        .is('user_id', null)
        .limit(1);

      if (searchError) {
        console.error('이메일 검색 오류:', searchError);
        throw new Error('검색 중 오류가 발생했습니다.');
      }

      // 최소 실행 시간 보장 (타이밍 공격 방지)
      const elapsedTime = Date.now() - startTime;
      const minTime = 200; // 최소 200ms
      if (elapsedTime < minTime) {
        await new Promise(resolve =>
          setTimeout(resolve, minTime - elapsedTime)
        );
      }

      const found = profiles && profiles.length > 0;
      const profileData = found ? profiles[0] : null;

      return NextResponse.json({
        found,
        canLink: found && profileData !== null,
        profileId: profileData?.id || null,
        // 보안을 위해 검색된 이메일은 반환하지 않음
      });
    } catch (searchError) {
      // 검색 실패 시에도 동일한 응답 시간 유지
      const elapsedTime = Date.now() - startTime;
      const minTime = 200;
      if (elapsedTime < minTime) {
        await new Promise(resolve =>
          setTimeout(resolve, minTime - elapsedTime)
        );
      }

      console.error('이메일 검색 처리 오류:', searchError);
      return NextResponse.json({
        found: false,
        canLink: false,
        profileId: null,
      });
    }
  } catch (error) {
    console.error('이메일 검색 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
