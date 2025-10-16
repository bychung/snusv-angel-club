// 총회 목록 조회 및 생성 API

import { createAssembly, getAssembliesByFund } from '@/lib/admin/assemblies';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/funds/{fundId}/assemblies
 * 총회 목록 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    const { fundId } = await params;

    // 인증 및 관리자 권한 확인
    await validateAdminAuth(request);

    // 총회 목록 조회
    const assemblies = await getAssembliesByFund(fundId);

    return NextResponse.json({ assemblies });
  } catch (error) {
    console.error('총회 목록 조회 실패:', error);

    if (error instanceof Error) {
      if (error.message.includes('인증')) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message.includes('권한')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: '총회 목록 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/funds/{fundId}/assemblies
 * 총회 생성
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    const { fundId } = await params;

    // 인증 및 관리자 권한 확인
    const { user, profile } = await validateAdminAuth(request);

    if (!profile) {
      return NextResponse.json(
        { error: '프로필 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();
    const { type, assembly_date } = body;

    if (!type || !assembly_date) {
      return NextResponse.json(
        { error: '총회 종류와 개최일이 필요합니다.' },
        { status: 400 }
      );
    }

    // Phase 1: 결성총회만 허용
    if (type !== 'formation') {
      return NextResponse.json(
        { error: '현재는 결성총회만 생성 가능합니다.' },
        { status: 400 }
      );
    }

    // 총회 생성
    const assembly = await createAssembly(
      fundId,
      type,
      assembly_date,
      profile.id,
      profile.brand
    );

    return NextResponse.json({ assembly }, { status: 201 });
  } catch (error) {
    console.error('총회 생성 실패:', error);

    if (error instanceof Error) {
      if (error.message.includes('인증')) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message.includes('권한')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: '총회 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}
