'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/authStore';
import { Building2, ChevronDown, User } from 'lucide-react';

export default function ProfileSelector() {
  const { accessibleProfiles, selectedProfileId, selectProfile, profile, getProfilePermission } =
    useAuthStore();

  // 접근 가능한 프로필이 1개 이하면 선택기를 표시하지 않음
  if (accessibleProfiles.length <= 1) {
    return null;
  }

  const selectedProfile = accessibleProfiles.find(ap => ap.profile.id === selectedProfileId);

  const getPermissionBadge = (permission: 'owner' | 'admin' | 'view') => {
    switch (permission) {
      case 'owner':
        return '소유자';
      case 'admin':
        return '관리';
      case 'view':
        return '조회';
      default:
        return '';
    }
  };

  const getPermissionColor = (permission: 'owner' | 'admin' | 'view') => {
    switch (permission) {
      case 'owner':
        return 'text-blue-600 bg-blue-50';
      case 'admin':
        return 'text-green-600 bg-green-50';
      case 'view':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="min-w-[200px] justify-between">
          <div className="flex items-center space-x-2">
            {selectedProfile?.profile.entity_type === 'corporate' ? (
              <Building2 className="h-4 w-4" />
            ) : (
              <User className="h-4 w-4" />
            )}
            <span className="truncate max-w-[120px]">
              {selectedProfile?.profile.name || '프로필 선택'}
            </span>
            {selectedProfile && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getPermissionColor(
                  selectedProfile.permission
                )}`}
              >
                {getPermissionBadge(selectedProfile.permission)}
              </span>
            )}
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[280px]">
        <DropdownMenuLabel>접근 가능한 프로필</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {accessibleProfiles.map(accessibleProfile => (
          <DropdownMenuItem
            key={accessibleProfile.profile.id}
            onClick={() => selectProfile(accessibleProfile.profile.id)}
            className={`cursor-pointer ${
              selectedProfileId === accessibleProfile.profile.id ? 'bg-blue-50 text-blue-900' : ''
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                {accessibleProfile.profile.entity_type === 'corporate' ? (
                  <Building2 className="h-4 w-4 text-gray-400" />
                ) : (
                  <User className="h-4 w-4 text-gray-400" />
                )}
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{accessibleProfile.profile.name}</span>
                  {accessibleProfile.grantedBy && (
                    <span className="text-xs text-gray-500">
                      {accessibleProfile.grantedBy}님이 공유
                    </span>
                  )}
                </div>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getPermissionColor(
                  accessibleProfile.permission
                )}`}
              >
                {getPermissionBadge(accessibleProfile.permission)}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
