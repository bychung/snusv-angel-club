import { authenticateRequest } from '@/lib/auth/temp-token';
import { createBrandServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * OAuth 가입 후 사용자를 기존 profile에 연결
 * FindEmailForm에서 사용
 *
 * 요청: { profileId?: string, email: string }
 * - profileId가 있으면 직접 조회 (더 효율적)
 * - 없으면 email로 검색
 */
export async function POST(request: NextRequest) {
  try {
    const { profileId, email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: '이메일이 필요합니다.' },
        { status: 400 }
      );
    }

    const brandClient = await createBrandServerClient();

    // 현재 사용자 인증 확인 (Supabase 세션 또는 임시 토큰)
    const authResult = await authenticateRequest(request, ['email-search']);

    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const currentUser = authResult.user;

    console.log(
      `[link-user-to-profile] 현재 사용자(${currentUser.id})를 profile에 연결 시도`
    );

    // 1. profile 검색 (profileId 우선, 없으면 email로 검색)
    let profile;
    if (profileId) {
      const { data, error } = await brandClient.profiles
        .select('*')
        .eq('id', profileId)
        .single();

      if (error && error.code !== 'PGRST116') {
        return NextResponse.json(
          { error: '프로필 검색 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }

      profile = data;
    } else {
      const { data, error } = await brandClient.profiles
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') {
        return NextResponse.json(
          { error: '프로필 검색 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }

      profile = data;
    }

    // 2. 프로필이 없는 경우
    if (!profile) {
      return NextResponse.json({
        found: false,
        message: '제공된 정보로 등록된 프로필을 찾을 수 없습니다.',
      });
    }

    // 3. 프로필이 이미 다른 계정과 연결된 경우
    if (profile.user_id && profile.user_id !== currentUser.id) {
      return NextResponse.json({
        found: false,
        message: '이미 다른 계정과 연결된 프로필입니다.',
      });
    }

    // 4. 프로필이 이미 현재 사용자와 연결된 경우
    if (profile.user_id === currentUser.id) {
      return NextResponse.json({
        found: true,
        linked: false,
        profile: profile,
        message: '이미 연결된 계정입니다.',
      });
    }

    // 5. 프로필이 있으면서 user_id가 null인 경우 → 연결
    const { error: updateError } = await brandClient.profiles
      .update({
        user_id: currentUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    if (updateError) {
      return NextResponse.json(
        { error: '프로필 연결에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 6. 회원가입 이력 저장 (user_id 연결)
    const { error: changeHistoryError } =
      await brandClient.profileChanges.insert({
        profile_id: profile.id,
        changed_by: profile.id, // 본인이 회원가입
        field_name: 'user_id',
        old_value: 'null',
        new_value: currentUser.id,
      });

    if (changeHistoryError) {
      console.error('회원가입 이력 저장 실패:', changeHistoryError);
      // 이력 저장 실패는 치명적이지 않으므로 계속 진행
    }

    console.log(
      `[link-user-to-profile] 성공: user ${currentUser.id} → profile ${profile.id}`
    );

    return NextResponse.json({
      found: true,
      linked: true,
      profile: {
        ...profile,
        user_id: currentUser.id,
      },
      message: '프로필과 계정이 성공적으로 연결되었습니다.',
    });
  } catch (error) {
    console.error('Link user to profile API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
