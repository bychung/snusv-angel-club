import { getFundMembers } from '@/lib/admin/funds';
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
    // 사용자 인증 및 관리자 권한 확인
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const isAdmin = await isAdminServer(user);
    if (!isAdmin) {
      return Response.json({ error: '관리자 권한이 필요합니다' }, { status: 403 });
    }

    // 펀드 조합원 목록 조회
    const members = await getFundMembers(fundId);

    return Response.json({ members });
  } catch (error) {
    console.error('펀드 조합원 목록 조회 실패:', error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : '내부 서버 오류가 발생했습니다',
      },
      { status: 500 }
    );
  }
}
