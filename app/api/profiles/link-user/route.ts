import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: '이메일이 필요합니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    // 현재 사용자 인증 확인
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 1. profiles 테이블에서 이메일로 검색
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      return NextResponse.json({ error: '프로필 검색 중 오류가 발생했습니다.' }, { status: 500 });
    }

    // 2. 이메일을 가진 auth 사용자 검색 (admin API 사용)
    try {
      const { data: authUsers, error: authListError } = await supabase.auth.admin.listUsers();

      if (authListError) {
        throw authListError;
      }

      const targetAuthUser = authUsers.users.find((user: any) => user.email === email);

      if (!targetAuthUser) {
        return NextResponse.json({
          found: false,
          message: '해당 이메일로 가입된 계정을 찾을 수 없습니다.',
        });
      }

      // 3. 프로필이 있으면서 user_id가 null인 경우 → 연결
      if (profile && !profile.user_id) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            user_id: targetAuthUser.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', profile.id);

        if (updateError) {
          return NextResponse.json({ error: '프로필 연결에 실패했습니다.' }, { status: 500 });
        }

        return NextResponse.json({
          found: true,
          linked: true,
          profile: {
            ...profile,
            user_id: targetAuthUser.id,
          },
          message: '프로필과 계정이 성공적으로 연결되었습니다.',
        });
      }

      // 4. 프로필이 이미 다른 계정과 연결된 경우
      if (profile && profile.user_id && profile.user_id !== targetAuthUser.id) {
        return NextResponse.json({
          found: false,
          message: '이미 다른 계정과 연결된 프로필입니다.',
        });
      }

      // 5. 프로필이 있고 올바른 user_id와 연결된 경우
      if (profile && profile.user_id === targetAuthUser.id) {
        return NextResponse.json({
          found: true,
          linked: false,
          profile: profile,
          message: '이미 연결된 계정입니다.',
        });
      }

      // 6. 프로필이 없는 경우 - 가장 일반적인 상황 (OAuth 가입 후 프로필 미생성)
      // 이 경우에는 단순히 성공으로 처리 (profile_permissions에서 user_id로 직접 관리)
      return NextResponse.json({
        found: true,
        linked: false, // 연결할 프로필이 애초에 없었음
        user: {
          id: targetAuthUser.id,
          email: targetAuthUser.email,
          created_at: targetAuthUser.created_at,
        },
        profile: null,
        message: 'OAuth 계정 확인 완료. 권한 부여 준비됨.',
      });
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
    console.error('Link user API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
