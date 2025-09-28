import { createBrandServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const brandClient = await createBrandServerClient();

    // 현재 사용자 인증 및 관리자 권한 확인
    const {
      data: { user },
      error: authError,
    } = await brandClient.raw.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 관리자 권한 확인
    const { data: profile, error: profileError } = await brandClient.profiles
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: '문의 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 문의 존재 확인
    const { data: inquiry, error: fetchError } =
      await brandClient.angelInquiries.select('id').eq('id', id).single();

    if (fetchError) {
      console.error('문의 조회 오류:', fetchError);
      return NextResponse.json(
        { error: '문의를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 데이터베이스에서 문의 삭제
    const { error: deleteError } = await brandClient.angelInquiries
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
      message: '엔젤클럽 가입 문의가 성공적으로 삭제되었습니다.',
    });
  } catch (error) {
    console.error('엔젤클럽 가입 문의 삭제 처리 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
