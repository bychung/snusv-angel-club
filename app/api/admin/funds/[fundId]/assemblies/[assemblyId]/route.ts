// 총회 상세 조회 및 삭제 API

import { deleteAssembly, getAssemblyDetail } from '@/lib/admin/assemblies';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/funds/{fundId}/assemblies/{assemblyId}
 * 총회 상세 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string; assemblyId: string }> }
) {
  try {
    const { assemblyId } = await params;

    // 인증 및 관리자 권한 확인
    await validateAdminAuth(request);

    // 총회 상세 조회
    const assembly = await getAssemblyDetail(assemblyId);

    if (!assembly) {
      return NextResponse.json(
        { error: '총회를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ assembly });
  } catch (error) {
    console.error('총회 상세 조회 실패:', error);

    if (error instanceof Error) {
      if (error.message.includes('인증')) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message.includes('권한')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: '총회 상세 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/funds/{fundId}/assemblies/{assemblyId}
 * 총회 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string; assemblyId: string }> }
) {
  try {
    const { assemblyId } = await params;

    // 인증 및 관리자 권한 확인
    await validateAdminAuth(request);

    // 총회 삭제
    await deleteAssembly(assemblyId);

    return NextResponse.json({ message: '총회가 삭제되었습니다.' });
  } catch (error) {
    console.error('총회 삭제 실패:', error);

    if (error instanceof Error) {
      if (error.message.includes('인증')) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message.includes('권한')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: '총회 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}
