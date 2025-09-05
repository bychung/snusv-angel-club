'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSurveyStore } from '@/store/surveyStore';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type RedirectState = 'loading' | 'error';

export default function RedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loadFromLocalStorage } = useSurveyStore();

  const [state, setState] = useState<RedirectState>('loading');
  const [message, setMessage] = useState('로그인 처리 중입니다...');

  useEffect(() => {
    // 설문조사 데이터 복원 (OAuth 로그인 시 필요)
    loadFromLocalStorage();

    // OAuth 에러 체크만 수행
    const hasError = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (hasError) {
      console.error('[RedirectPage] OAuth error:', hasError, errorDescription);
      setState('error');
      setMessage(`로그인 실패: ${errorDescription || hasError}`);

      setTimeout(() => {
        router.replace('/login?error=' + encodeURIComponent('OAuth 로그인에 실패했습니다.'));
      }, 3000);
      return;
    }

    console.log('[RedirectPage] Waiting for AuthProvider to handle SIGNED_IN event...');

    // 15초 후 안전장치 (만약을 위한 fallback)
    const timeoutId = setTimeout(() => {
      console.log('[RedirectPage] Timeout fallback - redirecting to dashboard');
      router.push('/dashboard');
    }, 30000);

    return () => clearTimeout(timeoutId);
  }, [searchParams, router, loadFromLocalStorage]);

  const getIcon = () => {
    switch (state) {
      case 'loading':
        return <Loader2 className="h-8 w-8 animate-spin text-blue-600" />;
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-600" />;
    }
  };

  const getTitle = () => {
    switch (state) {
      case 'loading':
        return '로그인 중...';
      case 'error':
        return '로그인 실패';
    }
  };

  const getCardColor = () => {
    switch (state) {
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className={`w-full max-w-md ${getCardColor()}`}>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">{getIcon()}</div>
          <CardTitle className="text-xl font-bold">{getTitle()}</CardTitle>
          <CardDescription className="text-sm">{message}</CardDescription>
        </CardHeader>

        <CardContent className="text-center">
          {state === 'loading' ? (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full animate-pulse"
                  style={{ width: '60%' }}
                ></div>
              </div>
              <p className="text-xs text-gray-500">잠시만 기다려주세요...</p>
            </div>
          ) : (
            <p className="text-sm text-red-600">자동으로 이전 페이지로 이동합니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
