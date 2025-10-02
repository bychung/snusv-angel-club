import { validateAdminAuth } from '@/lib/auth/admin-server';
import { createBrandServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 관리자 권한 확인
    await validateAdminAuth(request);

    const brandClient = await createBrandServerClient();

    // 회원가입 문의 목록 조회 (브랜드별 필터링)
    const { data: inquiries, error: fetchError } =
      await brandClient.signupInquiries
        .select('*')
        .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('회원가입 문의 목록 조회 오류:', fetchError);
      return NextResponse.json(
        { error: '문의 목록을 불러올 수 없습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: inquiries });
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

    console.error('회원가입 문의 목록 처리 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
