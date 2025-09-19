import { getFundDetails } from '@/lib/admin/funds';
import { isAdminServer } from '@/lib/auth/admin-server';
import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  const { fundId } = await params;

  if (!fundId) {
    return Response.json({ error: '펀드 ID가 필요합니다' }, { status: 400 });
  }

  try {
    // 사용자 인증 확인
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 관리자 권한 확인
    const isAdmin = await isAdminServer(user);

    // 관리자가 아닌 경우, 해당 펀드에 참여하는지 확인
    if (!isAdmin) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        return Response.json(
          { error: '프로필을 찾을 수 없습니다' },
          { status: 403 }
        );
      }

      const { count } = await supabase
        .from('fund_members')
        .select('*', { count: 'exact', head: true })
        .eq('fund_id', fundId)
        .eq('profile_id', profile.id);

      if (!count || count === 0) {
        return Response.json(
          { error: '해당 펀드에 접근할 권한이 없습니다' },
          { status: 403 }
        );
      }
    }

    // 펀드 상세 정보 조회
    const fundDetails = await getFundDetails(fundId, user.id, isAdmin);

    return Response.json(fundDetails);
  } catch (error) {
    console.error('펀드 상세 정보 조회 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '내부 서버 오류가 발생했습니다',
      },
      { status: 500 }
    );
  }
}
