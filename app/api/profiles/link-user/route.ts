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
    const { profileId } = body;

    // 필수 필드 검증
    if (!profileId || typeof profileId !== 'string') {
      return NextResponse.json({ error: '프로필 ID가 필요합니다.' }, { status: 400 });
    }

    // 트랜잭션으로 안전하게 처리
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, user_id, email, name')
      .eq('id', profileId)
      .single();

    if (fetchError || !existingProfile) {
      return NextResponse.json({ error: '프로필을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 이미 다른 사용자와 연결되어 있는지 확인
    if (existingProfile.user_id !== null) {
      return NextResponse.json({ error: '이미 다른 계정과 연결된 프로필입니다.' }, { status: 409 });
    }

    // 현재 사용자가 이미 다른 프로필과 연결되어 있는지 확인
    const { data: userProfiles, error: userProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (userProfileError) {
      console.error('사용자 프로필 확인 오류:', userProfileError);
      return NextResponse.json(
        { error: '프로필 연결 확인 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    if (userProfiles && userProfiles.length > 0) {
      return NextResponse.json({ error: '이미 연결된 프로필이 있습니다.' }, { status: 409 });
    }

    // 프로필에 user_id 연결
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        user_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId)
      .select('id, email, name')
      .single();

    if (updateError) {
      console.error('프로필 연결 오류:', updateError);
      return NextResponse.json({ error: '프로필 연결에 실패했습니다.' }, { status: 500 });
    }

    console.log(
      `[프로필 연결 완료] User: ${user.id}, Profile: ${profileId}, Email: ${updatedProfile.email}`
    );

    return NextResponse.json({
      success: true,
      message: '프로필이 성공적으로 연결되었습니다.',
      profile: {
        id: updatedProfile.id,
        email: updatedProfile.email,
        name: updatedProfile.name,
      },
    });
  } catch (error) {
    console.error('프로필 연결 API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
