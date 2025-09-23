import { searchCompaniesByName } from '@/lib/admin/companies';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest } from 'next/server';

// 회사 검색 (관리자만)
export async function GET(request: NextRequest) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return Response.json(
        {
          error: '검색어는 최소 2글자 이상이어야 합니다',
        },
        { status: 400 }
      );
    }

    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    const companies = await searchCompaniesByName(query.trim(), limit);

    return Response.json({
      companies,
      query: query.trim(),
    });
  } catch (error) {
    console.error('회사 검색 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : '회사 검색에 실패했습니다',
      },
      { status: 500 }
    );
  }
}
