'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import type { Profile } from '@/types/database';
import { User } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileEditModal({
  isOpen,
  onClose,
}: ProfileEditModalProps) {
  const {
    profile,
    updateProfile,
    isLoading,
    selectedProfileId,
    getProfilePermission,
  } = useAuthStore();
  const [editData, setEditData] = useState<Partial<Profile>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // 현재 프로필에 대한 권한 확인
  const currentPermission = selectedProfileId
    ? getProfilePermission(selectedProfileId)
    : null;
  const isReadOnly = currentPermission === 'view';

  // 모달이 열릴 때마다 프로필 데이터로 초기화
  useEffect(() => {
    if (isOpen && profile) {
      const initialData = {
        name: profile.name,
        phone: profile.phone,
        email: profile.email,
        address: profile.address,
        birth_date: profile.birth_date || undefined,
        business_number: profile.business_number || undefined,
      };
      setEditData(initialData);
      setHasChanges(false);
    }
  }, [isOpen, profile]);

  // 변경사항 감지
  useEffect(() => {
    if (profile) {
      const hasChanged =
        editData.name !== profile.name ||
        editData.phone !== profile.phone ||
        editData.email !== profile.email ||
        editData.address !== profile.address ||
        editData.birth_date !== profile.birth_date ||
        editData.business_number !== profile.business_number;
      setHasChanges(hasChanged);
    }
  }, [editData, profile]);

  const handleChange = (field: keyof Profile, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await updateProfile(editData);
      onClose();
    } catch (error) {
      console.error('프로필 업데이트 실패:', error);
    }
  };

  const handleCancel = () => {
    setEditData({});
    setHasChanges(false);
    onClose();
  };

  if (!profile) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isReadOnly ? '프로필 정보 조회' : '내 정보 수정'}
          </DialogTitle>
          <DialogDescription>
            {isReadOnly
              ? '프로필 정보를 조회할 수 있습니다. (수정 권한 없음)'
              : '개인정보를 확인하고 수정할 수 있습니다.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 이름/회사명 */}
            <div className="space-y-2">
              <Label htmlFor="name">이름/회사명 *</Label>
              <Input
                id="name"
                value={editData.name || ''}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="이름 또는 회사명"
                disabled={isReadOnly}
              />
            </div>

            {/* 전화번호 */}
            <div className="space-y-2">
              <Label htmlFor="phone">전화번호 *</Label>
              <Input
                id="phone"
                value={editData.phone || ''}
                onChange={e => handleChange('phone', e.target.value)}
                placeholder="010-0000-0000"
                disabled={isReadOnly}
              />
            </div>

            {/* 이메일 */}
            <div className="space-y-2">
              <Label htmlFor="email">이메일 *</Label>
              <Input
                id="email"
                type="email"
                value={editData.email || ''}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="example@email.com"
                disabled={isReadOnly}
              />
            </div>

            {/* 구분 (읽기 전용) */}
            <div className="space-y-2">
              <Label>구분</Label>
              <div className="p-3 bg-gray-50 rounded-md border">
                {profile.entity_type === 'individual' ? '개인' : '법인'}
              </div>
            </div>

            {/* 생년월일 (개인인 경우) */}
            {profile.entity_type === 'individual' && (
              <div className="space-y-2">
                <Label htmlFor="birth_date">생년월일</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={editData.birth_date || ''}
                  onChange={e => handleChange('birth_date', e.target.value)}
                  disabled={isReadOnly}
                />
              </div>
            )}

            {/* 사업자번호 (법인인 경우) */}
            {profile.entity_type === 'corporate' && (
              <div className="space-y-2">
                <Label htmlFor="business_number">사업자번호</Label>
                <Input
                  id="business_number"
                  value={editData.business_number || ''}
                  onChange={e =>
                    handleChange('business_number', e.target.value)
                  }
                  placeholder="000-00-00000"
                  disabled={isReadOnly}
                />
              </div>
            )}
          </div>

          {/* 주소 */}
          <div className="space-y-2">
            <Label htmlFor="address">주소 *</Label>
            <Input
              id="address"
              value={editData.address || ''}
              onChange={e => handleChange('address', e.target.value)}
              placeholder="서울특별시 강남구..."
              disabled={isReadOnly}
            />
          </div>

          {/* 권한별 안내 */}
          {isReadOnly ? (
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800">
                <strong>알림:</strong> 현재 조회 권한만 있어서 정보를 수정할 수
                없습니다. 수정이 필요한 경우 프로필 소유자에게 문의해 주세요.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>참고:</strong> 개인/법인 구분은 변경할 수 없습니다.
                변경이 필요한 경우 관리자에게 문의해 주세요.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button onClick={handleCancel} variant="outline">
            {isReadOnly ? '닫기' : '취소'}
          </Button>
          {!isReadOnly && (
            <Button onClick={handleSave} disabled={isLoading || !hasChanges}>
              {isLoading ? '저장 중...' : '저장'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
