import { getCompanyDocumentsByCategory } from '@/lib/admin/company-documents';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import {
  CompanyDocumentCategory,
  isValidCompanyDocumentCategory,
} from '@/types/company-documents';
import { NextRequest } from 'next/server';

// 회사별 특정 카테고리 문서 목록 조회 (관리자만)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string; category: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { companyId, category } = await params;

    // 카테고리 유효성 검증
    if (!isValidCompanyDocumentCategory(category)) {
      return Response.json(
        { error: '올바르지 않은 문서 카테고리입니다' },
        { status: 400 }
      );
    }

    const documents = await getCompanyDocumentsByCategory(
      companyId,
      category as CompanyDocumentCategory
    );

    return Response.json({
      documents,
      company_id: companyId,
      category,
    });
  } catch (error) {
    console.error('카테고리별 문서 조회 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '문서 목록을 불러오는데 실패했습니다',
      },
      { status: 500 }
    );
  }
}
