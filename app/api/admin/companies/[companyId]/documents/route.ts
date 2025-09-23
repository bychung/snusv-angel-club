import {
  getDocumentsByCompany,
  getDocumentStatsByCategory,
  uploadCompanyDocument,
} from '@/lib/admin/company-documents';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import {
  CompanyDocumentCategory,
  getMaxFileSize,
  isAllowedFileType,
  isValidCompanyDocumentCategory,
} from '@/types/company-documents';
import { NextRequest } from 'next/server';

// 회사별 문서 목록 조회 (관리자만)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { companyId } = await params;
    const { searchParams } = new URL(request.url);

    // 통계 요청인지 확인
    const statsOnly = searchParams.get('stats') === 'true';
    if (statsOnly) {
      const stats = await getDocumentStatsByCategory();
      return Response.json({ stats });
    }

    const companyDocuments = await getDocumentsByCompany(companyId);

    if (!companyDocuments) {
      return Response.json(
        { error: '회사를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return Response.json(companyDocuments);
  } catch (error) {
    console.error('회사 문서 목록 조회 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '회사 문서 목록을 불러오는데 실패했습니다',
      },
      { status: 500 }
    );
  }
}

// 회사 문서 업로드 (관리자만)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    // 관리자 권한 검증
    const { profile } = await validateAdminAuth(request);

    const { companyId } = await params;

    // FormData에서 파일과 메타데이터 추출
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const categoryStr = formData.get('category') as string;

    // 입력 데이터 검증
    if (!file) {
      return Response.json({ error: '파일을 선택해주세요' }, { status: 400 });
    }

    if (!categoryStr || !isValidCompanyDocumentCategory(categoryStr)) {
      return Response.json(
        { error: '올바른 문서 카테고리를 선택해주세요' },
        { status: 400 }
      );
    }

    const category = categoryStr as CompanyDocumentCategory;

    // 파일 크기 검증
    const maxSize = getMaxFileSize();
    if (file.size > maxSize) {
      return Response.json(
        {
          error: `파일 크기가 너무 큽니다. 최대 ${Math.round(
            maxSize / 1024 / 1024
          )}MB까지 허용됩니다.`,
        },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    if (!isAllowedFileType(file.type)) {
      return Response.json(
        {
          error:
            '지원하지 않는 파일 형식입니다. PDF, PPT, DOC, XLS, 이미지 파일만 업로드 가능합니다.',
        },
        { status: 400 }
      );
    }

    // 파일명 검증 (특수문자 제한)
    const invalidChars = /[<>:"/\\|?*]/g;
    if (invalidChars.test(file.name)) {
      return Response.json(
        {
          error: '파일명에 특수문자가 포함되어 있습니다.',
        },
        { status: 400 }
      );
    }

    const document = await uploadCompanyDocument(
      file,
      companyId,
      category,
      profile.id
    );

    return Response.json(
      {
        message: '문서가 성공적으로 업로드되었습니다',
        document,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('회사 문서 업로드 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : '문서 업로드에 실패했습니다',
      },
      { status: 500 }
    );
  }
}
