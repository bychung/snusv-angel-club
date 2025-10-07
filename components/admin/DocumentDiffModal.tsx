'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FundDocument } from '@/types/database';
import { AlertCircle, GitCompare, Loader2, Minus, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

interface DocumentDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  fundId: string;
  documentType: string;
  versions: FundDocument[];
  defaultFromId?: string; // 비교 시작 버전
  defaultToId?: string; // 비교 대상 버전 (보통 최신)
}

interface DocumentChange {
  path: string;
  type: 'added' | 'removed' | 'modified';
  oldValue?: string;
  newValue?: string;
  displayPath?: string;
}

interface DocumentDiff {
  fromVersion: number;
  toVersion: number;
  changes: DocumentChange[];
  summary: {
    added: number;
    removed: number;
    modified: number;
  };
}

export default function DocumentDiffModal({
  isOpen,
  onClose,
  fundId,
  documentType,
  versions,
  defaultFromId,
  defaultToId,
}: DocumentDiffModalProps) {
  const [fromId, setFromId] = useState<string>(defaultFromId || '');
  const [toId, setToId] = useState<string>(defaultToId || '');
  const [diff, setDiff] = useState<DocumentDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 모달이 열릴 때 또는 defaultFromId/defaultToId가 변경될 때 설정
  useEffect(() => {
    if (isOpen) {
      // defaultFromId가 주어진 경우 사용, 없으면 두 번째 버전
      if (defaultFromId) {
        setFromId(defaultFromId);
      } else if (versions.length >= 2) {
        setFromId(versions[1].id);
      }

      // defaultToId가 주어진 경우 사용, 없으면 첫 번째 버전(최신)
      if (defaultToId) {
        setToId(defaultToId);
      } else if (versions.length >= 1) {
        setToId(versions[0].id);
      }
    } else {
      // 모달이 닫힐 때 모든 state 초기화
      setFromId('');
      setToId('');
      setDiff(null);
      setError(null);
      setLoading(false);
    }
  }, [isOpen, defaultFromId, defaultToId, versions]);

  // fromId 또는 toId가 변경되면 자동으로 diff 조회
  useEffect(() => {
    if (isOpen && fromId && toId && fromId !== toId) {
      // 새로운 비교를 시작하기 전에 이전 diff 결과 초기화
      setDiff(null);
      fetchDiff();
    }
  }, [fromId, toId, isOpen]);

  const fetchDiff = async () => {
    if (!fromId || !toId || fromId === toId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/admin/funds/${fundId}/generated-documents/${documentType}/diff?from=${fromId}&to=${toId}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '문서 비교 실패');
      }

      const data = await response.json();
      setDiff(data);
    } catch (err) {
      console.error('Diff 조회 실패:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  };

  const getVersionLabel = (doc: FundDocument) => {
    return `v${doc.version_number} (템플릿 ${doc.template_version})`;
  };

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'added':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'removed':
        return <Minus className="h-4 w-4 text-red-600" />;
      case 'modified':
        return <GitCompare className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getChangeBgColor = (type: string) => {
    switch (type) {
      case 'added':
        return 'bg-green-50 border-green-200';
      case 'removed':
        return 'bg-red-50 border-red-200';
      case 'modified':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getChangeTextColor = (type: string) => {
    switch (type) {
      case 'added':
        return 'text-green-700';
      case 'removed':
        return 'text-red-700';
      case 'modified':
        return 'text-yellow-700';
      default:
        return 'text-gray-700';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            문서 버전 비교
          </DialogTitle>
          <DialogDescription>
            두 버전 간의 변경사항을 확인할 수 있습니다
          </DialogDescription>
        </DialogHeader>

        {/* 버전 선택 */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="text-sm font-medium mb-2 block">이전 버전</label>
            <Select value={fromId} onValueChange={setFromId}>
              <SelectTrigger>
                <SelectValue placeholder="버전 선택" />
              </SelectTrigger>
              <SelectContent>
                {versions.map(v => (
                  <SelectItem key={v.id} value={v.id} disabled={v.id === toId}>
                    {getVersionLabel(v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">최신 버전</label>
            <Select value={toId} onValueChange={setToId}>
              <SelectTrigger>
                <SelectValue placeholder="버전 선택" />
              </SelectTrigger>
              <SelectContent>
                {versions.map(v => (
                  <SelectItem
                    key={v.id}
                    value={v.id}
                    disabled={v.id === fromId}
                  >
                    {getVersionLabel(v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 로딩 상태 */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400 mr-2" />
            <span className="text-gray-500">비교 중...</span>
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <div className="flex items-center justify-center py-8 text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        )}

        {/* Diff 결과 */}
        {!loading && !error && diff && (
          <div className="space-y-4 mt-4">
            {/* 요약 정보 */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-green-600" />
                <span className="text-sm">
                  <strong>{diff.summary.added}</strong>개 추가
                </span>
              </div>
              <div className="flex items-center gap-2">
                <GitCompare className="h-4 w-4 text-yellow-600" />
                <span className="text-sm">
                  <strong>{diff.summary.modified}</strong>개 수정
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Minus className="h-4 w-4 text-red-600" />
                <span className="text-sm">
                  <strong>{diff.summary.removed}</strong>개 삭제
                </span>
              </div>
            </div>

            {/* 변경사항 목록 */}
            {diff.changes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                변경사항이 없습니다
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">
                  변경 내역
                </h4>
                {diff.changes.map((change, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border ${getChangeBgColor(
                      change.type
                    )}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {getChangeIcon(change.type)}
                      <span
                        className={`font-semibold ${getChangeTextColor(
                          change.type
                        )}`}
                      >
                        {change.displayPath || change.path}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${getChangeTextColor(change.type)}`}
                      >
                        {change.type === 'added' && '추가'}
                        {change.type === 'removed' && '삭제'}
                        {change.type === 'modified' && '수정'}
                      </Badge>
                    </div>

                    <div className="text-sm space-y-1 ml-6">
                      {change.type === 'modified' && (
                        <>
                          <div className="text-red-600">
                            <span className="font-mono">-</span>{' '}
                            {change.oldValue}
                          </div>
                          <div className="text-green-600">
                            <span className="font-mono">+</span>{' '}
                            {change.newValue}
                          </div>
                        </>
                      )}

                      {change.type === 'added' && (
                        <div className="text-green-600">
                          <span className="font-mono">+</span> {change.newValue}
                        </div>
                      )}

                      {change.type === 'removed' && (
                        <div className="text-red-600">
                          <span className="font-mono">-</span> {change.oldValue}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 닫기 버튼 */}
        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
