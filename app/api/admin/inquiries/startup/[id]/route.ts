import { validateAdminAuth } from '@/lib/auth/admin-server';
import {
  createBrandServerClient,
  createStorageClient,
} from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const brandClient = await createBrandServerClient();
    const storageClient = createStorageClient();

    // 관리자 권한 확인
    await validateAdminAuth(request);

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: '문의 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 문의 정보 조회 (파일 삭제를 위해)
    const { data: inquiry, error: fetchError } =
      await brandClient.startupInquiries.select('*').eq('id', id).single();

    if (fetchError) {
      console.error('문의 조회 오류:', fetchError);
      return NextResponse.json(
        { error: '문의를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // IR 덱 파일 삭제 (있는 경우)
    if (inquiry.ir_deck_url) {
      try {
        await storageClient.storage
          .from('ir-decks')
          .remove([inquiry.ir_deck_url]);
      } catch (storageError) {
        console.error('파일 삭제 오류:', storageError);
        // 파일 삭제 실패해도 DB 삭제는 진행
      }
    }

    // 데이터베이스에서 문의 삭제
    const { error: deleteError } = await brandClient.startupInquiries
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('문의 삭제 오류:', deleteError);
      return NextResponse.json(
        { error: '문의 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '스타트업 IR 문의가 성공적으로 삭제되었습니다.',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === '인증이 필요합니다') {
        return NextResponse.json(
          { error: '인증이 필요합니다.' },
          { status: 401 }
        );
      }
      if (error.message === '관리자 권한이 필요합니다') {
        return NextResponse.json(
          { error: '관리자 권한이 필요합니다.' },
          { status: 403 }
        );
      }
    }

    console.error('스타트업 IR 문의 삭제 처리 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
