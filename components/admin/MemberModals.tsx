'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MemberWithFund } from '@/lib/admin/members';
import { useAuthStore } from '@/store/authStore';
import { Edit, Eye, Trash2 } from 'lucide-react';
import { useState } from 'react';
import EditMemberModal from './EditMemberModal';
import ViewMemberModal from './ViewMemberModal';

interface MemberModalsProps {
  member: MemberWithFund;
  mode: 'users' | 'fund_members';
}

export default function MemberModals({ member, mode }: MemberModalsProps) {
  // authStore에서 시스템 관리자 여부 가져오기
  const isSystemAdmin = useAuthStore(state => state.isSystemAdminUser);

  // 상세 보기 모달 상태
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingMember, setViewingMember] = useState<MemberWithFund | null>(
    null
  );

  // 수정 모달 상태
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberWithFund | null>(
    null
  );
  const [isUpdating, setIsUpdating] = useState(false);

  // 삭제 확인 다이얼로그 상태
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingMember, setDeletingMember] = useState<MemberWithFund | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteType, setDeleteType] = useState<'soft' | 'hard'>('soft');

  const handleViewMember = (member: MemberWithFund) => {
    setViewingMember(member);
    setIsViewModalOpen(true);
  };

  const handleEditMember = (member: MemberWithFund) => {
    setEditingMember(member);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (member: MemberWithFund) => {
    setDeletingMember(member);
    setDeleteType('soft'); // 기본값은 soft delete
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingMember || !deletingMember.fund_members?.[0]) {
      return;
    }

    setIsDeleting(true);
    try {
      const fundId = deletingMember.fund_members[0].fund_id;
      const url = `/api/admin/funds/${fundId}/members/${deletingMember.id}?type=${deleteType}`;
      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '조합원 삭제에 실패했습니다');
      }

      const result = await response.json();
      alert(result.message);

      // 페이지 새로고침으로 업데이트된 데이터 반영
      window.location.reload();
    } catch (error) {
      console.error('조합원 삭제 실패:', error);
      alert(
        error instanceof Error ? error.message : '조합원 삭제에 실패했습니다'
      );
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setDeletingMember(null);
    }
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

      {/* fund_members 모드에서만 삭제 버튼 표시 */}
      {mode === 'fund_members' && (
        <Button
          variant="outline"
          size="sm"
          onClick={e => {
            e.stopPropagation();
            handleDeleteClick(member);
          }}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          삭제
        </Button>
      )}

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

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>조합원 삭제</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  <span className="font-semibold">{deletingMember?.name}</span>{' '}
                  님을 이 펀드의 조합원 목록에서 삭제하시겠습니까?
                </p>

                {isSystemAdmin && (
                  <RadioGroup
                    value={deleteType}
                    onValueChange={value =>
                      setDeleteType(value as 'soft' | 'hard')
                    }
                    disabled={isDeleting}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="soft" id="soft" />
                      <Label htmlFor="soft" className="cursor-pointer">
                        <div className="font-medium">소프트 삭제 (권장)</div>
                        <div className="text-sm text-gray-500">
                          조합원 목록에서 숨김 처리합니다. 복구 가능합니다.
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="hard" id="hard" />
                      <Label htmlFor="hard" className="cursor-pointer">
                        <div className="font-medium text-red-600">
                          영구 삭제 (주의)
                        </div>
                        <div className="text-sm text-red-500">
                          데이터베이스에서 완전히 삭제합니다. 복구 불가능합니다.
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                )}

                {!isSystemAdmin && (
                  <p className="text-sm text-gray-500">
                    이 작업은 조합원 목록에서만 삭제되며, 사용자 계정은
                    유지됩니다.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className={
                deleteType === 'hard'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-orange-600 hover:bg-orange-700'
              }
            >
              {isDeleting
                ? '삭제 중...'
                : deleteType === 'hard'
                ? '영구 삭제'
                : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
