import {
  getCompanyDocuments,
  getDocumentStatsByCategory,
} from '@/lib/admin/company-documents';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import type { CompanyDocumentFilters } from '@/types/company-documents';
import {
  CompanyDocumentCategory,
  isValidCompanyDocumentCategory,
} from '@/types/company-documents';
import { NextRequest } from 'next/server';

// 전체 회사 문서 목록 조회 및 통계 (관리자만)
export async function GET(request: NextRequest) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { searchParams } = new URL(request.url);

    // 통계 요청인지 확인
    const statsOnly = searchParams.get('stats') === 'true';
    if (statsOnly) {
      const stats = await getDocumentStatsByCategory();
      return Response.json({ stats });
    }

    // 필터 파라미터 파싱
    const filters: CompanyDocumentFilters = {};

    const companyIdsParam = searchParams.get('company_ids');
    if (companyIdsParam) {
      filters.company_ids = companyIdsParam.split(',').filter(Boolean);
    }

    const categoriesParam = searchParams.get('categories');
    if (categoriesParam) {
      const categories = categoriesParam.split(',').filter(Boolean);
      const validCategories = categories.filter(cat =>
        isValidCompanyDocumentCategory(cat)
      ) as CompanyDocumentCategory[];

      if (validCategories.length > 0) {
        filters.categories = validCategories;
      }
    }

    const uploadedAfter = searchParams.get('uploaded_after');
    if (uploadedAfter) {
      filters.uploaded_after = uploadedAfter;
    }

    const uploadedBefore = searchParams.get('uploaded_before');
    if (uploadedBefore) {
      filters.uploaded_before = uploadedBefore;
    }

    const search = searchParams.get('search');
    if (search) {
      filters.search = search;
    }

    // 페이징 파라미터
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    const result = await getCompanyDocuments(filters, page, limit);

    return Response.json(result);
  } catch (error) {
    console.error('회사 문서 목록 조회 실패:', error);
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
