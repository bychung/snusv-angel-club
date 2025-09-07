import RedirectPage from '@/components/auth/RedirectPage';
import { Suspense } from 'react';

export default function RedirectPageWrapper() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <RedirectPage />
    </Suspense>
  );
}
