// 다음 문서 정보 조회 API

import { getNextDocumentInfo } from '@/lib/admin/assembly-documents';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/funds/{fundId}/assemblies/{assemblyId}/next-document
 * 다음에 생성할 문서 정보 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string; assemblyId: string }> }
) {
  try {
    const { assemblyId } = await params;

    // 인증 및 관리자 권한 확인
    await validateAdminAuth(request);

    // 다음 문서 정보 조회
    const nextDocument = await getNextDocumentInfo(assemblyId);

    if (!nextDocument) {
      return NextResponse.json(
        { message: '모든 문서가 생성되었습니다.', next_document: null },
        { status: 200 }
      );
    }

    return NextResponse.json(nextDocument);
  } catch (error) {
    console.error('다음 문서 정보 조회 실패:', error);

    if (error instanceof Error) {
      if (error.message.includes('인증')) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message.includes('권한')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: '다음 문서 정보 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}
