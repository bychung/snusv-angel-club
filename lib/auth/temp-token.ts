import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { createBrandServerClient } from '../supabase/server';

export interface TempTokenPayload {
  user_id: string;
  user_email: string;
  attempted_email: string;
  provider: string;
  purpose: string;
  iat: number;
  exp: number;
}

export interface AuthResult {
  isAuthenticated: boolean;
  user?: {
    id: string;
    email: string;
    attempted_email?: string;
    provider?: string;
  };
  authType: 'supabase' | 'temp-token' | 'none';
  error?: string;
}

/**
 * Supabase 인증 또는 임시 토큰 인증을 확인하는 공통 함수
 * @param request NextRequest 객체
 * @param allowedPurposes 허용되는 임시 토큰 용도들
 * @returns 인증 결과
 */
export async function authenticateRequest(
  request: NextRequest,
  allowedPurposes: string[] = []
): Promise<AuthResult> {
  const brandClient = await createBrandServerClient();

  // 1. 먼저 Supabase 세션 인증 시도
  try {
    const {
      data: { user },
      error: authError,
    } = await brandClient.raw.auth.getUser();

    if (!authError && user) {
      return {
        isAuthenticated: true,
        user: {
          id: user.id,
          email: user.email || '',
        },
        authType: 'supabase',
      };
    }
  } catch (supabaseError) {
    console.log(
      '[authenticateRequest] Supabase 인증 실패, 임시 토큰 확인 시도'
    );
  }

  // 2. 임시 토큰 인증 시도
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      isAuthenticated: false,
      authType: 'none',
      error: '인증이 필요합니다.',
    };
  }

  const token = authHeader.substring(7);

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error(
        '[authenticateRequest] JWT_SECRET 환경변수가 설정되지 않았습니다.'
      );
      return {
        isAuthenticated: false,
        authType: 'none',
        error: '서버 설정 오류입니다.',
      };
    }

    const payload = jwt.verify(token, jwtSecret) as TempTokenPayload;

    // 용도 검증
    if (
      allowedPurposes.length > 0 &&
      !allowedPurposes.includes(payload.purpose)
    ) {
      return {
        isAuthenticated: false,
        authType: 'none',
        error: '허용되지 않은 토큰 용도입니다.',
      };
    }

    // 만료 시간 검증 (jwt.verify에서 자동으로 확인하지만 추가 체크)
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return {
        isAuthenticated: false,
        authType: 'none',
        error: '토큰이 만료되었습니다.',
      };
    }

    console.log(
      `[authenticateRequest] 임시 토큰 인증 성공: user=${payload.user_id}, purpose=${payload.purpose}`
    );

    return {
      isAuthenticated: true,
      user: {
        id: payload.user_id,
        email: payload.user_email,
        attempted_email: payload.attempted_email,
        provider: payload.provider,
      },
      authType: 'temp-token',
    };
  } catch (jwtError) {
    console.log('[authenticateRequest] 임시 토큰 검증 실패:', jwtError);
    return {
      isAuthenticated: false,
      authType: 'none',
      error: '유효하지 않은 토큰입니다.',
    };
  }
}
