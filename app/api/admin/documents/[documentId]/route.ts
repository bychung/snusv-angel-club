import { canDeleteDocument, deleteDocument } from '@/lib/admin/documents';
import { isAdminServer } from '@/lib/auth/admin-server';
import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

// 문서 삭제 (관리자만)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;

  if (!documentId) {
    return Response.json({ error: '문서 ID가 필요합니다' }, { status: 400 });
  }

  try {
    // 인증 및 권한 확인
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const isAdmin = await isAdminServer(user);
    if (!canDeleteDocument(isAdmin ? 'ADMIN' : 'USER')) {
      return Response.json({ error: '문서 삭제 권한이 없습니다' }, { status: 403 });
    }

    // 문서 삭제 (Storage + DB)
    await deleteDocument(documentId);

    return Response.json({
      message: '문서가 성공적으로 삭제되었습니다',
    });
  } catch (error) {
    console.error('문서 삭제 실패:', error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : '내부 서버 오류가 발생했습니다',
      },
      { status: 500 }
    );
  }
}

// 문서 상세 정보 조회 (관리자만)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;

  if (!documentId) {
    return Response.json({ error: '문서 ID가 필요합니다' }, { status: 400 });
  }

  try {
    // 인증 및 권한 확인
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const isAdmin = await isAdminServer(user);
    if (!isAdmin) {
      return Response.json({ error: '관리자 권한이 필요합니다' }, { status: 403 });
    }

    // 문서 정보 조회
    const { data: document, error } = await supabase
      .from('documents')
      .select(
        `
        *,
        uploader:profiles!documents_uploaded_by_fkey (
          name,
          email
        ),
        fund:funds (
          name,
          abbreviation
        )
      `
      )
      .eq('id', documentId)
      .single();

    if (error || !document) {
      return Response.json({ error: '문서를 찾을 수 없습니다' }, { status: 404 });
    }

    return Response.json({ document });
  } catch (error) {
    console.error('문서 조회 실패:', error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : '내부 서버 오류가 발생했습니다',
      },
      { status: 500 }
    );
  }
}
