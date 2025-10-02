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
import type { ActivityItem } from '@/lib/admin/dashboard';

interface DeleteActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: ActivityItem | null;
  onConfirm: () => void;
  isDeleting: boolean;
}

export default function DeleteActivityModal({
  isOpen,
  onClose,
  activity,
  onConfirm,
  isDeleting,
}: DeleteActivityModalProps) {
  if (!activity) return null;

  const getActivityTypeLabel = (type: ActivityItem['type']) => {
    switch (type) {
      case 'signup':
        return '회원가입';
      case 'profile_update':
        return '프로필 수정';
      case 'investment_update':
        return '출자정보 수정';
      case 'fund_application':
        return '출자 신청';
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600">
            활동 내역 삭제
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <div className="font-semibold text-gray-900">
                정말로 이 활동 내역을 삭제하시겠습니까?
              </div>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                <div>
                  <span className="font-medium">활동 유형:</span>{' '}
                  {getActivityTypeLabel(activity.type)}
                </div>
                <div>
                  <span className="font-medium">사용자:</span>{' '}
                  {activity.user_name} ({activity.user_email})
                </div>
                {activity.details && (
                  <div>
                    <span className="font-medium">상세:</span>{' '}
                    {activity.details}
                  </div>
                )}
              </div>
              <div className="text-red-600 font-medium">
                ⚠️ 이 작업은 되돌릴 수 없습니다. 데이터베이스에서 영구적으로
                삭제됩니다.
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
