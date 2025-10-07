// 펀드 문서 조회 API
// GET /api/admin/funds/:fundId/documents?type=lpa - 특정 펀드의 생성된 문서 조회

import { getFundDocument, getFundDocuments } from '@/lib/admin/fund-documents';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { fundId } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    // 특정 타입 문서 조회
    if (type) {
      const document = await getFundDocument(fundId, type);

      if (!document) {
        return NextResponse.json(
          { error: '문서를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      return NextResponse.json({ document });
    }

    // 모든 문서 조회
    const documents = await getFundDocuments(fundId);

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('펀드 문서 조회 오류:', error);

    if (error instanceof Error) {
      if (error.message === '인증이 필요합니다') {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message === '관리자 권한이 필요합니다') {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: '펀드 문서 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
