import { createBrandServerClient } from '@/lib/supabase/server';
import { DocumentCategory, isValidDocumentCategory } from '@/types/documents';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string; category: string }> }
) {
  const { fundId, category } = await params;

  if (!fundId) {
    return Response.json({ error: '펀드 ID가 필요합니다' }, { status: 400 });
  }

  if (!category) {
    return Response.json(
      { error: '문서 카테고리가 필요합니다' },
      { status: 400 }
    );
  }

  // 카테고리 검증
  if (!isValidDocumentCategory(category)) {
    return Response.json(
      { error: '유효하지 않은 문서 카테고리입니다' },
      { status: 400 }
    );
  }

  // 검증된 category를 DocumentCategory로 타입 캐스팅
  const documentCategory = category as DocumentCategory;

  try {
    // 브랜드별 클라이언트 생성 (인증 없이도 접근 가능)
    const brandClient = await createBrandServerClient();

    // 해당 펀드의 특정 카테고리 문서가 존재하는지 확인
    const { count, error: countError } = await brandClient.documents
      .select('id', { count: 'exact', head: true })
      .eq('fund_id', fundId)
      .eq('category', documentCategory);

    if (countError) {
      console.error('문서 존재 여부 확인 실패:', countError);
      return Response.json(
        { error: '문서 확인 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    // 문서 존재 여부 반환
    const exists = (count || 0) > 0;

    return Response.json({ exists });
  } catch (error) {
    console.error('문서 존재 여부 확인 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '내부 서버 오류가 발생했습니다',
      },
      { status: 500 }
    );
  }
}
