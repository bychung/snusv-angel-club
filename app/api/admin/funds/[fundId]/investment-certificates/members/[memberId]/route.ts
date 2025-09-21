import { getMemberInvestmentCertificates } from '@/lib/admin/documents';
import { isAdminServer } from '@/lib/auth/admin-server';
import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

// 특정 조합원의 투자확인서 히스토리 조회 (관리자 전용)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string; memberId: string }> }
) {
  const { fundId, memberId } = await params;

  if (!fundId || !memberId) {
    return Response.json(
      { error: '펀드 ID와 조합원 ID가 필요합니다' },
      { status: 400 }
    );
  }

  try {
    // 인증 및 권한 확인
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
      return Response.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    // URL 쿼리 파라미터에서 연도 추출
    const { searchParams } = new URL(request.url);
    const documentYear = searchParams.get('year');

    // 투자확인서 히스토리 조회
    const certificates = await getMemberInvestmentCertificates(
      fundId,
      memberId,
      documentYear ? parseInt(documentYear) : undefined
    );

    return Response.json({ certificates });
  } catch (error) {
    console.error('조합원 투자확인서 조회 실패:', error);
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
