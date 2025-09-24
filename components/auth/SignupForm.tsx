'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import { useSurveyStore } from '@/store/surveyStore';
import { CheckCircle, Chrome, Lock, Mail, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SignupForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [signupMethod, setSignupMethod] = useState<'email' | 'oauth' | null>(
    null
  );

  const {
    signUp,
    signInWithOAuth,
    isLoading: authLoading,
    error,
    signOut,
    resetState,
  } = useAuthStore();
  const surveyStore = useSurveyStore();

  // 완료된 설문조사 데이터 찾기
  const getCompletedSurveyData = () => {
    const fundSurveys = surveyStore.fundSurveys;
    for (const [fundId, surveyData] of Object.entries(fundSurveys)) {
      if (surveyData.profileId) {
        return surveyData.surveyData;
      }
    }
    return null;
  };

  const surveyData = getCompletedSurveyData();
  // 설문조사 데이터에서 이메일 가져오기
  const email = surveyData?.email || '';

  const [emailInput, setEmailInput] = useState(email);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const signupEmail = emailInput || email;

    if (!signupEmail || !password) {
      return;
    }

    if (password !== confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 6) {
      alert('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setIsLoading(true);

    try {
      // authStore의 signUp 함수 사용 (프로필 연결 로직 포함)
      await signUp(signupEmail, password);
      console.log('[SignupForm] signUp completed');

      // 회원가입 성공 시 설문조사 데이터 정리
      const fundSurveys = surveyStore.fundSurveys;
      for (const [fundId, surveyData] of Object.entries(fundSurveys)) {
        if (surveyData.profileId) {
          console.log('[SignupForm] Clearing survey data for fund:', fundId);
          surveyStore.clearActiveFundIdFromLocalStorage();
          surveyStore.clearLocalStorage(fundId);
          surveyStore.resetSurvey(fundId);
          break; // 첫 번째로 완료된 설문조사 데이터만 정리
        }
      }

      // 회원가입 완료 페이지로 이동
      router.push('/dashboard');
    } catch (error) {
      console.error('회원가입 실패:', error);

      // 프로필을 찾지 못한 경우 - 이미 계정은 생성되었으므로 임시 토큰 발행 후 find-email로 이동
      if (
        error instanceof Error &&
        error.message === 'PROFILE_NOT_FOUND_FOR_EMAIL'
      ) {
        console.log(
          '[SignupForm] 계정 생성 완료, 프로필 연결 실패 - 임시 토큰 발행 및 find-email로 이동'
        );

        try {
          // 임시 토큰 발행
          const tokenResponse = await fetch('/api/auth/temp-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              purpose: 'email-search',
              email: signupEmail,
              provider: 'email',
            }),
          });

          if (!tokenResponse.ok) {
            throw new Error('임시 토큰 발행에 실패했습니다.');
          }

          const { token } = await tokenResponse.json();

          // 임시 토큰을 sessionStorage에 저장
          sessionStorage.setItem('temp_auth_token', token);

          // 세션 정리
          await signOut();
          resetState();

          // find-email 페이지로 이동 (계정 생성됨을 알리는 플래그 추가)
          const redirectUrl = `/find-email?email=${encodeURIComponent(
            signupEmail
          )}&provider=email&account_created=true`;
          router.push(redirectUrl);
          return;
        } catch (tokenError) {
          console.error('[SignupForm] 임시 토큰 발행 실패:', tokenError);

          // 임시 토큰 발행 실패 시 로그인 페이지로 폴백
          const redirectUrl = `/login?error=${encodeURIComponent(
            '계정은 생성되었지만 프로필 연결에 실패했습니다. 다시 로그인을 시도해주세요.'
          )}`;
          router.push(redirectUrl);
          return;
        }
      }

      // 기타 에러는 알럿으로 표시
      const errorMessage =
        error instanceof Error ? error.message : '회원가입에 실패했습니다.';
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignup = async (provider: 'google' | 'kakao') => {
    try {
      // OAuth 보내기 직전에, profileId 정보를 로컬 스토리지에 저장
      surveyStore.saveActiveFundIdToLocalStorage();
      await signInWithOAuth(provider);
      // OAuth는 리다이렉트로 처리되므로 여기서 추가 작업 불필요
    } catch (error) {
      console.error('OAuth 회원가입 실패:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">회원가입</CardTitle>
          <CardDescription>
            {email
              ? '설문조사 정보로 간편하게 회원가입하세요'
              : '기존 출자한 펀드에 등록된 이메일로 회원가입하세요'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 설문조사 정보가 있는 경우에만 표시 */}
          {email && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center mb-2">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                <span className="text-sm font-medium text-green-800">
                  설문조사 정보
                </span>
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <div>이름: {surveyData?.name || ''}</div>
                <div>이메일: {email}</div>
                <div>전화번호: {surveyData?.phone || ''}</div>
              </div>
            </div>
          )}

          {!signupMethod && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-center">
                회원가입 방법을 선택해주세요
              </h3>

              {/* 이메일 회원가입 선택 */}
              <Button
                onClick={() => setSignupMethod('email')}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Mail className="mr-2 h-4 w-4" />
                이메일/비밀번호로 회원가입
              </Button>

              {/* OAuth 회원가입 선택 */}
              <Button
                onClick={() => setSignupMethod('oauth')}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Chrome className="mr-2 h-4 w-4" />
                간편 로그인으로 회원가입
              </Button>
            </div>
          )}

          {/* 이메일 회원가입 */}
          {signupMethod === 'email' && (
            <div className="space-y-4">
              <Button
                onClick={() => setSignupMethod(null)}
                variant="ghost"
                className="w-full"
              >
                ← 다른 방법으로 회원가입
              </Button>

              <form onSubmit={handleEmailSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">이메일</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    disabled={!!email}
                    className={email ? 'bg-gray-50' : ''}
                    required
                  />
                  {email ? (
                    <p className="text-xs text-gray-500">
                      출자 의향 설문조사에서 입력한 이메일이 사용됩니다.
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      회원가입에 사용할 이메일(출자했던 펀드에 등록된 이메일)을
                      입력하세요.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">비밀번호</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="6자 이상 입력하세요"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">비밀번호 확인</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="비밀번호를 다시 입력하세요"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {error && error !== 'PROFILE_NOT_FOUND_FOR_EMAIL' && (
                  <div className="text-sm text-red-500 text-center bg-red-50 p-2 rounded">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isLoading || authLoading}
                >
                  {isLoading ? '회원가입 중...' : '회원가입 완료'}
                </Button>
              </form>
            </div>
          )}

          {/* OAuth 회원가입 */}
          {signupMethod === 'oauth' && (
            <div className="space-y-4">
              <Button
                onClick={() => setSignupMethod(null)}
                variant="ghost"
                className="w-full"
              >
                ← 다른 방법으로 회원가입
              </Button>

              <div className="space-y-3">
                <Button
                  onClick={() => handleOAuthSignup('google')}
                  variant="outline"
                  className="w-full"
                  size="lg"
                  disabled={authLoading}
                >
                  <Chrome className="mr-2 h-4 w-4" />
                  Google로 회원가입
                </Button>

                <Button
                  onClick={() => handleOAuthSignup('kakao')}
                  variant="outline"
                  className="w-full bg-yellow-400 hover:bg-yellow-500 border-yellow-400 text-black"
                  size="lg"
                  disabled={authLoading}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Kakao로 회원가입
                </Button>
              </div>

              {error && error !== 'PROFILE_NOT_FOUND_FOR_EMAIL' && (
                <div className="text-sm text-red-500 text-center bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* 하단 링크 */}
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              이미 계정이 있으신가요?{' '}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => router.push('/login')}
              >
                로그인하기
              </Button>
            </p>

            <Button
              variant="link"
              className="p-0 h-auto text-sm"
              onClick={() => router.push('/')}
            >
              홈으로 돌아가기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
