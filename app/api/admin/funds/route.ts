import { initializeFundTemplates } from '@/lib/admin/document-templates';
import { getAllFunds } from '@/lib/admin/funds';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { createBrandServerClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

// 펀드 목록 조회 (관리자만)
export async function GET(request: NextRequest) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const funds = await getAllFunds();

    return Response.json({
      funds,
      total: funds.length,
    });
  } catch (error) {
    console.error('펀드 목록 조회 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '펀드 목록을 불러오는데 실패했습니다',
      },
      { status: 500 }
    );
  }
}

// 펀드 생성 (관리자만)
export async function POST(request: NextRequest) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const body = await request.json();
    const {
      name,
      abbreviation,
      par_value,
      min_units,
      payment_schedule,
      initial_numerator,
      initial_denominator,
      duration,
    } = body;

    // 입력 검증
    if (!name?.trim()) {
      return Response.json({ error: '펀드명은 필수입니다' }, { status: 400 });
    }

    if (par_value < 1000000) {
      return Response.json(
        { error: '1좌당 금액은 최소 1,000,000원 이상이어야 합니다' },
        { status: 400 }
      );
    }

    if (min_units < 1) {
      return Response.json(
        { error: '최소 출자좌수는 1좌 이상이어야 합니다' },
        { status: 400 }
      );
    }

    if (payment_schedule === 'capital_call') {
      if (initial_numerator < 1 || initial_denominator < 1) {
        return Response.json(
          { error: '초기 출자 비율은 1 이상이어야 합니다' },
          { status: 400 }
        );
      }

      if (initial_numerator > initial_denominator) {
        return Response.json(
          { error: '초기 출자 비율은 100% 이하여야 합니다' },
          { status: 400 }
        );
      }
    }

    if (duration < 1) {
      return Response.json(
        { error: '펀드 존속기간은 1년 이상이어야 합니다' },
        { status: 400 }
      );
    }

    const brandClient = await createBrandServerClient();

    // 1. 펀드 생성
    const { data: newFund, error: fundError } = await brandClient.funds
      .insert([
        {
          name: name.trim(),
          abbreviation: abbreviation?.trim() || null,
          par_value,
          min_units,
          payment_schedule,
          initial_numerator,
          initial_denominator,
          duration,
        },
      ])
      .select()
      .single();

    if (fundError) {
      throw new Error(`펀드 생성 실패: ${fundError.message}`);
    }

    // 2. 펀드별 템플릿 초기화 (글로벌 템플릿 복사)
    try {
      const templates = await initializeFundTemplates(newFund.id);
      console.log(
        `펀드 ${newFund.name}의 템플릿 초기화 완료: ${templates.length}개`
      );
    } catch (templateError) {
      // 템플릿 초기화 실패는 경고만 하고 계속 진행
      console.warn('펀드 템플릿 초기화 실패:', templateError);
    }

    return Response.json({
      success: true,
      fund: newFund,
    });
  } catch (error) {
    console.error('펀드 생성 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : '펀드 생성에 실패했습니다',
      },
      { status: 500 }
    );
  }
}
