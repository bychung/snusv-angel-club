import {
  createCompany,
  getCompanies,
  getCompanyStatsByCategory,
} from '@/lib/admin/companies';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import type { CompanyFilters, CompanyInput } from '@/types/companies';
import { validateCategories } from '@/types/companies';
import { NextRequest } from 'next/server';

// 회사 목록 조회 및 통계 (관리자만)
export async function GET(request: NextRequest) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { searchParams } = new URL(request.url);

    // 통계 요청인지 확인
    const statsOnly = searchParams.get('stats') === 'true';
    if (statsOnly) {
      const stats = await getCompanyStatsByCategory();
      return Response.json({ stats });
    }

    // 필터 파라미터 파싱
    const filters: CompanyFilters = {};

    const categoriesParam = searchParams.get('categories');
    if (categoriesParam) {
      filters.categories = categoriesParam.split(',').filter(Boolean);
    }

    const search = searchParams.get('search');
    if (search) {
      filters.search = search;
    }

    const establishedAfter = searchParams.get('establishedAfter');
    if (establishedAfter) {
      filters.establishedAfter = establishedAfter;
    }

    const establishedBefore = searchParams.get('establishedBefore');
    if (establishedBefore) {
      filters.establishedBefore = establishedBefore;
    }

    // 페이징 파라미터
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    const result = await getCompanies(filters, page, limit);

    return Response.json(result);
  } catch (error) {
    console.error('회사 목록 조회 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '회사 목록을 불러오는데 실패했습니다',
      },
      { status: 500 }
    );
  }
}

// 회사 생성 (관리자만)
export async function POST(request: NextRequest) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const body = await request.json();
    const companyData: CompanyInput = body;

    // 입력 데이터 검증
    if (!companyData.name?.trim()) {
      return Response.json({ error: '회사명은 필수입니다' }, { status: 400 });
    }

    if (
      !companyData.category ||
      !Array.isArray(companyData.category) ||
      companyData.category.length === 0
    ) {
      return Response.json(
        { error: '최소 하나의 카테고리를 선택해야 합니다' },
        { status: 400 }
      );
    }

    if (!validateCategories(companyData.category)) {
      return Response.json(
        { error: '올바르지 않은 카테고리가 포함되어 있습니다' },
        { status: 400 }
      );
    }

    // 웹사이트 URL 형식 검증
    if (companyData.website && companyData.website.trim()) {
      const urlPattern = /^https?:\/\/.+/i;
      if (!urlPattern.test(companyData.website)) {
        return Response.json(
          {
            error:
              '웹사이트 URL 형식이 올바르지 않습니다 (http:// 또는 https:// 포함)',
          },
          { status: 400 }
        );
      }
    }

    // 사업자등록번호 형식 검증 (10자리 숫자)
    if (companyData.business_number && companyData.business_number.trim()) {
      const businessNumberPattern = /^\d{3}-\d{2}-\d{5}$|^\d{10}$/;
      if (
        !businessNumberPattern.test(
          companyData.business_number.replace(/-/g, '')
        )
      ) {
        return Response.json(
          { error: '사업자등록번호 형식이 올바르지 않습니다' },
          { status: 400 }
        );
      }
    }

    // 설립일 형식 검증
    if (companyData.established_at) {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(companyData.established_at)) {
        return Response.json(
          { error: '설립일 형식이 올바르지 않습니다 (YYYY-MM-DD)' },
          { status: 400 }
        );
      }
    }

    const company = await createCompany(companyData);

    return Response.json(
      {
        message: '회사가 성공적으로 등록되었습니다',
        company,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('회사 생성 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : '회사 등록에 실패했습니다',
      },
      { status: 500 }
    );
  }
}
