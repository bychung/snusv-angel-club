'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/authStore';
import { ChevronDown, Plus, Trash2, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import AddAccountModal from './AddAccountModal';

interface AccountManageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProfileAccess {
  id: string;
  user_id: string;
  permission_type: 'admin' | 'view';
  user_info: {
    name: string;
    email: string;
    entity_type: 'individual' | 'corporate';
    has_profile: boolean;
    auth_email: string;
  };
}

export default function AccountManageModal({
  isOpen,
  onClose,
}: AccountManageModalProps) {
  const {
    selectedProfileId,
    removeProfileAccess,
    updateProfileAccess,
    profile,
  } = useAuthStore();
  const [accessList, setAccessList] = useState<ProfileAccess[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // 현재 프로필에 대한 접근 권한 목록 조회
  const fetchAccessList = async () => {
    if (!selectedProfileId) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/profiles/${selectedProfileId}/permissions`
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '권한 목록 조회에 실패했습니다.');
      }

      setAccessList(result.permissions || []);
    } catch (error) {
      console.error('접근 권한 목록 조회 실패:', error);
      setAccessList([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 권한 회수
  const handleRemoveAccess = async (userId: string, userName: string) => {
    if (!selectedProfileId) return;

    const confirmed = window.confirm(
      `${userName}님의 접근 권한을 회수하시겠습니까?`
    );
    if (!confirmed) return;

    setIsRemoving(userId);
    try {
      await removeProfileAccess(selectedProfileId, userId);
      await fetchAccessList(); // 목록 새로고침
    } catch (error) {
      alert('권한 회수에 실패했습니다.');
      console.error('권한 회수 실패:', error);
    } finally {
      setIsRemoving(null);
    }
  };

  // 권한 업데이트
  const handleUpdatePermission = async (
    userId: string,
    userName: string,
    newPermission: 'admin' | 'view'
  ) => {
    if (!selectedProfileId) return;

    setIsUpdating(userId);
    try {
      await updateProfileAccess(selectedProfileId, userId, newPermission);
      await fetchAccessList(); // 목록 새로고침
    } catch (error) {
      alert('권한 업데이트에 실패했습니다.');
      console.error('권한 업데이트 실패:', error);
    } finally {
      setIsUpdating(null);
    }
  };

  const getPermissionBadge = (permission: 'admin' | 'view') => {
    return permission === 'admin' ? '관리' : '조회';
  };

  const getPermissionColor = (permission: 'admin' | 'view') => {
    return permission === 'admin'
      ? 'text-green-600 bg-green-50'
      : 'text-gray-600 bg-gray-50';
  };

  useEffect(() => {
    if (isOpen && selectedProfileId) {
      fetchAccessList();
    }
  }, [isOpen, selectedProfileId]);

  if (!profile) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>{profile.name} - 계정 관리</span>
            </DialogTitle>
            <DialogDescription>
              이 프로필에 접근할 수 있는 사용자들을 관리할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 소유자 정보 */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">
                      {profile.name} (나)
                    </p>
                    <p className="text-sm text-blue-700">{profile.email}</p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                  소유자
                </span>
              </div>
            </div>

            {/* 공유된 사용자 목록 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">
                  공유된 사용자 ({accessList.length}명)
                </h3>
                <Button
                  size="sm"
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center space-x-1"
                >
                  <Plus className="h-4 w-4" />
                  <span>계정 추가</span>
                </Button>
              </div>

              {isLoading ? (
                <div className="text-center py-8 text-gray-500">로딩 중...</div>
              ) : accessList.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  공유된 계정이 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  {accessList.map(access => (
                    <div
                      key={access.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {access.user_info?.name || '이름 없음'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {access.user_info?.email}
                          </p>
                          {!access.user_info?.has_profile && (
                            <p className="text-xs text-blue-600">
                              OAuth 전용 계정
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* 권한 변경 드롭다운 */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-auto"
                              disabled={isUpdating === access.user_id}
                            >
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full flex items-center space-x-1 ${getPermissionColor(
                                  access.permission_type
                                )}`}
                              >
                                <span>
                                  {getPermissionBadge(access.permission_type)}
                                </span>
                                <ChevronDown className="h-3 w-3" />
                              </span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem
                              onClick={() =>
                                handleUpdatePermission(
                                  access.user_id,
                                  access.user_info?.name || '사용자',
                                  'view'
                                )
                              }
                              disabled={
                                access.permission_type === 'view' ||
                                isUpdating === access.user_id
                              }
                            >
                              <span className="flex items-center">
                                <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                                조회 권한
                              </span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleUpdatePermission(
                                  access.user_id,
                                  access.user_info?.name || '사용자',
                                  'admin'
                                )
                              }
                              disabled={
                                access.permission_type === 'admin' ||
                                isUpdating === access.user_id
                              }
                            >
                              <span className="flex items-center">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                관리 권한
                              </span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* 제거 버튼 */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleRemoveAccess(
                              access.user_id,
                              access.user_info?.name || '사용자'
                            )
                          }
                          disabled={
                            isRemoving === access.user_id ||
                            isUpdating === access.user_id
                          }
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {isRemoving === access.user_id ? (
                            '제거 중...'
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 하단 버튼 */}
            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={onClose}>
                닫기
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 계정 추가 모달 */}
      <AddAccountModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchAccessList(); // 목록 새로고침
        }}
      />
    </>
  );
}
