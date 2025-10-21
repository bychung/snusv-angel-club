'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { DocumentTemplate } from '@/types/database';
import { CheckCircle2, Circle, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TemplateVersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  fundId: string;
  fundName: string;
  documentType: string;
  onVersionActivate?: () => void;
  onGenerateWithVersion?: (templateId: string) => void;
}

export function TemplateVersionHistoryModal({
  isOpen,
  onClose,
  fundId,
  fundName,
  documentType,
  onVersionActivate,
  onGenerateWithVersion,
}: TemplateVersionHistoryModalProps) {
  const [versions, setVersions] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadVersions();
    }
  }, [isOpen, fundId, documentType]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/funds/${fundId}/templates/${documentType}/versions`
      );

      if (!response.ok) {
        throw new Error('버전 목록을 불러오는데 실패했습니다');
      }

      const data = await response.json();
      setVersions(data.versions || []);
    } catch (error) {
      console.error('버전 목록 조회 실패:', error);
      alert(
        error instanceof Error
          ? error.message
          : '버전 목록을 불러오는데 실패했습니다'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (templateId: string, version: string) => {
    if (!confirm(`v${version}을 활성 버전으로 설정하시겠습니까?`)) {
      return;
    }

    setActivating(templateId);
    try {
      const response = await fetch(
        `/api/admin/funds/${fundId}/templates/${documentType}/activate`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ templateId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '템플릿 활성화에 실패했습니다');
      }

      alert(`v${version}이 활성화되었습니다.`);
      await loadVersions();
      onVersionActivate?.();
    } catch (error) {
      console.error('템플릿 활성화 실패:', error);
      alert(
        error instanceof Error ? error.message : '템플릿 활성화에 실패했습니다'
      );
    } finally {
      setActivating(null);
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'lpa':
        return '조합 규약';
      case 'plan':
        return '결성계획서';
      default:
        return type.toUpperCase();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            템플릿 버전 히스토리 - {getDocumentTypeLabel(documentType)} (
            {fundName})
          </DialogTitle>
          <p className="text-sm text-gray-500">
            총 {versions.length}개의 버전이 있습니다
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-gray-500">로딩 중...</p>
          </div>
        ) : versions.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center text-gray-500">
              <p>아직 생성된 버전이 없습니다</p>
              <p className="text-sm mt-2">
                템플릿을 수정하면 자동으로 새 버전이 생성됩니다
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="space-y-3 p-1">
              {versions.map(version => (
                <div
                  key={version.id}
                  className={`border rounded-lg p-4 ${
                    version.is_active ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* 상태 아이콘 */}
                    <div className="flex-shrink-0 mt-1">
                      {version.is_active ? (
                        <CheckCircle2 className="h-6 w-6 text-blue-600" />
                      ) : (
                        <Circle className="h-6 w-6 text-gray-400" />
                      )}
                    </div>

                    {/* 버전 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-lg">
                          v{version.version}
                        </span>
                        {version.is_active && (
                          <Badge className="bg-blue-600">활성</Badge>
                        )}
                      </div>

                      {version.description && (
                        <p className="text-sm text-gray-700 mb-2">
                          {version.description}
                        </p>
                      )}

                      <div className="text-xs text-gray-500">
                        생성일:{' '}
                        {new Date(version.created_at).toLocaleString('ko-KR')}
                      </div>

                      <div className="text-xs text-gray-500">
                        생성자:{' '}
                        {(() => {
                          const profile = (version as any).created_by_profile;
                          if (profile) {
                            return `${profile.name} (${profile.email})`;
                          }
                          return '알 수 없음';
                        })()}
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleActivate(version.id, version.version)
                        }
                        disabled={
                          version.is_active || activating === version.id
                        }
                      >
                        {activating === version.id ? '활성화 중...' : '활성화'}
                      </Button>

                      {onGenerateWithVersion && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onGenerateWithVersion(version.id)}
                        >
                          <FileText className="h-4 w-4 mr-1" />이 버전으로 생성
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="border-t pt-4">
          <div className="text-sm text-gray-600 space-y-1">
            <p>💡 활성화하면 앞으로 생성되는 규약에 해당 버전이 적용됩니다.</p>
            <p>💡 이전 버전으로도 일회성 규약 생성이 가능합니다.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
