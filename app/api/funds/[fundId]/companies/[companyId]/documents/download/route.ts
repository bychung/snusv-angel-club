import { createBrandServerClient } from '@/lib/supabase/server';
import { CompanyDocumentCategory } from '@/types/company-documents';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string; companyId: string }> }
) {
  const { fundId, companyId } = await params;
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  if (!fundId) {
    return Response.json({ error: '펀드 ID가 필요합니다' }, { status: 400 });
  }

  if (!companyId) {
    return Response.json({ error: '회사 ID가 필요합니다' }, { status: 400 });
  }

  if (!category) {
    return Response.json(
      { error: '문서 카테고리가 필요합니다' },
      { status: 400 }
    );
  }

  // 유효한 카테고리인지 확인
  if (
    !Object.values(CompanyDocumentCategory).includes(
      category as CompanyDocumentCategory
    )
  ) {
    return Response.json(
      { error: '유효하지 않은 문서 카테고리입니다' },
      { status: 400 }
    );
  }

  try {
    // 사용자 인증 확인
    const brandClient = await createBrandServerClient();
    const {
      data: { user },
      error: authError,
    } = await brandClient.raw.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 사용자 프로필 조회 (브랜드별)
    const { data: profile, error: profileError } = await brandClient.profiles
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return Response.json(
        { error: '사용자 프로필을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 해당 펀드의 조합원인지 확인 (브랜드별)
    const { count: memberCount } = await brandClient.fundMembers
      .select('*', { count: 'exact', head: true })
      .eq('fund_id', fundId)
      .eq('profile_id', profile.id);

    if (!memberCount || memberCount === 0) {
      return Response.json(
        { error: '해당 펀드의 조합원이 아닙니다' },
        { status: 403 }
      );
    }

    // 해당 펀드가 해당 회사에 투자했는지 확인 (브랜드별)
    const { count: investmentCount } = await brandClient.investments
      .select('*', { count: 'exact', head: true })
      .eq('fund_id', fundId)
      .eq('company_id', companyId);

    if (!investmentCount || investmentCount === 0) {
      return Response.json(
        { error: '해당 펀드가 투자하지 않은 회사입니다' },
        { status: 403 }
      );
    }

    // 해당 카테고리의 최신 문서 조회 (브랜드별)
    const { data: document, error: docError } =
      await brandClient.companyDocuments
        .select('*')
        .eq('company_id', companyId)
        .eq('category', category)
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

    // Supabase Storage에서 파일 경로 추출
    let filePath: string;
    try {
      const url = new URL(document.file_url);
      const pathSegments = url.pathname.split('/');
      const bucketIndex = pathSegments.findIndex(
        segment => segment === 'company-documents'
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

    // Service Role 전용 클라이언트 생성
    const serviceClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Storage에서 파일 다운로드
    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from('company-documents')
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
      `회사 문서 다운로드: ${user.email} - ${fundId}/${companyId}/${category} - ${document.file_name}`
    );

    // Content-Type 설정
    const contentType = document.file_type || 'application/octet-stream';

    // 파일 이름에서 특수 문자 처리
    const encodedFileName = encodeURIComponent(document.file_name);

    // 파일을 직접 반환
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('회사 문서 다운로드 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '문서 다운로드 중 오류가 발생했습니다',
      },
      { status: 500 }
    );
  }
}
