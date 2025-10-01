import { validateUserAccess } from '@/lib/auth/permissions';
import { createBrandServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * 내 profile에 다른 사용자 권한 부여
 * AddAccountModal에서 사용
 *
 * 요청: { email: string, permission: 'admin' | 'view' }
 * - email로 auth 사용자 검색
 * - 해당 사용자에게 현재 profile 접근 권한 부여
 * - profile_permissions 테이블에 권한 레코드 추가
 */
export async function POST(request: NextRequest) {
  try {
    const { email, permission } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: '이메일이 필요합니다.' },
        { status: 400 }
      );
    }

    if (!permission || !['admin', 'view'].includes(permission)) {
      return NextResponse.json(
        { error: '유효한 권한 타입이 필요합니다. (admin 또는 view)' },
        { status: 400 }
      );
    }

    const brandClient = await createBrandServerClient();

    // 인증 및 사용자 확인
    const authResult = await validateUserAccess(
      request,
      '[link-profile-to-user]'
    );
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;

    console.log(
      `[link-profile-to-user] 현재 사용자(${user.id})가 "${email}" 계정에게 권한 부여 시도`
    );

    // 1. 입력한 이메일의 auth 사용자 검색
    let targetAuthUser;
    try {
      const { data: authUsers, error: authListError } =
        await brandClient.raw.auth.admin.listUsers();

      if (authListError) {
        throw authListError;
      }

      console.log(
        `[link-profile-to-user] 총 사용자 수: ${authUsers.users.length}`
      );

      targetAuthUser = authUsers.users.find(
        (user: any) => user.email === email
      );

      if (!targetAuthUser) {
        console.log(
          `[link-profile-to-user] 이메일 "${email}"을 가진 사용자를 찾지 못했습니다.`
        );

        return NextResponse.json({
          found: false,
          message: '해당 이메일로 가입된 계정을 찾을 수 없습니다.',
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

    console.log(
      `[link-profile-to-user] 찾은 사용자: id=${targetAuthUser.id}, email="${targetAuthUser.email}"`
    );

    // 2. 현재 사용자의 profile 검색 (권한을 부여할 profile)
    const { data: myProfile, error: myProfileError } =
      await brandClient.profiles.select('*').eq('user_id', user.id).single();

    if (myProfileError) {
      if (myProfileError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '본인의 프로필을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: '프로필 검색 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    console.log(
      `[link-profile-to-user] 현재 사용자의 프로필: profile ${myProfile.id}`
    );

    // 3. targetAuthUser가 이미 다른 profile의 소유자인지 확인
    const { data: targetUserProfile, error: targetProfileError } =
      await brandClient.profiles
        .select('*')
        .eq('user_id', targetAuthUser.id)
        .single();

    if (targetProfileError && targetProfileError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: '대상 사용자 프로필 검색 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 4. targetAuthUser가 이미 다른 profile의 소유자인 경우 → 권한 부여 불가
    if (targetUserProfile && targetUserProfile.id !== myProfile.id) {
      console.log(
        `[link-profile-to-user] 대상 사용자가 이미 다른 프로필의 소유자: profile ${targetUserProfile.id}`
      );

      return NextResponse.json({
        found: false,
        message:
          '해당 사용자는 이미 다른 프로필의 소유자입니다. 권한 부여가 불가능합니다.',
      });
    }

    // 5. targetAuthUser가 현재 myProfile의 소유자인 경우 (본인에게 권한 부여 시도)
    if (targetUserProfile && targetUserProfile.id === myProfile.id) {
      console.log(
        `[link-profile-to-user] 본인에게 권한 부여 시도: user ${targetAuthUser.id} = profile owner ${myProfile.id}`
      );

      return NextResponse.json({
        found: false,
        message: '본인에게는 권한을 부여할 수 없습니다.',
      });
    }

    // 6. targetAuthUser의 모든 권한 확인 (한 번에 조회)
    const { data: userPermissions, error: permError } =
      await brandClient.profilePermissions
        .select('*')
        .eq('user_id', targetAuthUser.id);

    if (permError) {
      return NextResponse.json(
        { error: '권한 확인 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 7. 권한 분석
    const existingPermission = userPermissions?.find(
      (p: {
        profile_id: string;
        user_id: string;
        permission_type: string;
        [key: string]: any;
      }) => p.profile_id === myProfile.id
    );

    const otherPermissions = userPermissions?.filter(
      (p: {
        profile_id: string;
        user_id: string;
        permission_type: string;
        [key: string]: any;
      }) => p.profile_id !== myProfile.id
    );

    // 8. 다른 profile에 대한 권한이 있는 경우 → 권한 부여 불가
    if (otherPermissions && otherPermissions.length > 0) {
      console.log(
        `[link-profile-to-user] 대상 사용자가 이미 다른 프로필에 대한 권한 보유: ${otherPermissions.length}개`
      );

      return NextResponse.json({
        found: false,
        message:
          '해당 사용자는 이미 다른 프로필에 대한 권한을 가지고 있습니다. 한 사용자는 하나의 프로필에만 권한을 가질 수 있습니다.',
      });
    }

    // 9. 권한 부여 시작
    console.log(
      `[link-profile-to-user] 권한 부여 시작: user ${targetAuthUser.id}에게 profile ${myProfile.id} ${permission} 권한 부여`
    );

    // 10. 이미 내 profile에 권한이 있는 경우
    if (existingPermission) {
      console.log(
        `[link-profile-to-user] 이미 권한 존재: ${existingPermission.permission_type}`
      );

      // 동일한 권한이면 그대로 반환
      if (existingPermission.permission_type === permission) {
        return NextResponse.json({
          found: true,
          granted: false,
          permission: existingPermission,
          message: '이미 해당 권한이 부여되어 있습니다.',
        });
      }

      // 다른 권한이면 업데이트
      const { error: updateError } = await brandClient.profilePermissions
        .update({
          permission_type: permission,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPermission.id);

      if (updateError) {
        return NextResponse.json(
          { error: '권한 업데이트에 실패했습니다.' },
          { status: 500 }
        );
      }

      console.log(
        `[link-profile-to-user] 권한 업데이트 성공: ${existingPermission.permission_type} → ${permission}`
      );

      return NextResponse.json({
        found: true,
        granted: true,
        updated: true,
        permission: {
          ...existingPermission,
          permission_type: permission,
        },
        message: `권한이 ${permission}으로 변경되었습니다.`,
      });
    }

    // 11. 새로운 권한 부여
    const { data: newPermission, error: insertError } =
      await brandClient.profilePermissions.insert({
        profile_id: myProfile.id,
        user_id: targetAuthUser.id,
        permission_type: permission,
        granted_by: myProfile.id,
      });

    if (insertError) {
      console.error('[link-profile-to-user] 권한 부여 실패:', insertError);
      return NextResponse.json(
        { error: '권한 부여에 실패했습니다.' },
        { status: 500 }
      );
    }

    console.log(
      `[link-profile-to-user] 권한 부여 성공: user ${targetAuthUser.id} → profile ${myProfile.id} (${permission})`
    );

    return NextResponse.json({
      found: true,
      granted: true,
      permission: newPermission,
      user: {
        id: targetAuthUser.id,
        email: targetAuthUser.email,
      },
      myProfile: {
        id: myProfile.id,
        name: myProfile.name,
      },
      message: `${permission} 권한이 성공적으로 부여되었습니다.`,
    });
  } catch (error) {
    console.error('Link profile to user API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
