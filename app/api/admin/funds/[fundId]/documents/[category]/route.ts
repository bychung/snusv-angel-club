import {
  canUploadDocument,
  getDocumentHistory,
  uploadDocument,
} from '@/lib/admin/documents';
import { isAdminServer } from '@/lib/auth/admin-server';
import { validateFile } from '@/lib/storage/utils';
import { createBrandServerClient } from '@/lib/supabase/server';
import { DocumentCategory, isValidDocumentCategory } from '@/types/documents';
import { NextRequest } from 'next/server';

// 문서 업로드 (관리자만)
export async function POST(
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
    // 인증 및 권한 확인
    const brandClient = await createBrandServerClient();
    const {
      data: { user },
      error: authError,
    } = await brandClient.raw.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const isAdmin = await isAdminServer(user);
    if (!canUploadDocument(isAdmin ? 'ADMIN' : 'USER')) {
      return Response.json(
        { error: '문서 업로드 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 사용자 프로필 조회
    const { data: profile } = await brandClient.profiles
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return Response.json(
        { error: '프로필을 찾을 수 없습니다' },
        { status: 403 }
      );
    }

    // FormData에서 파일 및 추가 데이터 추출
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const memberId = formData.get('memberId') as string | null;
    const documentYear = formData.get('documentYear') as string | null;

    if (!file) {
      return Response.json(
        { error: '업로드할 파일이 필요합니다' },
        { status: 400 }
      );
    }

    // 투자확인서의 경우 memberId 필수 검증
    if (documentCategory === DocumentCategory.INVESTMENT_CERTIFICATE) {
      if (!memberId) {
        return Response.json(
          { error: '투자확인서 업로드 시 조합원 ID가 필요합니다' },
          { status: 400 }
        );
      }

      // memberId가 해당 펀드의 조합원인지 검증
      const { count } = await brandClient.fundMembers
        .select('*', { count: 'exact', head: true })
        .eq('fund_id', fundId)
        .eq('profile_id', memberId);

      if (!count || count === 0) {
        return Response.json(
          { error: '해당 펀드의 조합원이 아닙니다' },
          { status: 400 }
        );
      }
    } else if (memberId) {
      // 투자확인서가 아닌 문서에 memberId가 있는 경우
      return Response.json(
        { error: '이 문서 카테고리는 조합원별 업로드를 지원하지 않습니다' },
        { status: 400 }
      );
    }

    // 파일 검증
    const validation = validateFile(file, 30 * 1024 * 1024); // admin용 30MB
    if (!validation.valid) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    // 문서 업로드 및 DB 저장
    const document = await uploadDocument(
      file,
      fundId,
      documentCategory,
      profile.id,
      memberId || undefined,
      documentYear ? parseInt(documentYear) : undefined
    );

    return Response.json({
      message: '문서가 성공적으로 업로드되었습니다',
      document,
    });
  } catch (error) {
    console.error('문서 업로드 실패:', error);
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

// 문서 히스토리 조회 (관리자만)
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
    // 인증 및 권한 확인
    const brandClient = await createBrandServerClient();
    const {
      data: { user },
      error: authError,
    } = await brandClient.raw.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const isAdmin = await isAdminServer(user);
    if (!isAdmin) {
      return Response.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    // 문서 히스토리 조회
    const documents = await getDocumentHistory(fundId, documentCategory);

    return Response.json({ documents });
  } catch (error) {
    console.error('문서 히스토리 조회 실패:', error);
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
