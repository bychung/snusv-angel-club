// 조합원 명부 삭제 API
// DELETE /api/admin/funds/:fundId/generated-documents/member-list/:id

import { validateAdminAuth } from '@/lib/auth/admin-server';
import {
  createBrandServerClient,
  createStorageClient,
} from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * DELETE /api/admin/funds/[fundId]/generated-documents/member-list/[id]
 * 조합원 명부 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string; id: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { fundId, id } = await params;

    const brandClient = await createBrandServerClient();

    // 문서 조회
    const { data: document, error } = await brandClient.fundDocuments
      .select('*')
      .eq('id', id)
      .eq('fund_id', fundId)
      .eq('type', 'member_list')
      .single();

    if (error || !document) {
      return NextResponse.json(
        { error: '조합원 명부를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Storage에서 파일 삭제
    if (document.pdf_storage_path) {
      const storageClient = createStorageClient();
      const { error: storageError } = await storageClient.storage
        .from('generated-documents')
        .remove([document.pdf_storage_path]);

      if (storageError) {
        console.error('Storage 파일 삭제 실패:', storageError);
        // Storage 삭제 실패해도 DB는 비활성화 진행
      }
    }

    // DB에서 문서 비활성화 (삭제 대신)
    const { error: updateError } = await brandClient.fundDocuments
      .update({ is_active: false })
      .eq('id', id);

    if (updateError) {
      throw new Error('문서 삭제에 실패했습니다.');
    }

    return NextResponse.json({
      message: '조합원 명부가 삭제되었습니다.',
    });
  } catch (error) {
    console.error('조합원 명부 삭제 실패:', error);

    if (error instanceof Error) {
      if (error.message.includes('인증')) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message.includes('권한')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: '조합원 명부 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}
