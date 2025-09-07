'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ProfileDropdown from './ProfileDropdown';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  const { user, isLoading: authLoading } = useAuthStore();

  useEffect(() => {
    // 사용자가 로그인하지 않은 경우 로그인 페이지로 리다이렉트
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    setIsLoading(false);
  }, [user, router, authLoading]);


  // 로딩 중이거나 인증되지 않은 경우
  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse">
          <Card className="w-64">
            <CardContent className="p-6">
              <div className="text-center">로딩 중...</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">SNUSV ANGEL CLUB</h1>
              <span className="text-sm text-gray-500">대시보드</span>
            </div>

            <ProfileDropdown />
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="container mx-auto px-4 py-8">{children}</main>

      {/* 푸터 */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-gray-500">
            © 2024 SNUSV ANGEL CLUB. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
