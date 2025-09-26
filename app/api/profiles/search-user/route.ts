import { createBrandServerClient } from '@/lib/supabase/server';
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

    const brandClient = await createBrandServerClient();

    // 현재 사용자 인증 확인
    const {
      data: { user: currentUser },
      error: authError,
    } = await brandClient.raw.auth.getUser();

    if (authError || !currentUser) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 현재 사용자의 프로필 정보 가져오기 (브랜드별 자동 적용)
    const { data: currentProfile, error: currentProfileError } =
      await brandClient.profiles
        .select('id')
        .eq('user_id', currentUser.id)
        .single();

    if (currentProfileError) {
      return NextResponse.json(
        { error: '현재 사용자 프로필을 찾을 수 없습니다.' },
        { status: 500 }
      );
    }

    const currentProfileId = currentProfile.id;

    // 1. email로 auth user(targetAuthUser)를 찾는다
    const { data: authUsers, error: authListError } =
      await brandClient.raw.auth.admin.listUsers();

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

    // 2. email로 profile을 검색한다 (브랜드별 자동 적용)
    const { data: profile, error: profileError } = await brandClient.profiles
      .select('*')
      .eq('email', email)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: '프로필 검색 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 가입 방법(provider) 정보 추출
    let provider = 'email'; // 기본값
    if (targetAuthUser.identities && targetAuthUser.identities.length > 0) {
      // identities 배열에서 첫 번째 provider 사용
      provider = targetAuthUser.identities[0].provider || 'email';
    } else if (targetAuthUser.app_metadata?.provider) {
      provider = targetAuthUser.app_metadata.provider;
    } else if (
      targetAuthUser.app_metadata?.providers &&
      targetAuthUser.app_metadata.providers.length > 0
    ) {
      provider = targetAuthUser.app_metadata.providers[0];
    }

    const userInfo = {
      id: targetAuthUser.id,
      email: targetAuthUser.email,
      created_at: targetAuthUser.created_at,
      provider: provider,
    };

    // 3. targetAuthUser.id로 profile_permission을 검색한다 (브랜드별 자동 적용)
    const { data: profilePermissions, error: permissionError } =
      await brandClient.profilePermissions
        .select('profile_id')
        .eq('user_id', targetAuthUser.id);

    if (permissionError) {
      return NextResponse.json(
        { error: '권한 검색 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    if (!profile) {
      if (profilePermissions && profilePermissions.length !== 0) {
        const linkedProfileId = profilePermissions[0].profile_id; // 첫 번째 권한의 프로필 ID 사용
        // 본인 프로필은 없으나 다른 계정에 종속된 계정
        if (linkedProfileId === currentProfileId) {
          // 이미 이 계정과 연동됨
          return NextResponse.json({
            found: true,
            status: 'connected',
            user: userInfo,
            profile: profile,
            message: '이미 이 계정과 연동되어 있습니다!',
          });
        } else {
          // 타 계정에 이미 연동됨
          return NextResponse.json({
            found: true,
            status: 'conflict',
            user: userInfo,
            profile: profile,
            message: '타 계정에 이미 연동되어 있는 계정입니다',
          });
        }
      } else {
        // 본인 프로필이 없고 다른 계정에 종속된 계정도 없음
        return NextResponse.json({
          found: true,
          status: 'auth_only',
          user: userInfo,
          profile: null,
          message: '연결이 가능한 이메일입니다.',
        });
      }
    } else {
      // 프로필이 있다면, 이미 독립적으로 사용중인 계정이다.
      if (!profilePermissions || profilePermissions.length === 0) {
        return NextResponse.json({
          found: true,
          status: 'conflict',
          user: userInfo,
          profile: profile,
          message: '독립적으로 사용중인 계정입니다',
        });
      }
    }

    // // 4. 방금 검색한 profile_permisson의 profile_id가 currentUser의 profile_id와 같은지 확인
    // const linkedProfileId = profilePermissions[0].profile_id; // 첫 번째 권한의 프로필 ID 사용

    // if (linkedProfileId === currentProfileId) {
    //   return NextResponse.json({
    //     found: true,
    //     status: 'connected',
    //     user: userInfo,
    //     profile: profile,
    //     message: '이미 이 계정과 연동되어 있습니다!',
    //   });
    // } else {
    //   return NextResponse.json({
    //     found: true,
    //     status: 'conflict',
    //     user: userInfo,
    //     profile: profile,
    //     message: '타 계정에 이미 연동되어 있는 계정입니다',
    //   });
    // }
  } catch (error) {
    console.error('Search user API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
