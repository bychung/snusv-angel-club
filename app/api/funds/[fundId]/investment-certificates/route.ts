import { getMemberInvestmentCertificates } from '@/lib/admin/documents';
import { requireFundAccess, validateUserAccess } from '@/lib/auth/permissions';
import { NextRequest } from 'next/server';

// 사용자 본인의 투자확인서 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  const { fundId } = await params;

  if (!fundId) {
    return Response.json({ error: '펀드 ID가 필요합니다' }, { status: 400 });
  }

  try {
    // 인증 및 사용자 확인
    const authResult = await validateUserAccess(
      request,
      '[investment-certificates]'
    );
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;

    // 펀드 접근 권한 확인
    const accessResult = await requireFundAccess(
      user,
      fundId,
      '[investment-certificates]'
    );
    if (accessResult instanceof Response) return accessResult;

    const { fundMemberProfileIds } = accessResult;

    // 사용자(관리자 포함)의 펀드 멤버십 확인
    if (fundMemberProfileIds.length === 0) {
      return Response.json(
        { error: '해당 펀드에 참여 중인 프로필이 없습니다' },
        { status: 403 }
      );
    }

    // URL 쿼리 파라미터에서 연도 추출
    const { searchParams } = new URL(request.url);
    const documentYear = searchParams.get('year');

    // 펀드에 참여 중인 첫 번째 프로필의 투자확인서 조회
    const targetProfileId = fundMemberProfileIds[0];
    console.log(
      `[investment-certificates] 투자확인서 조회 대상 프로필: ${targetProfileId}`
    );

    // 투자확인서 조회
    const certificates = await getMemberInvestmentCertificates(
      fundId,
      targetProfileId,
      documentYear ? parseInt(documentYear) : undefined
    );

    return Response.json({ certificates });
  } catch (error) {
    console.error('투자확인서 조회 실패:', error);
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
