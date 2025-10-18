'use client';

import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface DocumentEditorActionsProps {
  // 버튼 액션
  onPreview: () => void;
  onCancel: () => void;
  onPrevious?: () => void;

  // 표시 여부
  showPrevious?: boolean;
  showPreview?: boolean;

  // 상태
  isLoading: boolean;
  readOnly?: boolean;
}

/**
 * 문서 편집기 하단 버튼 영역 (공통 컴포넌트)
 */
export default function DocumentEditorActions({
  onPreview,
  onCancel,
  onPrevious,
  showPrevious = false,
  showPreview = true,
  isLoading,
  readOnly = false,
}: DocumentEditorActionsProps) {
  return (
    <div className="flex justify-end gap-2">
      {showPrevious && onPrevious && (
        <Button variant="outline" onClick={onPrevious} disabled={isLoading}>
          이전
        </Button>
      )}
      <Button variant="outline" onClick={onCancel} disabled={isLoading}>
        취소
      </Button>
      {!readOnly && showPreview && (
        <Button onClick={onPreview} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              미리보기 생성 중...
            </>
          ) : (
            '미리보기'
          )}
        </Button>
      )}
    </div>
  );
}
