'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getBrandingConfig } from '@/lib/branding';
import { useAuthStore } from '@/store/authStore';
import { Home } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ProfileDropdown from './ProfileDropdown';
import ProfileSelector from './ProfileSelector';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  const { user, isLoading: authLoading } = useAuthStore();
  const branding = getBrandingConfig();

  useEffect(() => {
    console.log('[DashboardLayout] user:', user);
    console.log('[DashboardLayout] authLoading:', authLoading);

    setIsLoading(authLoading);
  }, [authLoading]);

  // 로딩 중이거나 인증되지 않은 경우
  if (isLoading || authLoading) {
    console.log('[DashboardLayout-rendering] user:', user);
    console.log('[DashboardLayout-rendering] isLoading:', isLoading);
    console.log('[DashboardLayout-rendering] authLoading:', authLoading);
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
              <Link href="/">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  title="홈페이지로 이동"
                >
                  <Home className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-gray-900">
                {branding.clubName}
              </h1>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">대시보드</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <ProfileSelector />
              <ProfileDropdown />
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="container mx-auto px-4 py-8">{children}</main>

      {/* 푸터 */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-gray-500">
            © 2025 {branding.clubName}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
