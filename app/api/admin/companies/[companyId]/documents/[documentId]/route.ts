import {
  deleteCompanyDocument,
  getCompanyDocumentById,
} from '@/lib/admin/company-documents';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest } from 'next/server';

// 회사 문서 상세 조회 (관리자만)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string; documentId: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { companyId, documentId } = await params;

    const document = await getCompanyDocumentById(documentId);

    if (!document) {
      return Response.json(
        { error: '문서를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 요청한 회사의 문서인지 확인
    if (document.company_id !== companyId) {
      return Response.json(
        { error: '해당 회사의 문서가 아닙니다' },
        { status: 400 }
      );
    }

    return Response.json({ document });
  } catch (error) {
    console.error('회사 문서 조회 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '문서 정보를 불러오는데 실패했습니다',
      },
      { status: 500 }
    );
  }
}

// 회사 문서 삭제 (관리자만)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string; documentId: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { companyId, documentId } = await params;

    // 문서 존재 및 회사 일치 확인
    const document = await getCompanyDocumentById(documentId);
    if (!document) {
      return Response.json(
        { error: '문서를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if (document.company_id !== companyId) {
      return Response.json(
        { error: '해당 회사의 문서가 아닙니다' },
        { status: 400 }
      );
    }

    await deleteCompanyDocument(documentId);

    return Response.json({
      message: '문서가 성공적으로 삭제되었습니다',
    });
  } catch (error) {
    console.error('회사 문서 삭제 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : '문서 삭제에 실패했습니다',
      },
      { status: 500 }
    );
  }
}
