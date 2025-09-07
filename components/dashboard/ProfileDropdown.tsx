'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/authStore';
import { isAdmin } from '@/lib/auth/admin';
import { ChevronDown, LogOut, Settings, User, UserCog } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ProfileEditModal from './ProfileEditModal';

export default function ProfileDropdown() {
  const router = useRouter();
  const { user, profile, signOut } = useAuthStore();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  const handleAdminPage = () => {
    router.push('/admin');
  };

  if (!user || !profile) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center space-x-3 p-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-900">{profile.name || user.email}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64">
          {/* 프로필 정보 */}
          <div className="px-4 py-3">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {profile.name || '이름 없음'}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                <p className="text-xs text-gray-400">
                  {profile.entity_type === 'individual' ? '개인' : '법인'}
                </p>
              </div>
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* 메뉴 항목들 */}
          <DropdownMenuItem onClick={() => setIsProfileModalOpen(true)}>
            <UserCog className="h-4 w-4 mr-3" />
            내 정보 수정
          </DropdownMenuItem>

          {/* 관리자 전용 메뉴 */}
          {isAdmin(user) && (
            <DropdownMenuItem onClick={handleAdminPage}>
              <Settings className="h-4 w-4 mr-3" />
              관리자 페이지
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
            <LogOut className="h-4 w-4 mr-3" />
            로그아웃
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 프로필 수정 모달 */}
      <ProfileEditModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
}