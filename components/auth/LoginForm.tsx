'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { Chrome, Lock, Mail, MessageSquare } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const {
    signIn,
    signInWithOAuth,
    // isLoading: authLoading, // 전역 로딩 상태 사용하지 않음
    error,
    clearError,
    resetState,
  } = useAuthStore();

  // 완전한 상태 초기화 (브라우저 스토리지 포함)
  const handleCompleteReset = async () => {
    try {
      // Supabase 세션 완전 정리
      const supabase = createClient();
      await supabase.auth.signOut({ scope: 'global' });

      // 로컬 스토리지 Supabase 관련 키 정리
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // 상태 초기화
      resetState();
    } catch (error) {
      console.error('완전 초기화 실패:', error);
    }
  };

  // 컴포넌트 마운트 시 설정
  useEffect(() => {
    // 에러 상태 초기화
    clearError();
    // setUrlError(null);

    // URL 파라미터에서 에러 메시지 읽기
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setUrlError(decodeURIComponent(errorParam));
      // URL에서 error 파라미터 제거
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('error');
      router.replace(newUrl.pathname);
    }

    // 개발 환경에서 전역 초기화 함수 제공
    if (process.env.NODE_ENV === 'development') {
      (window as any).resetAuthState = handleCompleteReset;
      console.log(
        '개발 도구: window.resetAuthState() 함수로 인증 상태를 완전히 초기화할 수 있습니다.'
      );
    }
  }, [clearError, searchParams, router]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      return;
    }

    // 이전 에러 상태 초기화
    clearError();
    setUrlError(null);
    setIsLoading(true);

    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (error) {
      console.error('로그인 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'kakao') => {
    // 이전 에러 상태 초기화
    clearError();
    setUrlError(null);
    setIsOAuthLoading(true);

    try {
      await signInWithOAuth(provider);
      // OAuth는 리다이렉트로 처리되므로 여기서 추가 작업 불필요
    } catch (error) {
      console.error('OAuth 로그인 실패:', error);
      setIsOAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">로그인</CardTitle>
          <CardDescription>SNUSV ANGEL CLUB에 로그인하세요</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* OAuth 로그인 */}
          <div className="space-y-3">
            <Button
              onClick={() => handleOAuthLogin('google')}
              variant="outline"
              className="w-full"
              size="lg"
              disabled={isOAuthLoading}
            >
              <Chrome className="mr-2 h-4 w-4" />
              {isOAuthLoading ? '구글로 이동 중...' : 'Google로 로그인'}
            </Button>

            <Button
              onClick={() => handleOAuthLogin('kakao')}
              variant="outline"
              className="w-full bg-yellow-400 hover:bg-yellow-500 border-yellow-400 text-black"
              size="lg"
              disabled={isOAuthLoading}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              {isOAuthLoading ? '카카오로 이동 중...' : 'Kakao로 로그인'}
            </Button>
          </div>

          {/* 구분선 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">또는</span>
            </div>
          </div>

          {/* 이메일/패스워드 로그인 */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {(error || urlError) && (
              <div className="text-sm text-red-500 text-center bg-red-50 p-3 rounded-lg border border-red-200">
                <p className="mb-2">{error || urlError}</p>
                {/* {(error || urlError)?.includes('가입되지 않은 계정') && (
                  <Button
                    variant="link"
                    className="p-0 h-auto text-sm text-blue-600 hover:text-blue-800"
                    onClick={() => router.push('/survey')}
                  >
                    지금 설문조사 참여하기 →
                  </Button>
                )} */}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? '로그인 중...' : '이메일로 로그인'}
            </Button>
          </form>

          {/* 하단 링크 */}
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              출자자인데 계정이 없으신가요?{' '}
              <Button variant="link" className="p-0 h-auto" onClick={() => router.push('/signup')}>
                여기를 눌러 가입하세요.
              </Button>
            </p>

            <Button variant="link" className="p-0 h-auto text-sm" onClick={() => router.push('/')}>
              홈으로 돌아가기
            </Button>

            {/* 개발 환경에서만 보이는 상태 초기화 버튼 */}
            {process.env.NODE_ENV === 'development' && (
              <div className="space-y-1">
                <Button
                  variant="link"
                  className="p-0 h-auto text-xs text-gray-400 hover:text-red-500"
                  onClick={handleCompleteReset}
                >
                  [DEV] 인증 상태 초기화
                </Button>

                <Button
                  variant="link"
                  className="p-0 h-auto text-xs text-blue-400 hover:text-blue-600"
                  onClick={() => {
                    console.log('[DEV] 강제 로딩 해제');
                    resetState();
                  }}
                >
                  [DEV] 로딩 강제 해제
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
