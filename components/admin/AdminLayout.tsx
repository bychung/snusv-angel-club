'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import {
  BarChart3,
  Building,
  Building2,
  FileCode,
  Home,
  LogOut,
  MessageSquare,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(true);

  const {
    user,
    signOut,
    isLoading: authLoading,
    isSystemAdminUser,
  } = useAuthStore();

  useEffect(() => {
    console.log('[AdminLayout] user:', user);
    console.log('[AdminLayout] isLoading:', isLoading);
    console.log('[AdminLayout] authLoading:', authLoading);

    setIsLoading(authLoading);
  }, [authLoading]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-64">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  const navigation = [
    {
      name: '대시보드',
      href: '/admin',
      icon: BarChart3,
      current: pathname === '/admin',
    },
    {
      name: '펀드 관리',
      href: '/admin/funds',
      icon: Building,
      current: pathname.startsWith('/admin/funds'),
    },
    {
      name: '회사 관리',
      href: '/admin/companies',
      icon: Building2,
      current: pathname.startsWith('/admin/companies'),
    },
    {
      name: '투자 관리',
      href: '/admin/investments',
      icon: TrendingUp,
      current: pathname.startsWith('/admin/investments'),
    },
    {
      name: '사용자 관리',
      href: '/admin/users',
      icon: Users,
      current: pathname === '/admin/users',
    },
    {
      name: '문의 관리',
      href: '/admin/inquiries',
      icon: MessageSquare,
      current: pathname === '/admin/inquiries',
    },
  ];

  // SYSTEM_ADMIN 전용 메뉴
  const systemAdminNavigation = isSystemAdminUser
    ? [
        {
          name: '🌐 글로벌 템플릿',
          href: '/admin/system/templates',
          icon: FileCode,
          current: pathname === '/admin/system/templates',
          systemOnly: true,
        },
        {
          name: '📋 총회 문서 템플릿',
          href: '/admin/system/assembly-templates',
          icon: FileCode,
          current: pathname.startsWith('/admin/system/assembly-templates'),
          systemOnly: true,
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 사이드바 */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            {/* 로고 */}
            <div className="flex items-center flex-shrink-0 px-4">
              <Shield className="h-8 w-8 text-indigo-600 mr-2" />
              <h1 className="text-lg font-semibold text-gray-900">
                관리자 패널
              </h1>
            </div>

            {/* 네비게이션 */}
            <nav className="mt-8 flex-1 px-2 space-y-1">
              {navigation.map(item => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      group flex items-center px-2 py-2 text-sm font-medium rounded-md
                      ${
                        item.current
                          ? 'bg-indigo-100 text-indigo-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon
                      className={`
                        mr-3 flex-shrink-0 h-5 w-5
                        ${
                          item.current
                            ? 'text-indigo-500'
                            : 'text-gray-400 group-hover:text-gray-500'
                        }
                      `}
                    />
                    {item.name}
                  </Link>
                );
              })}

              {/* SYSTEM_ADMIN 전용 메뉴 */}
              {systemAdminNavigation.length > 0 && (
                <>
                  <div className="my-4 border-t border-gray-200 pt-4">
                    <div className="px-2 mb-2 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-amber-600" />
                      <span className="text-xs font-semibold text-amber-600 uppercase">
                        System Admin
                      </span>
                    </div>
                  </div>
                  {systemAdminNavigation.map(item => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`
                          group flex items-center px-2 py-2 text-sm font-medium rounded-md border-l-2
                          ${
                            item.current
                              ? 'bg-amber-50 text-amber-900 border-amber-600'
                              : 'text-gray-600 hover:bg-amber-50 hover:text-amber-900 border-transparent hover:border-amber-300'
                          }
                        `}
                      >
                        <Icon
                          className={`
                            mr-3 flex-shrink-0 h-5 w-5
                            ${
                              item.current
                                ? 'text-amber-600'
                                : 'text-gray-400 group-hover:text-amber-500'
                            }
                          `}
                        />
                        {item.name}
                      </Link>
                    );
                  })}
                </>
              )}
            </nav>
          </div>

          {/* 하단 액션 버튼들 */}
          <div className="flex-shrink-0 border-t border-gray-200">
            {/* 대시보드로 이동 버튼 */}
            <div className="p-2">
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                >
                  <Home className="h-4 w-4 mr-2" />
                  대시보드로 이동
                </Button>
              </Link>
            </div>

            {/* 사용자 정보 */}
            <div className="flex items-center p-4">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  <Shield className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-700">관리자</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <Button
                onClick={handleSignOut}
                variant="ghost"
                size="sm"
                className="ml-2"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* 상단 헤더 (모바일) */}
        <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="h-6 w-6 text-indigo-600 mr-2" />
              <h1 className="text-lg font-semibold text-gray-900">관리자</h1>
            </div>
            <Button
              onClick={handleSignOut}
              variant="ghost"
              size="sm"
              className="mr-4"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 페이지 컨텐츠 */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
