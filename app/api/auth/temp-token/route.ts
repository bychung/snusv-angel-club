import { createClient } from '@/lib/supabase/server';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 현재 사용자 인증 확인
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

    const body = await request.json();
    const { purpose, email: attemptedEmail, provider } = body;

    // 용도 검증
    if (purpose !== 'email-search') {
      return NextResponse.json(
        { error: '유효하지 않은 토큰 용도입니다.' },
        { status: 400 }
      );
    }

    // 필수 필드 검증
    if (!attemptedEmail || !provider) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // JWT 시크릿 확인
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[temp-token] JWT_SECRET 환경변수가 설정되지 않았습니다.');
      return NextResponse.json(
        { error: '서버 설정 오류입니다.' },
        { status: 500 }
      );
    }

    // 임시 토큰 생성 (30분 유효)
    const payload = {
      user_id: user.id,
      user_email: user.email,
      attempted_email: attemptedEmail,
      provider,
      purpose,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 30 * 60, // 30분 후 만료
    };

    const token = jwt.sign(payload, jwtSecret);

    console.log(
      `[temp-token] 임시 토큰 발행: user=${user.id}, purpose=${purpose}, email=${attemptedEmail}`
    );

    return NextResponse.json({
      success: true,
      token,
      expires_in: 30 * 60, // 30분 (초 단위)
    });
  } catch (error) {
    console.error('임시 토큰 발행 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
