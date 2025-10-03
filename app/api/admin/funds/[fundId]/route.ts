import { updateFundDetails } from '@/lib/admin/funds';
import { isAdminServer } from '@/lib/auth/admin-server';
import { createBrandServerClient } from '@/lib/supabase/server';
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
    const brandClient = await createBrandServerClient();
    const {
      data: { user },
      error: authError,
    } = await brandClient.raw.auth.getUser();

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

    // 요청 데이터 검증
    const requestBody = await request.json();
    const {
      name,
      abbreviation,
      tax_number,
      gp_id,
      address,
      status,
      account,
      account_bank,
      closed_at,
      registered_at,
      dissolved_at,
      par_value,
      min_units,
      display_locations,
      payment_schedule,
      initial_numerator,
      initial_denominator,
      duration,
    } = requestBody;

    // 날짜 필드 유효성 검증
    const dateFields = { closed_at, registered_at, dissolved_at };
    for (const [fieldName, value] of Object.entries(dateFields)) {
      if (value && value !== '' && !isNaN(Date.parse(value))) {
        // 유효한 날짜 형식인지 확인
        continue;
      } else if (value === '') {
        // 빈 문자열은 null로 처리
        requestBody[fieldName] = null;
      } else if (value && isNaN(Date.parse(value))) {
        return Response.json(
          { error: `${fieldName} 필드의 날짜 형식이 올바르지 않습니다` },
          { status: 400 }
        );
      }
    }

    // status 값 검증
    if (
      status &&
      ![
        'ready',
        'processing',
        'applied',
        'active',
        'closing',
        'closed',
      ].includes(status)
    ) {
      return Response.json(
        { error: '유효하지 않은 상태값입니다' },
        { status: 400 }
      );
    }

    // gp_id 배열 검증
    if (
      gp_id &&
      (!Array.isArray(gp_id) || !gp_id.every(id => typeof id === 'string'))
    ) {
      return Response.json(
        { error: 'GP ID는 문자열 배열이어야 합니다' },
        { status: 400 }
      );
    }

    // display_locations 배열 검증
    if (
      display_locations &&
      (!Array.isArray(display_locations) ||
        !display_locations.every(loc =>
          ['dashboard', 'homepage'].includes(loc)
        ))
    ) {
      return Response.json(
        { error: '링크 노출위치는 dashboard 또는 homepage 배열이어야 합니다' },
        { status: 400 }
      );
    }

    // min_units 검증
    if (min_units !== undefined && min_units < 1) {
      return Response.json(
        { error: '최소 출자좌수는 1좌 이상이어야 합니다' },
        { status: 400 }
      );
    }

    // 펀드 정보 업데이트 (수정된 데이터 사용)
    const updatedFund = await updateFundDetails(fundId, {
      name,
      abbreviation,
      tax_number,
      gp_id,
      address,
      status,
      account,
      account_bank,
      closed_at: requestBody.closed_at,
      registered_at: requestBody.registered_at,
      dissolved_at: requestBody.dissolved_at,
      par_value,
      min_units,
      display_locations,
      payment_schedule,
      initial_numerator,
      initial_denominator,
      duration,
    });

    return Response.json({
      message: '펀드 정보가 성공적으로 업데이트되었습니다',
      fund: updatedFund,
    });
  } catch (error) {
    console.error('펀드 정보 업데이트 실패:', error);
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
