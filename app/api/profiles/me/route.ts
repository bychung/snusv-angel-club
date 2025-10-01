import { validateUserAccess } from '@/lib/auth/permissions';
import { createBrandServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * 현재 사용자의 프로필 정보 조회
 * 1. 본인 프로필이 있으면 반환
 * 2. 없으면 profile_permissions로 접근 가능한 첫 번째 프로필 반환
 */
export async function GET(request: NextRequest) {
  try {
    // 인증 및 사용자 확인
    const authResult = await validateUserAccess(request, '[profile-me]');
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;

    const brandClient = await createBrandServerClient();

    // 1. 먼저 본인 프로필 확인
    const { data: ownProfile, error: ownError } = await brandClient.profiles
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!ownError && ownProfile) {
      console.log(`[profile-me] 본인 프로필 반환: ${ownProfile.id}`);
      return NextResponse.json({
        profile: ownProfile,
        accessType: 'owner',
      });
    }

    // 2. 본인 프로필이 없으면 profile_permissions를 통해 접근 가능한 프로필 확인
    const { data: permissions } = await brandClient.profilePermissions
      .select(
        `
        profile_id,
        permission_type,
        profiles!profile_permissions_profile_id_fkey!inner (*)
      `
      )
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (permissions?.profiles) {
      const profile = Array.isArray(permissions.profiles)
        ? permissions.profiles[0]
        : permissions.profiles;

      console.log(
        `[profile-me] 권한 부여받은 프로필 반환: ${profile.id} (${permissions.permission_type})`
      );
      return NextResponse.json({
        profile: profile,
        accessType: permissions.permission_type,
        isSharedProfile: true,
      });
    }

    // 3. 접근 가능한 프로필이 전혀 없는 경우
    console.log(`[profile-me] 접근 가능한 프로필이 없음: user ${user.id}`);
    return NextResponse.json({
      profile: null,
      accessType: null,
      message: '접근 가능한 프로필이 없습니다.',
    });
  } catch (error) {
    console.error('프로필 조회 실패:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '프로필을 불러오는데 실패했습니다',
        profile: null,
      },
      { status: 500 }
    );
  }
}
