'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import type { TemplateChange } from '@/lib/admin/template-versioning';
import { AlertCircle, GitCommit, Loader2, Save } from 'lucide-react';
import { useState } from 'react';

interface TemplateCommitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (commitMessage: string) => Promise<void>;
  nextVersion: string;
  changes: TemplateChange[];
}

export function TemplateCommitModal({
  isOpen,
  onClose,
  onConfirm,
  nextVersion,
  changes,
}: TemplateCommitModalProps) {
  const [commitMessage, setCommitMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    const message = commitMessage.trim();

    if (!message) {
      alert('변경 내용을 입력해주세요.');
      return;
    }

    try {
      setSaving(true);
      await onConfirm(message);
      // 성공 시 모달 닫기 및 초기화
      setCommitMessage('');
    } catch (error) {
      // 에러는 상위 컴포넌트에서 처리
      console.error('저장 실패:', error);
    } finally {
      setSaving(false);
    }
  };

  // 변경 타입별 아이콘 - 제거됨

  // 변경 타입별 배경색 - 제거됨

  // 변경 타입별 텍스트 색상 - 제거됨

  // 변경 타입별 레이블 - 제거됨

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-[70vw] w-[70vw] sm:max-w-[1600px] max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <GitCommit className="h-5 w-5 text-gray-600" />
            <DialogTitle>템플릿 변경 내용 작성</DialogTitle>
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
                  <Badge
                    variant="secondary"
                    className="bg-blue-100 text-blue-700"
                  >
                    v{nextVersion}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>

            {/* 커밋 메시지 입력 */}
            <div className="space-y-2">
              <Label htmlFor="commit-message" className="text-sm font-medium">
                변경 내용 <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="commit-message"
                placeholder="이 템플릿 변경에 대한 설명을 작성해주세요.&#10;&#10;예시:&#10;- 제3조 투자 대상 범위 확대&#10;- 제7조 출자 방법 세부 절차 추가&#10;- 제12조 표기 오류 수정"
                value={commitMessage}
                onChange={e => setCommitMessage(e.target.value)}
                className="min-h-[80px] resize-none"
                disabled={saving}
                autoFocus
              />
              <p className="text-xs text-gray-500">
                변경사항에 대한 설명을 작성해주세요. 이 내용은 버전 이력에
                저장되며, 관리자들에게 노출됩니다.
              </p>
            </div>

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
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={saving || !commitMessage.trim()}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                저장 (v{nextVersion})
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
