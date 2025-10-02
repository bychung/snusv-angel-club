import { validateAdminAuth } from '@/lib/auth/admin-server';
import { createBrandServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * 활동 내역 삭제 API
 * DELETE /api/admin/activity-changes/[source]/[id]
 * source: 'fmc' (fund_member_changes) | 'pc' (profile_changes)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const { type: source, id } = await context.params;

    // 관리자 권한 확인
    await validateAdminAuth(request);

    const brandClient = await createBrandServerClient();

    // source 축약형을 실제 테이블로 매핑
    if (source === 'fmc') {
      // fund_member_changes 테이블에서 삭제
      const { error } = await brandClient.fundMemberChanges
        .delete()
        .eq('id', id);

      if (error) {
        console.error('fund_member_changes 삭제 실패:', error);
        return NextResponse.json(
          { error: '활동 내역 삭제에 실패했습니다.' },
          { status: 500 }
        );
      }
    } else if (source === 'pc') {
      // profile_changes 테이블에서 삭제
      const { error } = await brandClient.profileChanges.delete().eq('id', id);

      if (error) {
        console.error('profile_changes 삭제 실패:', error);
        return NextResponse.json(
          { error: '활동 내역 삭제에 실패했습니다.' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: '잘못된 활동 소스입니다.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: '활동 내역이 삭제되었습니다.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('활동 내역 삭제 에러:', error);

    // validateAdminAuth에서 발생한 에러 처리
    if (error instanceof Error) {
      if (error.message.includes('인증이 필요합니다')) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message.includes('관리자 권한이 필요합니다')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
