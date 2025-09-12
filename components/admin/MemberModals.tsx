'use client';

import { Button } from '@/components/ui/button';
import type { FundMember, Profile } from '@/types/database';
import { Edit, Eye } from 'lucide-react';
import { useState } from 'react';
import EditMemberModal from './EditMemberModal';
import ViewMemberModal from './ViewMemberModal';

interface MemberWithFund extends Profile {
  fund_members?: (FundMember & { fund?: { name: string; abbreviation?: string | null } })[];
  registration_status: 'registered' | 'survey_only';
}

interface MemberModalsProps {
  member: MemberWithFund;
  mode: 'users' | 'fund_members';
}

export default function MemberModals({ member, mode }: MemberModalsProps) {
  // 상세 보기 모달 상태
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingMember, setViewingMember] = useState<MemberWithFund | null>(null);

  // 수정 모달 상태
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberWithFund | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleViewMember = (member: MemberWithFund) => {
    setViewingMember(member);
    setIsViewModalOpen(true);
  };

  const handleEditMember = (member: MemberWithFund) => {
    setEditingMember(member);
    setIsEditModalOpen(true);
  };

  const handleUpdateSuccess = () => {
    // 페이지 새로고침으로 업데이트된 데이터 반영
    window.location.reload();
  };

  return (
    <div className="flex items-center space-x-2 ml-4">
      <Button
        variant="outline"
        size="sm"
        onClick={e => {
          e.stopPropagation();
          handleViewMember(member);
        }}
      >
        <Eye className="h-4 w-4 mr-1" />
        상세
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={e => {
          e.stopPropagation();
          handleEditMember(member);
        }}
      >
        <Edit className="h-4 w-4 mr-1" />
        수정
      </Button>

      {/* 상세 보기 모달 */}
      <ViewMemberModal
        isOpen={isViewModalOpen}
        member={viewingMember}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewingMember(null);
        }}
        showInvestmentInfo={mode === 'fund_members'}
      />

      {/* 수정 모달 */}
      <EditMemberModal
        isOpen={isEditModalOpen}
        member={editingMember}
        isUpdating={isUpdating}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingMember(null);
        }}
        onUpdate={handleUpdateSuccess}
        showInvestmentInfo={mode === 'fund_members'}
      />
    </div>
  );
}
