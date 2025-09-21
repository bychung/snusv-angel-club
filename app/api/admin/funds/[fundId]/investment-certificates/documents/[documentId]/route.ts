import { deleteDocument } from '@/lib/admin/documents';
import { isAdminServer } from '@/lib/auth/admin-server';
import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

// 투자확인서 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string; documentId: string }> }
) {
  const { fundId, documentId } = await params;

  try {
    // 인증 확인
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
    if (!isAdmin) {
      return Response.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    // 문서 정보 조회 및 권한 확인
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('fund_id', fundId)
      .eq('category', 'investment_certificate')
      .single();

    if (fetchError || !document) {
      return Response.json(
        { error: '삭제할 투자확인서를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 문서 삭제 (Storage + DB)
    await deleteDocument(documentId);

    return Response.json({
      message: '투자확인서가 성공적으로 삭제되었습니다',
    });
  } catch (error) {
    console.error('투자확인서 삭제 실패:', error);
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
