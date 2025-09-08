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
import { createClient } from '@/lib/supabase/client';
import type { FundMember, Profile } from '@/types/database';
import { useEffect, useState } from 'react';

interface MemberWithFund extends Profile {
  fund_members?: FundMember[];
  registration_status: 'registered' | 'survey_only';
}

interface EditMemberModalProps {
  isOpen: boolean;
  member: MemberWithFund | null;
  isUpdating: boolean;
  onClose: () => void;
  onUpdate: () => void;
  showInvestmentInfo?: boolean;
}

export default function EditMemberModal({
  isOpen,
  member,
  isUpdating,
  onClose,
  onUpdate,
  showInvestmentInfo = true,
}: EditMemberModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    birth_date: '',
    business_number: '',
    investment_units: 0,
  });

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name,
        phone: member.phone,
        email: member.email,
        address: member.address,
        birth_date: member.birth_date || '',
        business_number: member.business_number || '',
        investment_units: member.fund_members?.[0]?.investment_units || 0,
      });
    }
  }, [member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    try {
      const supabase = createClient();

      // 프로필 정보 업데이트
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          birth_date: formData.birth_date || null,
          business_number: formData.business_number || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', member.id);

      if (profileError) throw profileError;

      // 출자 정보 업데이트 (fund_members 테이블) - showInvestmentInfo가 true일 때만
      if (showInvestmentInfo && member.fund_members && member.fund_members.length > 0) {
        const { error: fundMemberError } = await supabase
          .from('fund_members')
          .update({
            investment_units: formData.investment_units,
            updated_at: new Date().toISOString(),
          })
          .eq('id', member.fund_members[0].id);

        if (fundMemberError) throw fundMemberError;
      }

      // 성공 시 콜백 호출
      onUpdate();
      onClose();
    } catch (error) {
      console.error('조합원 정보 업데이트 실패:', error);
      alert('조합원 정보 업데이트에 실패했습니다.');
    }
  };

  if (!member) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>조합원 정보 수정</DialogTitle>
          <DialogDescription>{member.name}님의 정보를 수정합니다.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">전화번호 *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">이메일 *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            {/* 개인/법인에 따른 추가 필드 */}
            {member.entity_type === 'individual' && (
              <div className="space-y-2">
                <Label htmlFor="birth_date">생년월일</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                />
              </div>
            )}

            {member.entity_type === 'corporate' && (
              <div className="space-y-2">
                <Label htmlFor="business_number">사업자번호</Label>
                <Input
                  id="business_number"
                  value={formData.business_number}
                  onChange={e => setFormData({ ...formData, business_number: e.target.value })}
                  placeholder="000-00-00000"
                />
              </div>
            )}

            {/* 출자 정보는 펀드 멤버 목록에서만 표시 */}
            {showInvestmentInfo && (
              <div className="space-y-2">
                <Label htmlFor="investment_units">출자좌수 *</Label>
                <Input
                  id="investment_units"
                  type="number"
                  min="1"
                  value={formData.investment_units}
                  onChange={e =>
                    setFormData({ ...formData, investment_units: Number(e.target.value) })
                  }
                  required={showInvestmentInfo}
                />
                <p className="text-xs text-gray-500">
                  출자금액: {(formData.investment_units * 1000000).toLocaleString()}원
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">주소 *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              required
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">기본 정보</h4>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">구분:</span>{' '}
                {member.entity_type === 'individual' ? '개인' : '법인'}
              </div>
              <div>
                <span className="font-medium">가입일:</span>{' '}
                {new Date(member.created_at).toLocaleDateString('ko-KR')}
              </div>
              <div>
                <span className="font-medium">등록 상태:</span>{' '}
                {member.registration_status === 'registered' ? '가입완료' : '설문만'}
              </div>
              {member.updated_at !== member.created_at && (
                <div>
                  <span className="font-medium">최종 수정일:</span>{' '}
                  {new Date(member.updated_at).toLocaleDateString('ko-KR')}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isUpdating}>
              취소
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
