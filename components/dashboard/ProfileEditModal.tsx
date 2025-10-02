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
import { formatBusinessNumber, formatPhoneNumber } from '@/lib/format-utils';
import { createBrandClient } from '@/lib/supabase/client';
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
    let formattedValue = value;

    // 사업자번호와 전화번호에 자동 포맷팅 적용
    if (field === 'business_number') {
      formattedValue = formatBusinessNumber(value);
    } else if (field === 'phone') {
      formattedValue = formatPhoneNumber(value);
    }

    setEditData(prev => ({ ...prev, [field]: formattedValue }));
  };

  const handleSave = async () => {
    if (!profile) return;

    try {
      // 중요 필드 변경 내역 체크 (role, email, phone, name)
      const importantFieldChanges: Array<{
        field_name: 'role' | 'email' | 'phone' | 'name';
        old_value: string;
        new_value: string;
      }> = [];

      // role은 일반 사용자가 수정할 수 없지만, 혹시 모를 경우를 대비
      // (실제로는 UI에 노출되지 않음)

      if (editData.email && editData.email !== profile.email) {
        importantFieldChanges.push({
          field_name: 'email',
          old_value: profile.email,
          new_value: editData.email,
        });
      }

      if (editData.phone && editData.phone !== profile.phone) {
        importantFieldChanges.push({
          field_name: 'phone',
          old_value: profile.phone,
          new_value: editData.phone,
        });
      }

      if (editData.name && editData.name !== profile.name) {
        importantFieldChanges.push({
          field_name: 'name',
          old_value: profile.name,
          new_value: editData.name,
        });
      }

      // 프로필 업데이트
      await updateProfile(editData);

      // 중요 필드 변경 이력 저장
      if (importantFieldChanges.length > 0) {
        const brandClient = createBrandClient();

        for (const change of importantFieldChanges) {
          const { error: changeHistoryError } =
            await brandClient.profileChanges.insert({
              profile_id: profile.id,
              changed_by: profile.id, // 본인이 수정
              field_name: change.field_name,
              old_value: change.old_value,
              new_value: change.new_value,
            });

          if (changeHistoryError) {
            console.error('프로필 변경 이력 저장 실패:', changeHistoryError);
            // 이력 저장 실패는 치명적이지 않으므로 계속 진행
          }
        }
      }

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
                  placeholder="123-45-67890"
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
