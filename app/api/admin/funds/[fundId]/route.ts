import { updateFundDetails } from '@/lib/admin/funds';
import { isAdminServer } from '@/lib/auth/admin-server';
import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

export async function PUT(
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

    // 요청 데이터 검증
    const requestBody = await request.json();
    const { name, abbreviation, tax_number, gp_id, address, status, account, account_bank } =
      requestBody;

    // status 값 검증
    if (
      status &&
      !['ready', 'processing', 'applied', 'active', 'closing', 'closed'].includes(status)
    ) {
      return Response.json({ error: '유효하지 않은 상태값입니다' }, { status: 400 });
    }

    // gp_id 배열 검증
    if (gp_id && (!Array.isArray(gp_id) || !gp_id.every(id => typeof id === 'string'))) {
      return Response.json({ error: 'GP ID는 문자열 배열이어야 합니다' }, { status: 400 });
    }

    // 펀드 정보 업데이트
    const updatedFund = await updateFundDetails(fundId, {
      name,
      abbreviation,
      tax_number,
      gp_id,
      address,
      status,
      account,
      account_bank,
    });

    return Response.json({
      message: '펀드 정보가 성공적으로 업데이트되었습니다',
      fund: updatedFund,
    });
  } catch (error) {
    console.error('펀드 정보 업데이트 실패:', error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : '내부 서버 오류가 발생했습니다',
      },
      { status: 500 }
    );
  }
}
