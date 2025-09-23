import {
  deleteCompany,
  getCompanyById,
  updateCompany,
} from '@/lib/admin/companies';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import type { CompanyInput } from '@/types/companies';
import { validateCategories } from '@/types/companies';
import { NextRequest } from 'next/server';

// 회사 상세 조회 (관리자만)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { companyId } = await params;

    const company = await getCompanyById(companyId);

    if (!company) {
      return Response.json(
        { error: '회사를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return Response.json({ company });
  } catch (error) {
    console.error('회사 조회 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '회사 정보를 불러오는데 실패했습니다',
      },
      { status: 500 }
    );
  }
}

// 회사 정보 수정 (관리자만)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { companyId } = await params;
    const body = await request.json();
    const companyData: Partial<CompanyInput> = body;

    // 회사 존재 확인
    const existingCompany = await getCompanyById(companyId);
    if (!existingCompany) {
      return Response.json(
        { error: '회사를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 입력 데이터 검증
    if (companyData.name !== undefined && !companyData.name?.trim()) {
      return Response.json({ error: '회사명은 필수입니다' }, { status: 400 });
    }

    if (companyData.category !== undefined) {
      if (
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
    }

    // 웹사이트 URL 형식 검증
    if (companyData.website !== undefined && companyData.website?.trim()) {
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
    if (
      companyData.business_number !== undefined &&
      companyData.business_number?.trim()
    ) {
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
    if (
      companyData.established_at !== undefined &&
      companyData.established_at
    ) {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(companyData.established_at)) {
        return Response.json(
          { error: '설립일 형식이 올바르지 않습니다 (YYYY-MM-DD)' },
          { status: 400 }
        );
      }
    }

    const updatedCompany = await updateCompany(companyId, companyData);

    return Response.json({
      message: '회사 정보가 성공적으로 수정되었습니다',
      company: updatedCompany,
    });
  } catch (error) {
    console.error('회사 수정 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '회사 정보 수정에 실패했습니다',
      },
      { status: 500 }
    );
  }
}

// 회사 삭제 (관리자만)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { companyId } = await params;

    // 회사 존재 확인
    const existingCompany = await getCompanyById(companyId);
    if (!existingCompany) {
      return Response.json(
        { error: '회사를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    await deleteCompany(companyId);

    return Response.json({
      message: '회사가 성공적으로 삭제되었습니다',
    });
  } catch (error) {
    console.error('회사 삭제 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : '회사 삭제에 실패했습니다',
      },
      { status: 500 }
    );
  }
}
