import {
  deleteInvestment,
  getInvestmentById,
  updateInvestment,
} from '@/lib/admin/investments';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import type { InvestmentInput } from '@/types/investments';
import { NextRequest } from 'next/server';

// 투자 상세 조회 (관리자만)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ investmentId: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { investmentId } = await params;

    const investment = await getInvestmentById(investmentId);

    if (!investment) {
      return Response.json(
        { error: '투자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return Response.json({ investment });
  } catch (error) {
    console.error('투자 조회 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '투자 정보를 불러오는데 실패했습니다',
      },
      { status: 500 }
    );
  }
}

// 투자 정보 수정 (관리자만)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ investmentId: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { investmentId } = await params;
    const body = await request.json();
    const investmentData: Partial<InvestmentInput> = body;

    // 투자 존재 확인
    const existingInvestment = await getInvestmentById(investmentId);
    if (!existingInvestment) {
      return Response.json(
        { error: '투자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 입력 데이터 검증
    if (
      investmentData.company_id !== undefined &&
      !investmentData.company_id?.trim()
    ) {
      return Response.json({ error: '회사 ID는 필수입니다' }, { status: 400 });
    }

    if (
      investmentData.fund_id !== undefined &&
      !investmentData.fund_id?.trim()
    ) {
      return Response.json({ error: '펀드 ID는 필수입니다' }, { status: 400 });
    }

    // 투자일 형식 검증
    if (
      investmentData.investment_date !== undefined &&
      investmentData.investment_date
    ) {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(investmentData.investment_date)) {
        return Response.json(
          { error: '투자일 형식이 올바르지 않습니다 (YYYY-MM-DD)' },
          { status: 400 }
        );
      }
    }

    // 숫자 필드 검증
    if (
      investmentData.unit_price !== undefined &&
      investmentData.unit_price !== null &&
      investmentData.unit_price < 0
    ) {
      return Response.json(
        { error: '투자단가는 0 이상이어야 합니다' },
        { status: 400 }
      );
    }

    if (
      investmentData.investment_shares !== undefined &&
      investmentData.investment_shares !== null &&
      investmentData.investment_shares < 0
    ) {
      return Response.json(
        { error: '투자 주식수는 0 이상이어야 합니다' },
        { status: 400 }
      );
    }

    if (
      investmentData.issued_shares !== undefined &&
      investmentData.issued_shares !== null &&
      investmentData.issued_shares <= 0
    ) {
      return Response.json(
        { error: '총발행주식수는 0보다 커야 합니다' },
        { status: 400 }
      );
    }

    // 지분율 검증 (투자주식수가 총발행주식수를 초과하지 않아야 함)
    const finalInvestmentShares =
      investmentData.investment_shares !== undefined
        ? investmentData.investment_shares
        : existingInvestment.investment_shares;
    const finalIssuedShares =
      investmentData.issued_shares !== undefined
        ? investmentData.issued_shares
        : existingInvestment.issued_shares;

    if (
      finalInvestmentShares &&
      finalIssuedShares &&
      finalInvestmentShares > finalIssuedShares
    ) {
      return Response.json(
        { error: '투자 주식수가 총발행주식수를 초과할 수 없습니다' },
        { status: 400 }
      );
    }

    const updatedInvestment = await updateInvestment(
      investmentId,
      investmentData
    );

    return Response.json({
      message: '투자 정보가 성공적으로 수정되었습니다',
      investment: updatedInvestment,
    });
  } catch (error) {
    console.error('투자 수정 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '투자 정보 수정에 실패했습니다',
      },
      { status: 500 }
    );
  }
}

// 투자 삭제 (관리자만)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ investmentId: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { investmentId } = await params;

    // 투자 존재 확인
    const existingInvestment = await getInvestmentById(investmentId);
    if (!existingInvestment) {
      return Response.json(
        { error: '투자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    await deleteInvestment(investmentId);

    return Response.json({
      message: '투자가 성공적으로 삭제되었습니다',
    });
  } catch (error) {
    console.error('투자 삭제 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : '투자 삭제에 실패했습니다',
      },
      { status: 500 }
    );
  }
}
