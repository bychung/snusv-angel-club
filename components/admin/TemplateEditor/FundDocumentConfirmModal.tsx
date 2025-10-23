'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { TemplateChange } from '@/lib/admin/template-versioning';
import { AlertCircle, FileText, Loader2, Save } from 'lucide-react';
import { useState } from 'react';

interface FundDocumentConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  changes: TemplateChange[];
  fundName?: string;
  documentType?: string;
}

export function FundDocumentConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  changes,
  fundName,
  documentType,
}: FundDocumentConfirmModalProps) {
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    try {
      setSaving(true);
      await onConfirm();
    } catch (error) {
      // 에러는 상위 컴포넌트에서 처리
      console.error('저장 실패:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-[70vw] w-[70vw] sm:max-w-[1600px] max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-600" />
            <DialogTitle>
              펀드 규약 변경 내역 확인{fundName && ` - ${fundName}`}
            </DialogTitle>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <div className="space-y-4 pt-4 pr-4">
            {/* 변경 요약 */}
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-800">
                <div className="flex items-center gap-2">
                  <span>
                    <strong>{changes.length}개</strong>의 변경사항이 있습니다.
                  </span>
                </div>
              </AlertDescription>
            </Alert>

            {/* 변경사항 상세 */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">변경 내역</h4>

              {/* 변경사항 목록 */}
              {changes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  변경사항이 없습니다
                </div>
              ) : (
                <div className="space-y-4">
                  {changes.map((change, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      {/* 변경 위치 헤더 */}
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                        <div className="text-sm font-medium text-gray-700">
                          {change.displayPath || '알 수 없음'}
                        </div>
                      </div>

                      {/* 좌우 2단 레이아웃 */}
                      <div className="grid grid-cols-2 divide-x divide-gray-200">
                        {/* 기존 (왼쪽) */}
                        <div className="p-4">
                          <div className="text-xs font-medium text-gray-500 mb-2">
                            기존
                          </div>
                          <div className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed bg-gray-50 p-3 rounded border border-gray-200 min-h-[60px]">
                            {change.oldValue || '(없음)'}
                          </div>
                        </div>

                        {/* 수정 (오른쪽) */}
                        <div className="p-4">
                          <div className="text-xs font-medium text-blue-600 mb-2">
                            수정
                          </div>
                          <div className="text-sm text-gray-900 whitespace-pre-wrap break-words leading-relaxed bg-blue-50 p-3 rounded border border-blue-200 min-h-[60px]">
                            {change.newValue || '(없음)'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* 버튼 */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            취소
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                저장
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
