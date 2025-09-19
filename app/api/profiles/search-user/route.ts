import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: '이메일이 필요합니다.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 현재 사용자 인증 확인
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 1. profiles 테이블에서 이메일로 검색
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: '프로필 검색 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 2. auth.users에서 이메일로 검색
    try {
      const { data: authUsers, error: authListError } =
        await supabase.auth.admin.listUsers();

      if (authListError) {
        throw authListError;
      }

      const targetAuthUser = authUsers.users.find(
        (user: any) => user.email === email
      );

      if (!targetAuthUser) {
        return NextResponse.json({
          found: false,
          message: '해당 이메일로 가입된 계정을 찾을 수 없습니다.',
        });
      }

      // 3. 결과 구성
      const userInfo = {
        id: targetAuthUser.id,
        email: targetAuthUser.email,
        created_at: targetAuthUser.created_at,
      };

      if (profile) {
        // 프로필이 있는 경우
        if (profile.user_id && profile.user_id === targetAuthUser.id) {
          // 이미 연결됨
          return NextResponse.json({
            found: true,
            status: 'connected',
            user: userInfo,
            profile: profile,
            message: '이미 프로필과 연결된 계정입니다.',
          });
        } else if (profile.user_id && profile.user_id !== targetAuthUser.id) {
          // 다른 계정과 연결됨
          return NextResponse.json({
            found: true,
            status: 'conflict',
            user: userInfo,
            profile: profile,
            message: '이미 다른 계정과 연결된 프로필입니다.',
          });
        } else {
          // 프로필은 있지만 연결 안됨
          return NextResponse.json({
            found: true,
            status: 'unlinked',
            user: userInfo,
            profile: profile,
            message: '프로필이 있지만 계정과 연결되지 않았습니다.',
          });
        }
      } else {
        // 프로필이 없는 경우 (가장 일반적)
        return NextResponse.json({
          found: true,
          status: 'auth_only',
          user: userInfo,
          profile: null,
          message: 'OAuth 가입되어 있지만 프로필이 없습니다. (일반적인 상황)',
        });
      }
    } catch (authError) {
      console.error('Auth admin API error:', authError);
      return NextResponse.json(
        {
          found: false,
          message: '계정 검색 중 오류가 발생했습니다. 관리자에게 문의해주세요.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Search user API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
