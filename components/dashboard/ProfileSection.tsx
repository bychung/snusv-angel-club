'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import type { Profile } from '@/types/database';
import { Edit2, Save, User, X } from 'lucide-react';
import { useState } from 'react';

export default function ProfileSection() {
  const { profile, updateProfile, isLoading } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Profile>>({});

  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            개인정보
          </CardTitle>
          <CardDescription>프로필 정보가 없습니다.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({
      name: profile.name,
      phone: profile.phone,
      email: profile.email,
      address: profile.address,
      birth_date: profile.birth_date || undefined,
      business_number: profile.business_number || undefined,
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({});
  };

  const handleSave = async () => {
    try {
      await updateProfile(editData);
      setIsEditing(false);
      setEditData({});
    } catch (error) {
      console.error('프로필 업데이트 실패:', error);
    }
  };

  const handleChange = (field: keyof Profile, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              개인정보
            </CardTitle>
            <CardDescription>
              개인정보를 확인하고 수정할 수 있습니다.
            </CardDescription>
          </div>

          {!isEditing ? (
            <Button onClick={handleEdit} variant="outline" size="sm">
              <Edit2 className="h-4 w-4 mr-2" />
              수정
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm" disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                저장
              </Button>
              <Button onClick={handleCancel} variant="outline" size="sm">
                <X className="h-4 w-4 mr-2" />
                취소
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 이름/회사명 */}
          <div className="space-y-2">
            <Label>이름/회사명</Label>
            {isEditing ? (
              <Input
                value={editData.name || ''}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="이름 또는 회사명"
              />
            ) : (
              <div className="p-3 bg-gray-50 rounded-md">{profile.name}</div>
            )}
          </div>

          {/* 전화번호 */}
          <div className="space-y-2">
            <Label>전화번호</Label>
            {isEditing ? (
              <Input
                value={editData.phone || ''}
                onChange={e => handleChange('phone', e.target.value)}
                placeholder="010-0000-0000"
              />
            ) : (
              <div className="p-3 bg-gray-50 rounded-md">{profile.phone}</div>
            )}
          </div>

          {/* 이메일 */}
          <div className="space-y-2">
            <Label>이메일</Label>
            {isEditing ? (
              <Input
                type="email"
                value={editData.email || ''}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="example@email.com"
              />
            ) : (
              <div className="p-3 bg-gray-50 rounded-md">{profile.email}</div>
            )}
          </div>

          {/* 구분 */}
          <div className="space-y-2">
            <Label>구분</Label>
            <div className="p-3 bg-gray-50 rounded-md">
              {profile.entity_type === 'individual' ? '개인' : '법인'}
            </div>
          </div>

          {/* 생년월일 (개인인 경우) */}
          {profile.entity_type === 'individual' && (
            <div className="space-y-2">
              <Label>생년월일</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editData.birth_date || ''}
                  onChange={e => handleChange('birth_date', e.target.value)}
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-md">
                  {profile.birth_date
                    ? new Date(profile.birth_date).toLocaleDateString('ko-KR')
                    : '-'}
                </div>
              )}
            </div>
          )}

          {/* 사업자번호 (법인인 경우) */}
          {profile.entity_type === 'corporate' && (
            <div className="space-y-2">
              <Label>사업자번호</Label>
              {isEditing ? (
                <Input
                  value={editData.business_number || ''}
                  onChange={e =>
                    handleChange('business_number', e.target.value)
                  }
                  placeholder="000-00-00000"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-md">
                  {profile.business_number || '-'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 주소 */}
        <div className="space-y-2">
          <Label>주소</Label>
          {isEditing ? (
            <Input
              value={editData.address || ''}
              onChange={e => handleChange('address', e.target.value)}
              placeholder="서울특별시 강남구..."
            />
          ) : (
            <div className="p-3 bg-gray-50 rounded-md">{profile.address}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
