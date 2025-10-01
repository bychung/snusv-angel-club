import { requireFundAccess, validateUserAccess } from '@/lib/auth/permissions';
import { createBrandServerClient } from '@/lib/supabase/server';
import { DocumentCategory, isValidDocumentCategory } from '@/types/documents';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

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
    // 권한 확인: 특정 카테고리만 다운로드 가능
    const downloadableCategories = [
      DocumentCategory.ACCOUNT,
      DocumentCategory.AGREEMENT,
      DocumentCategory.PROPOSAL, // 펀드제안서는 일반 사용자도 다운로드 가능
    ];
    if (!downloadableCategories.includes(documentCategory)) {
      return Response.json(
        {
          error: '해당 문서를 다운로드할 권한이 없습니다',
        },
        { status: 403 }
      );
    }

    // 사용자 인증 및 펀드 접근 권한 확인
    let user = null;

    // 펀드제안서(PROPOSAL)의 경우 인증 없이도 다운로드 가능
    if (documentCategory === DocumentCategory.PROPOSAL) {
      // 펀드제안서는 공개 문서로 처리 (인증 선택 사항)
      const authResult = await validateUserAccess(
        request,
        '[document-download]'
      );
      if ('user' in authResult) {
        user = authResult.user;
      }
    } else {
      // 다른 카테고리는 인증 필요
      const authResult = await validateUserAccess(
        request,
        '[document-download]'
      );
      if (authResult instanceof Response) {
        return authResult;
      }
      user = authResult.user;

      // 펀드 접근 권한 확인
      const accessResult = await requireFundAccess(
        user,
        fundId,
        '[document-download]'
      );
      if (accessResult instanceof Response) {
        return accessResult;
      }
    }

    const brandClient = await createBrandServerClient();

    // 최신 문서 조회 (브랜드별)
    const { data: document, error: docError } = await brandClient.documents
      .select('*')
      .eq('fund_id', fundId)
      .eq('category', documentCategory)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (docError || !document) {
      return Response.json(
        {
          error: '해당 문서를 찾을 수 없습니다',
        },
        { status: 404 }
      );
    }

    // Supabase Storage에서 서명된 URL 생성
    // file_url에서 파일 경로 추출
    let filePath: string;
    try {
      const url = new URL(document.file_url);
      const pathSegments = url.pathname.split('/');
      const bucketIndex = pathSegments.findIndex(
        segment => segment === 'fund-documents'
      );

      if (bucketIndex === -1 || bucketIndex >= pathSegments.length - 1) {
        throw new Error('Invalid file URL format');
      }

      filePath = pathSegments.slice(bucketIndex + 1).join('/');
    } catch (error) {
      console.error('파일 경로 추출 실패:', error);
      return Response.json(
        { error: '파일 URL 형식이 올바르지 않습니다' },
        { status: 500 }
      );
    }

    // Service Role 전용 클라이언트 생성 (IR deck과 동일한 방식)
    const serviceClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Storage에서 파일 다운로드 (Service Role 클라이언트 사용)
    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from('fund-documents')
      .download(filePath);

    if (downloadError) {
      console.error('파일 다운로드 오류:', downloadError);
      return Response.json(
        { error: '파일 다운로드에 실패했습니다.' },
        { status: 500 }
      );
    }

    if (!fileData) {
      return Response.json(
        { error: '파일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 파일을 Buffer로 변환
    const buffer = await fileData.arrayBuffer();

    // 파일 다운로드 로그 기록
    console.log(
      `문서 다운로드: ${
        user?.email || '익명'
      } - ${fundId}/${documentCategory} - ${document.file_name}`
    );

    // 파일을 직접 반환 (IR deck과 동일한 방식)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': document.file_type,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(
          document.file_name
        )}"`,
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('문서 다운로드 실패:', error);
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
