import {
  deleteFundDocument,
  getFundDocumentById,
} from '@/lib/admin/fund-documents';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest } from 'next/server';

/**
 * DELETE /api/admin/funds/{fundId}/generated-documents/{documentId}
 * 펀드 문서 삭제 (하드 삭제, 최신 버전은 삭제 불가)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { documentId } = await params;

    if (!documentId) {
      return Response.json({ error: '문서 ID가 필요합니다' }, { status: 400 });
    }

    // 문서 삭제 (내부에서 최신 버전 체크)
    await deleteFundDocument(documentId);

    return Response.json({
      message: '문서가 성공적으로 삭제되었습니다',
    });
  } catch (error) {
    console.error('문서 삭제 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : '문서 삭제 중 오류 발생',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/fund-documents/{documentId}
 * 펀드 문서 상세 정보 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { documentId } = await params;

    if (!documentId) {
      return Response.json({ error: '문서 ID가 필요합니다' }, { status: 400 });
    }

    const document = await getFundDocumentById(documentId);

    if (!document) {
      return Response.json(
        { error: '문서를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return Response.json({ document });
  } catch (error) {
    console.error('문서 조회 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : '문서 조회 중 오류 발생',
      },
      { status: 500 }
    );
  }
}
