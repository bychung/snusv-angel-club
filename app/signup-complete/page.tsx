'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SignupCompletePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-800">
            회원가입이 완료되었습니다!
          </CardTitle>
          <CardDescription>
            SNUSV ANGEL CLUB에 오신 것을 환영합니다.
            <br />
            이제 대시보드에서 설문조사 정보를 확인하고 수정할 수 있습니다.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Button onClick={() => router.push('/dashboard')} className="w-full" size="lg">
            대시보드로 이동
          </Button>

          <Button onClick={() => router.push('/')} variant="outline" className="w-full" size="lg">
            홈으로 이동
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
