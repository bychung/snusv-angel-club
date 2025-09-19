import { authenticateRequest } from '@/lib/auth/temp-token';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 인증 확인 (Supabase 세션 또는 임시 토큰)
    const authResult = await authenticateRequest(request, ['email-search']);
    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const { user } = authResult;

    const body = await request.json();
    const { searchedEmail, inquiryMessage } = body;

    // 임시 토큰에서 attempted_email과 provider 정보 가져오기 (있는 경우)
    const attemptedEmail = user.attempted_email || body.attemptedEmail;
    const provider = user.provider || body.provider;

    // 필수 필드 검증
    if (!attemptedEmail || !provider) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(attemptedEmail)) {
      return NextResponse.json(
        { error: '올바른 이메일 형식을 입력해주세요.' },
        { status: 400 }
      );
    }

    // provider 값 검증
    const validProviders = ['google', 'kakao', 'email'];
    if (!validProviders.includes(provider)) {
      return NextResponse.json(
        { error: '유효하지 않은 로그인 방식입니다.' },
        { status: 400 }
      );
    }

    // 이미 같은 사용자가 같은 이메일로 문의를 했는지 확인 (최근 24시간 내)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existingInquiry, error: checkError } = await supabase
      .from('signup_inquiries')
      .select('id')
      .eq('user_id', user.id)
      .eq('attempted_email', attemptedEmail.trim().toLowerCase())
      .gte('created_at', oneDayAgo)
      .limit(1);

    if (checkError) {
      console.error('기존 문의 확인 오류:', checkError);
      // 확인에 실패해도 진행 (중복 방지는 포기하고 문의는 받음)
    }

    if (existingInquiry && existingInquiry.length > 0) {
      return NextResponse.json(
        { error: '동일한 이메일로 최근 24시간 내에 이미 문의를 남기셨습니다.' },
        { status: 409 }
      );
    }

    // signup_inquiries 테이블에 문의 내용 저장
    const inquiryData = {
      user_id: user.id,
      attempted_email: attemptedEmail.trim().toLowerCase(),
      searched_email: searchedEmail ? searchedEmail.trim().toLowerCase() : null,
      provider: provider,
      inquiry_message: inquiryMessage ? inquiryMessage.trim() : null,
      status: 'pending',
    };

    const { data: savedInquiry, error: saveError } = await supabase
      .from('signup_inquiries')
      .insert(inquiryData)
      .select('*')
      .single();

    if (saveError) {
      console.error('문의 저장 오류:', saveError);
      return NextResponse.json(
        { error: '문의 저장에 실패했습니다.' },
        { status: 500 }
      );
    }

    console.log(
      `[회원가입 문의 접수] User: ${user.id}, Email: ${attemptedEmail}, Provider: ${provider}`
    );

    return NextResponse.json({
      success: true,
      message:
        '회원가입 문의가 성공적으로 접수되었습니다. 관리자가 확인 후 처리해드리겠습니다.',
      inquiryId: savedInquiry.id,
    });
  } catch (error) {
    console.error('회원가입 문의 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();

    // 현재 사용자 인증 및 관리자 권한 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 관리자 권한 확인
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    // 회원가입 문의 목록 조회
    const { data: inquiries, error: fetchError } = await supabase
      .from('signup_inquiries')
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
    console.error('회원가입 문의 목록 처리 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
