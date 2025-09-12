'use client';

import FindEmailForm from '@/components/auth/FindEmailForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Home } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function FindEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [attemptedEmail, setAttemptedEmail] = useState<string>('');
  const [provider, setProvider] = useState<string>('');
  const [isValidParams, setIsValidParams] = useState<boolean>(false);
  const [isAccountCreated, setIsAccountCreated] = useState<boolean>(false);

  useEffect(() => {
    // URL 파라미터에서 이메일과 provider 정보 가져오기
    const emailParam = searchParams.get('email');
    const providerParam = searchParams.get('provider');
    const accountCreatedParam = searchParams.get('account_created');

    if (emailParam && providerParam) {
      setAttemptedEmail(decodeURIComponent(emailParam));
      setProvider(providerParam);
      setIsAccountCreated(accountCreatedParam === 'true');
      setIsValidParams(true);
    } else {
      setIsValidParams(false);
    }
  }, [searchParams]);

  const handleLinkSuccess = () => {
    console.log('프로필 연결 성공, 로그인 페이지로 리디렉션');
    router.push(
      '/login?success=' + encodeURIComponent('프로필 연결이 완료되었습니다. 이제 로그인해주세요.')
    );
  };

  const handleGoHome = () => {
    router.push('/');
  };

  // 파라미터가 유효하지 않은 경우
  if (!isValidParams) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2 text-red-600">
              <AlertCircle className="w-6 h-6" />
              잘못된 접근
            </CardTitle>
            <CardDescription className="text-center">
              필요한 정보가 없습니다. 로그인 페이지에서 다시 시도해주세요.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                이메일 또는 로그인 방식 정보가 누락되었습니다.
                <br />
                홈페이지에서 다시 로그인을 시도해주세요.
              </AlertDescription>
            </Alert>

            <Button onClick={handleGoHome} className="w-full">
              <Home className="w-4 h-4 mr-2" />
              홈페이지로 이동
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <FindEmailForm
      attemptedEmail={attemptedEmail}
      provider={provider}
      isAccountCreated={isAccountCreated}
      onLinkSuccess={handleLinkSuccess}
    />
  );
}
