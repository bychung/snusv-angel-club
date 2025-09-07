'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { useSurveyStore } from '@/store/surveyStore';
import { CheckCircle, Chrome, Lock, Mail, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SignupForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [signupMethod, setSignupMethod] = useState<'email' | 'oauth' | null>(null);

  const { signUp, signInWithOAuth, isLoading: authLoading, error } = useAuthStore();
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

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
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
      // 회원가입
      await signUp(email, password);

      // 회원가입 성공 후 profiles 테이블의 user_id 업데이트
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // 기존 profiles 레코드에 user_id 연결
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ user_id: user.id })
          .eq('email', email);

        if (updateError) {
          console.error('프로필 업데이트 실패:', updateError);
        }
      }

      // 회원가입 완료 페이지로 이동
      router.push('/signup-complete');
    } catch (error) {
      console.error('회원가입 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignup = async (provider: 'google' | 'kakao') => {
    try {
      await signInWithOAuth(provider);
      // OAuth는 리다이렉트로 처리되므로 여기서 추가 작업 불필요
    } catch (error) {
      console.error('OAuth 회원가입 실패:', error);
    }
  };

  // 설문조사를 완료하지 않은 경우 리다이렉트
  useEffect(() => {
    if (!email) {
      router.push('/survey');
    }
  }, [email, router]);

  if (!email) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">회원가입</CardTitle>
          <CardDescription>설문조사 정보로 간편하게 회원가입하세요</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 기존 정보 표시 */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center mb-2">
              <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-800">설문조사 정보</span>
            </div>
            <div className="text-sm text-green-700 space-y-1">
              <div>이름: {surveyData?.name || ''}</div>
              <div>이메일: {email}</div>
              <div>전화번호: {surveyData?.phone || ''}</div>
            </div>
          </div>

          {!signupMethod && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-center">회원가입 방법을 선택해주세요</h3>

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
              <Button onClick={() => setSignupMethod(null)} variant="ghost" className="w-full">
                ← 다른 방법으로 회원가입
              </Button>

              <form onSubmit={handleEmailSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">이메일</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">설문조사에서 입력한 이메일이 사용됩니다.</p>
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

                {error && (
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
              <Button onClick={() => setSignupMethod(null)} variant="ghost" className="w-full">
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

              {error && (
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
              <Button variant="link" className="p-0 h-auto" onClick={() => router.push('/login')}>
                로그인하기
              </Button>
            </p>

            <Button variant="link" className="p-0 h-auto text-sm" onClick={() => router.push('/')}>
              홈으로 돌아가기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
