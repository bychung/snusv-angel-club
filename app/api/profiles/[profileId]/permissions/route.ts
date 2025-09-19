import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  try {
    const { profileId } = await params;

    if (!profileId) {
      return NextResponse.json(
        { error: '프로필 ID가 필요합니다.' },
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

    // 현재 사용자가 해당 프로필의 owner인지 확인
    const { data: ownerProfile, error: ownerError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .eq('user_id', currentUser.id)
      .single();

    if (ownerError || !ownerProfile) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    // profile_permissions에서 권한 목록 조회
    const { data: permissions, error: permissionsError } = await supabase
      .from('profile_permissions')
      .select('id, user_id, permission_type')
      .eq('profile_id', profileId);

    if (permissionsError) {
      throw permissionsError;
    }

    if (!permissions || permissions.length === 0) {
      return NextResponse.json({ permissions: [] });
    }

    // auth.users 정보 조회
    const { data: authUsers, error: authError2 } =
      await supabase.auth.admin.listUsers();

    if (authError2) {
      throw authError2;
    }

    // 권한 목록과 사용자 정보 결합
    const enrichedPermissions = permissions.map(permission => {
      const authUser = authUsers.users.find(
        (user: any) => user.id === permission.user_id
      );

      // profiles 테이블에서도 검색 시도
      return supabase
        .from('profiles')
        .select('name, email, entity_type')
        .eq('user_id', permission.user_id)
        .single()
        .then(({ data: profile, error: profileError }) => ({
          id: permission.id,
          user_id: permission.user_id,
          permission_type: permission.permission_type,
          user_info: {
            name:
              profile?.name || authUser?.email?.split('@')[0] || '알 수 없음',
            email: profile?.email || authUser?.email || '이메일 없음',
            entity_type: profile?.entity_type || 'individual',
            has_profile: !profileError && !!profile,
            auth_email: authUser?.email,
          },
        }));
    });

    const resolvedPermissions = await Promise.all(enrichedPermissions);

    return NextResponse.json({ permissions: resolvedPermissions });
  } catch (error) {
    console.error('Get permissions API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  try {
    const { profileId } = await params;
    const { userId, permissionType } = await request.json();

    if (!profileId || !userId || !permissionType) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    if (!['admin', 'view'].includes(permissionType)) {
      return NextResponse.json(
        { error: '올바르지 않은 권한 유형입니다.' },
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

    // 현재 사용자가 해당 프로필의 owner인지 확인
    const { data: ownerProfile, error: ownerError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .eq('user_id', currentUser.id)
      .single();

    if (ownerError || !ownerProfile) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    // 권한 업데이트
    const { data, error: updateError } = await supabase
      .from('profile_permissions')
      .update({ permission_type: permissionType })
      .eq('profile_id', profileId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('권한 업데이트 오류:', updateError);
      return NextResponse.json(
        { error: '권한 업데이트에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      permission: data,
    });
  } catch (error) {
    console.error('Update permissions API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
