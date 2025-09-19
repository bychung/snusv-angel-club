import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const body = await request.json();
    const { name, selfIntroduction, email } = body;

    // 필수 필드 검증
    if (!name || !selfIntroduction || !email) {
      return NextResponse.json(
        { error: '모든 필수 필드를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '올바른 이메일 형식을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 데이터베이스에 문의 내용 저장
    const { data, error: dbError } = await supabase
      .from('angel_inquiries')
      .insert({
        name: name.trim(),
        self_introduction: selfIntroduction.trim(),
        email: email.trim().toLowerCase(),
      })
      .select('*')
      .single();

    if (dbError) {
      console.error('데이터베이스 저장 오류:', dbError);
      return NextResponse.json(
        { error: '문의 저장에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: '엔젤클럽 가입 문의가 성공적으로 제출되었습니다.',
        data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('엔젤클럽 가입 문의 처리 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();

    // 관리자용 문의 목록 조회
    const { data, error } = await supabase
      .from('angel_inquiries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('엔젤클럽 문의 목록 조회 오류:', error);
      return NextResponse.json(
        { error: '문의 목록을 불러올 수 없습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('엔젤클럽 문의 목록 처리 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
