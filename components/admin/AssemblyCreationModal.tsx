'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

interface AssemblyCreationModalProps {
  fundId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (assemblyId: string) => void; // assemblyId 반환하도록 변경
}

export default function AssemblyCreationModal({
  fundId,
  isOpen,
  onClose,
  onSuccess,
}: AssemblyCreationModalProps) {
  const [assemblyDate, setAssemblyDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateAssembly = async () => {
    if (!assemblyDate) {
      setError('총회 개최일을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/funds/${fundId}/assemblies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'formation',
          assembly_date: assemblyDate,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '총회 생성에 실패했습니다.');
      }

      const data = await response.json();

      // 상태 초기화
      setAssemblyDate('');
      setError(null);

      // 부모에게 assemblyId 전달
      onSuccess(data.assembly.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // 초기화
    setAssemblyDate('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>총회 생성</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <Label>총회 종류를 선택하세요</Label>
            <div className="mt-2 p-4 border rounded-lg">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="formation"
                  name="assembly-type"
                  checked
                  readOnly
                  className="mr-2"
                />
                <label htmlFor="formation">결성총회</label>
              </div>
              <div className="flex items-center mt-2 opacity-50">
                <input
                  type="radio"
                  id="special"
                  name="assembly-type"
                  disabled
                  className="mr-2"
                />
                <label htmlFor="special">임시총회 (비활성화)</label>
              </div>
              <div className="flex items-center mt-2 opacity-50">
                <input
                  type="radio"
                  id="regular"
                  name="assembly-type"
                  disabled
                  className="mr-2"
                />
                <label htmlFor="regular">정기총회 (비활성화)</label>
              </div>
              <div className="flex items-center mt-2 opacity-50">
                <input
                  type="radio"
                  id="dissolution"
                  name="assembly-type"
                  disabled
                  className="mr-2"
                />
                <label htmlFor="dissolution">해산/청산총회 (비활성화)</label>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="assembly-date">총회 개최일</Label>
            <Input
              id="assembly-date"
              type="date"
              value={assemblyDate}
              onChange={e => setAssemblyDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <Alert>
            <AlertDescription>
              ⓘ 현재는 결성총회만 생성 가능합니다. 추후 다른 총회 유형이 추가될
              예정입니다.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button onClick={handleCreateAssembly} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                '총회 생성'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
