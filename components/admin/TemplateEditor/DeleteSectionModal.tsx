'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sectionLabel: string;
  childCount?: number; // 하위 항목 개수
}

export function DeleteSectionModal({
  isOpen,
  onClose,
  onConfirm,
  sectionLabel,
  childCount = 0,
}: DeleteSectionModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            항목 삭제 확인
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-base">
            <span className="font-semibold">{sectionLabel}</span>을(를)
            삭제하시겠습니까?
          </p>

          {childCount > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-sm text-yellow-800">
                  <p className="font-medium">다음 사항에 유의하세요:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>
                      하위 항목 <strong>{childCount}개</strong>도 함께
                      삭제됩니다
                    </li>
                    <li>후속 항목들의 번호가 자동으로 변경됩니다</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-gray-600">
            이 작업은 저장하기 전까지 초기화 버튼으로 되돌릴 수 있습니다.
          </p>
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            <Trash2 className="h-4 w-4 mr-1" />
            삭제하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
