import { createBrandServerClient } from '@/lib/supabase/server';
import { getUserAppliedFundIds } from '@/lib/user/funds';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');

    if (!location || !['dashboard', 'homepage'].includes(location)) {
      return Response.json(
        { error: '유효하지 않은 노출 위치입니다' },
        { status: 400 }
      );
    }

    const brandClient = await createBrandServerClient();

    // 사용자 인증 확인 (서버에서 자동으로 처리)
    let excludeFundIds: string[] = [];

    try {
      const {
        data: { user },
        error: authError,
      } = await brandClient.raw.auth.getUser();

      // 로그인한 사용자가 있다면 신청한 펀드 ID 목록 조회
      if (!authError && user) {
        excludeFundIds = await getUserAppliedFundIds(user.id);
      }
    } catch (error) {
      // 인증 오류는 무시하고 비로그인 사용자로 처리
      console.log('인증 확인 실패, 비로그인 사용자로 처리:', error);
    }

    // 기본 쿼리: 해당 위치에 노출 설정된 펀드 중 결성준비중, 결성진행중인 펀드
    let query = brandClient.funds
      .select('*')
      .contains('display_locations', [location])
      .in('status', ['ready', 'processing']);

    // 로그인한 사용자가 이미 신청한 펀드들 제외
    if (excludeFundIds.length > 0) {
      query = query.not('id', 'in', `(${excludeFundIds.join(',')})`);
    }

    const { data: fund, error } = await query.limit(1).maybeSingle();

    if (error) {
      console.error('펀드 조회 실패:', error);
      return Response.json(
        {
          error: '펀드 정보를 불러오는데 실패했습니다',
        },
        { status: 500 }
      );
    }

    // 노출할 펀드가 없는 경우
    if (!fund) {
      return Response.json({ fund: null });
    }

    return Response.json({ fund });
  } catch (error) {
    console.error('펀드 노출 정보 조회 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '펀드 정보를 불러오는데 실패했습니다',
      },
      { status: 500 }
    );
  }
}
