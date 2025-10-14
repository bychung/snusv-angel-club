import { isAdminServer } from '@/lib/auth/admin-server';
import { isSystemAdmin } from '@/lib/auth/system-admin';
import { createBrandServerClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string; memberId: string }> }
) {
  const { fundId, memberId } = await params;

  if (!fundId || !memberId) {
    return Response.json(
      { error: '펀드 ID와 조합원 ID가 필요합니다' },
      { status: 400 }
    );
  }

  try {
    // 사용자 인증 및 관리자 권한 확인
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

    // 쿼리 파라미터에서 삭제 타입 확인
    const { searchParams } = new URL(request.url);
    const deleteType = searchParams.get('type') || 'soft'; // 기본값: soft delete

    // hard delete는 SYSTEM_ADMIN만 가능
    if (deleteType === 'hard') {
      const isSystemAdminUser = isSystemAdmin(user);
      if (!isSystemAdminUser) {
        return Response.json(
          { error: '영구 삭제는 시스템 관리자만 가능합니다' },
          { status: 403 }
        );
      }

      // Hard delete: 실제로 레코드 삭제
      const { error: deleteError } = await brandClient.fundMembers
        .delete()
        .eq('fund_id', fundId)
        .eq('profile_id', memberId);

      if (deleteError) {
        console.error('조합원 영구 삭제 실패:', deleteError);
        throw deleteError;
      }

      return Response.json({
        success: true,
        message: '조합원이 영구 삭제되었습니다',
        deleteType: 'hard',
      });
    } else {
      // Soft delete: deleted_at 컬럼 업데이트
      const { error: updateError } = await brandClient.fundMembers
        .update({ deleted_at: new Date().toISOString() })
        .eq('fund_id', fundId)
        .eq('profile_id', memberId)
        .is('deleted_at', null); // 이미 삭제되지 않은 레코드만

      if (updateError) {
        console.error('조합원 소프트 삭제 실패:', updateError);
        throw updateError;
      }

      return Response.json({
        success: true,
        message: '조합원이 삭제되었습니다',
        deleteType: 'soft',
      });
    }
  } catch (error) {
    console.error('조합원 삭제 실패:', error);
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
