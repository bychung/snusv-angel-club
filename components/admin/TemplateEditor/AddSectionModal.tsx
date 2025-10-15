'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AddSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    position: 'before' | 'after' | 'child',
    title: string,
    text: string
  ) => void;
  currentSectionLabel?: string;
  allowChild?: boolean; // 하위 항목 추가 허용 여부
  initialPosition?: 'before' | 'after' | 'child'; // 초기 선택 위치
}

export function AddSectionModal({
  isOpen,
  onClose,
  onConfirm,
  currentSectionLabel = '현재 항목',
  allowChild = true,
  initialPosition = 'after',
}: AddSectionModalProps) {
  const [position, setPosition] = useState<'before' | 'after' | 'child'>(
    initialPosition
  );
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');

  const handleConfirm = () => {
    if (!title.trim() && !text.trim()) {
      alert('제목 또는 내용을 입력해주세요.');
      return;
    }

    onConfirm(position, title.trim(), text.trim());

    // 초기화
    setPosition(initialPosition);
    setTitle('');
    setText('');
  };

  const handleClose = () => {
    // 초기화
    setPosition(initialPosition);
    setTitle('');
    setText('');
    onClose();
  };

  // isOpen이나 initialPosition이 바뀌면 position 업데이트
  useEffect(() => {
    if (isOpen) {
      setPosition(initialPosition);
    }
  }, [isOpen, initialPosition]);

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />새 항목 추가
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 추가 위치 선택 */}
          <div className="space-y-3">
            <Label>추가 위치</Label>
            <RadioGroup
              value={position}
              onValueChange={value =>
                setPosition(value as 'before' | 'after' | 'child')
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="before" id="before" />
                <Label htmlFor="before" className="font-normal cursor-pointer">
                  <span className="font-medium">{currentSectionLabel}</span>{' '}
                  위에 추가
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="after" id="after" />
                <Label htmlFor="after" className="font-normal cursor-pointer">
                  <span className="font-medium">{currentSectionLabel}</span>{' '}
                  아래에 추가
                </Label>
              </div>
              {allowChild && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="child" id="child" />
                  <Label htmlFor="child" className="font-normal cursor-pointer">
                    <span className="font-medium">{currentSectionLabel}</span>의
                    하위 항목으로 추가
                  </Label>
                </div>
              )}
            </RadioGroup>
          </div>

          {/* 제목 입력 */}
          <div className="space-y-2">
            <Label htmlFor="title">제목 (선택사항)</Label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="예: 조합의 목적"
            />
          </div>

          {/* 내용 입력 */}
          <div className="space-y-2">
            <Label htmlFor="text">내용 (선택사항)</Label>
            <Textarea
              id="text"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="항목의 내용을 입력하세요..."
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              💡 변수는 {'{{변수명}}'} 형식으로 입력하세요. 예: {'{{fundName}}'}
            </p>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            취소
          </Button>
          <Button onClick={handleConfirm}>
            <Plus className="h-4 w-4 mr-1" />
            추가하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
