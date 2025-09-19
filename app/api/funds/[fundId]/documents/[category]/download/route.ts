import { isAdminServer } from '@/lib/auth/admin-server';
import { createClient } from '@/lib/supabase/server';
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
  const validCategories = ['account', 'tax', 'registration', 'agreement'];
  if (!validCategories.includes(category)) {
    return Response.json(
      { error: '유효하지 않은 문서 카테고리입니다' },
      { status: 400 }
    );
  }

  try {
    // 사용자 인증 확인
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 관리자 권한 확인
    const isAdmin = await isAdminServer(user);

    // 권한 확인: 관리자가 아닌 경우 특정 카테고리만 다운로드 가능
    if (!isAdmin) {
      const downloadableCategories = ['account', 'agreement'];
      if (!downloadableCategories.includes(category)) {
        return Response.json(
          {
            error: '해당 문서를 다운로드할 권한이 없습니다',
          },
          { status: 403 }
        );
      }

      // 일반 사용자의 경우 해당 펀드 참여자인지 확인
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        return Response.json(
          { error: '프로필을 찾을 수 없습니다' },
          { status: 403 }
        );
      }

      const { count } = await supabase
        .from('fund_members')
        .select('*', { count: 'exact', head: true })
        .eq('fund_id', fundId)
        .eq('profile_id', profile.id);

      if (!count || count === 0) {
        return Response.json(
          {
            error: '해당 펀드에 접근할 권한이 없습니다',
          },
          { status: 403 }
        );
      }
    }

    // 최신 문서 조회
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('fund_id', fundId)
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
      `문서 다운로드: ${user.email} - ${fundId}/${category} - ${document.file_name}`
    );

    // 파일을 직접 반환 (IR deck과 동일한 방식)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': document.file_type,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(document.file_name)}"`,
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
