'use client';

/**
 * 조합원 총회 템플릿 버전 히스토리 모달
 * 기존 TemplateVersionHistoryModal과 유사하지만 조합원 총회 전용
 */

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { DocumentTemplate } from '@/types/database';
import {
  AlertCircle,
  CheckCircle,
  Eye,
  GitCompare,
  Loader2,
  RotateCcw,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface AssemblyTemplateVersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateType: string;
  onRollback?: () => void;
}

export function AssemblyTemplateVersionHistoryModal({
  isOpen,
  onClose,
  templateType,
  onRollback,
}: AssemblyTemplateVersionHistoryModalProps) {
  const [versions, setVersions] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activatingVersion, setActivatingVersion] = useState<string | null>(
    null
  );
  const [deletingVersion, setDeletingVersion] = useState<string | null>(null);
  const [previewVersion, setPreviewVersion] = useState<DocumentTemplate | null>(
    null
  );
  const [compareVersions, setCompareVersions] = useState<{
    from: DocumentTemplate;
    to: DocumentTemplate;
  } | null>(null);
  const [diffData, setDiffData] = useState<{
    fromVersion: string;
    toVersion: string;
    changes: Array<{
      path: string;
      type: 'added' | 'removed' | 'modified';
      oldValue?: string;
      newValue?: string;
      displayPath?: string;
    }>;
    summary: {
      added: number;
      removed: number;
      modified: number;
    };
  } | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);

  useEffect(() => {
    if (isOpen && templateType) {
      fetchVersions();
    }
  }, [isOpen, templateType]);

  const fetchVersions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/templates/types/${templateType}/versions`
      );

      if (!response.ok) {
        throw new Error('버전 히스토리를 불러올 수 없습니다.');
      }

      const data = await response.json();
      setVersions(data.versions || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (versionId: string) => {
    if (
      !confirm('이 버전으로 롤백하시겠습니까? 현재 활성 버전은 비활성화됩니다.')
    ) {
      return;
    }

    setActivatingVersion(versionId);
    try {
      const response = await fetch(
        `/api/admin/templates/${versionId}/activate`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        throw new Error('버전 활성화에 실패했습니다.');
      }

      alert('버전이 성공적으로 활성화되었습니다.');
      await fetchVersions(); // 목록 새로고침
      if (onRollback) {
        onRollback();
      }
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : '버전 활성화 중 오류가 발생했습니다.'
      );
    } finally {
      setActivatingVersion(null);
    }
  };

  const handleDelete = async (versionId: string, isActive: boolean) => {
    const confirmMessage = isActive
      ? '현재 활성화된 버전을 삭제하시겠습니까? 삭제 후 이전 버전이 자동으로 활성화됩니다.'
      : '이 버전을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.';

    if (!confirm(confirmMessage)) {
      return;
    }

    setDeletingVersion(versionId);
    try {
      const response = await fetch(`/api/admin/templates/${versionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '버전 삭제에 실패했습니다.');
      }

      const data = await response.json();

      if (data.activatedVersion) {
        alert(
          `버전이 삭제되었습니다. v${data.activatedVersion}이(가) 자동으로 활성화되었습니다.`
        );
      } else {
        alert('버전이 삭제되었습니다.');
      }

      await fetchVersions(); // 목록 새로고침
      if (onRollback) {
        onRollback();
      }
    } catch (err) {
      alert(
        err instanceof Error ? err.message : '버전 삭제 중 오류가 발생했습니다.'
      );
    } finally {
      setDeletingVersion(null);
    }
  };

  const handlePreview = (version: DocumentTemplate) => {
    setPreviewVersion(version);
  };

  const handleCompare = async (version: DocumentTemplate) => {
    // 현재 활성 버전과 비교
    const activeVersion = versions.find(v => v.is_active);
    if (!activeVersion || activeVersion.id === version.id) {
      alert('비교할 다른 버전이 없습니다.');
      return;
    }

    setCompareVersions({
      from: version,
      to: activeVersion,
    });

    // Diff 데이터 가져오기
    setLoadingDiff(true);
    setDiffData(null);

    try {
      const response = await fetch(
        `/api/admin/templates/diff?from=${version.id}&to=${activeVersion.id}`
      );

      if (!response.ok) {
        throw new Error('변경사항을 불러올 수 없습니다.');
      }

      const data = await response.json();
      setDiffData(data);
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : '변경사항 불러오기 중 오류가 발생했습니다.'
      );
      setCompareVersions(null);
    } finally {
      setLoadingDiff(false);
    }
  };

  const getTemplateDisplayName = (type: string): string => {
    const names: Record<string, string> = {
      formation_agenda: '결성총회 의안',
      formation_official_letter: '공문',
      formation_minutes: '회의록',
    };
    return names[type] || type;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              버전 히스토리: {getTemplateDisplayName(templateType)}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                {versions.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    버전 히스토리가 없습니다.
                  </div>
                ) : (
                  versions.map((version, index) => (
                    <div
                      key={version.id}
                      className={`border rounded-lg p-4 relative group ${
                        version.is_active
                          ? 'bg-green-50 border-green-200'
                          : 'bg-white'
                      }`}
                    >
                      {/* 삭제 버튼 - hover 시 우측 상단에 표시 */}
                      <button
                        onClick={() =>
                          handleDelete(version.id, version.is_active)
                        }
                        disabled={!!deletingVersion || !!activatingVersion}
                        className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-md z-10"
                        title="삭제"
                      >
                        {deletingVersion === version.id ? (
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        ) : (
                          <X className="h-2.5 w-2.5" />
                        )}
                      </button>

                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">
                            버전 {version.version}
                          </h3>
                          {version.is_active && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                              <CheckCircle className="h-3 w-3" />
                              현재 활성
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(version.created_at).toLocaleDateString(
                            'ko-KR',
                            {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </div>
                      </div>

                      {version.description && (
                        <p className="text-sm text-gray-700 mb-3">
                          {version.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          생성자:{' '}
                          {(() => {
                            const profile = (version as any).created_by_profile;
                            if (profile) {
                              return `${profile.name} (${profile.email})`;
                            }
                            return '알 수 없음';
                          })()}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreview(version)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            상세 보기
                          </Button>
                          {!version.is_active && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCompare(version)}
                              >
                                <GitCompare className="h-4 w-4 mr-1" />
                                비교
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleActivate(version.id)}
                                disabled={!!activatingVersion}
                              >
                                {activatingVersion === version.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    롤백 중...
                                  </>
                                ) : (
                                  <>
                                    <RotateCcw className="h-4 w-4 mr-1" />이
                                    버전으로 롤백
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {index < versions.length - 1 && (
                        <Separator className="mt-4" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              닫기
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 버전 상세 보기 모달 (중첩) */}
      {previewVersion && (
        <Dialog
          open={!!previewVersion}
          onOpenChange={() => setPreviewVersion(null)}
        >
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>템플릿 상세: v{previewVersion.version}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4 max-w-full">
                <div>
                  <h4 className="font-semibold mb-2">기본 정보</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3 text-sm">
                    <div className="flex gap-4">
                      <span className="text-muted-foreground w-24 flex-shrink-0">
                        버전:
                      </span>
                      <span className="font-medium text-gray-900">
                        {previewVersion.version || 'N/A'}
                      </span>
                    </div>
                    <div className="flex gap-4">
                      <span className="text-muted-foreground w-24 flex-shrink-0">
                        타입:
                      </span>
                      <span className="font-medium text-gray-900">
                        {getTemplateDisplayName(previewVersion.type) ||
                          previewVersion.type ||
                          'N/A'}
                      </span>
                    </div>
                    <div className="flex gap-4">
                      <span className="text-muted-foreground w-24 flex-shrink-0">
                        편집 가능:
                      </span>
                      <span className="font-medium text-gray-900">
                        {previewVersion.editable ? '예' : '아니오'}
                      </span>
                    </div>
                    <div className="flex gap-4">
                      <span className="text-muted-foreground w-24 flex-shrink-0">
                        설명:
                      </span>
                      <span className="font-medium text-gray-900 break-words flex-1">
                        {previewVersion.description || '-'}
                      </span>
                    </div>
                    <div className="flex gap-4">
                      <span className="text-muted-foreground w-24 flex-shrink-0">
                        생성일:
                      </span>
                      <span className="font-medium text-gray-900">
                        {new Date(previewVersion.created_at).toLocaleString(
                          'ko-KR',
                          {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}
                      </span>
                    </div>
                    <div className="flex gap-4">
                      <span className="text-muted-foreground w-24 flex-shrink-0">
                        생성자:
                      </span>
                      <span className="font-medium text-gray-900">
                        {(() => {
                          const profile = (previewVersion as any)
                            .created_by_profile;
                          if (profile) {
                            return `${profile.name} (${profile.email})`;
                          }
                          return '알 수 없음';
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-semibold mb-2">템플릿 내용</h4>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto max-w-full">
                    <pre className="text-xs whitespace-pre-wrap break-words">
                      {JSON.stringify(previewVersion.content, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </ScrollArea>
            <div className="flex justify-end pt-4">
              <Button onClick={() => setPreviewVersion(null)}>닫기</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 버전 비교 모달 (중첩) */}
      {compareVersions && (
        <Dialog
          open={!!compareVersions}
          onOpenChange={() => {
            setCompareVersions(null);
            setDiffData(null);
          }}
        >
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>
                템플릿 비교: v{compareVersions.from.version} → v
                {compareVersions.to.version}
              </DialogTitle>
            </DialogHeader>

            {loadingDiff ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : diffData ? (
              <>
                {/* 요약 정보 */}
                <div className="flex gap-4 mb-4">
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <span className="text-sm font-medium">
                      추가: {diffData.summary.added}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                    <span className="text-sm font-medium">
                      삭제: {diffData.summary.removed}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                    <span className="text-sm font-medium">
                      수정: {diffData.summary.modified}
                    </span>
                  </div>
                </div>

                {/* 변경사항 목록 */}
                <ScrollArea className="max-h-[50vh]">
                  {diffData.changes.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      변경사항이 없습니다.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {diffData.changes.map((change, index) => (
                        <div
                          key={index}
                          className={`border rounded-lg p-4 ${
                            change.type === 'added'
                              ? 'bg-green-50 border-green-200'
                              : change.type === 'removed'
                              ? 'bg-red-50 border-red-200'
                              : 'bg-yellow-50 border-yellow-200'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* 타입 아이콘 */}
                            <div
                              className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                                change.type === 'added'
                                  ? 'bg-green-500'
                                  : change.type === 'removed'
                                  ? 'bg-red-500'
                                  : 'bg-yellow-500'
                              }`}
                            >
                              {change.type === 'added'
                                ? '+'
                                : change.type === 'removed'
                                ? '-'
                                : '~'}
                            </div>

                            {/* 변경 내용 */}
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm mb-1">
                                {change.displayPath || change.path}
                              </div>

                              {change.type === 'modified' && (
                                <div className="space-y-2 text-sm">
                                  <div className="bg-white/50 p-2 rounded border border-red-200">
                                    <div className="text-red-600 font-medium mb-1">
                                      이전:
                                    </div>
                                    <pre className="whitespace-pre-wrap break-words text-xs text-gray-700">
                                      {change.oldValue}
                                    </pre>
                                  </div>
                                  <div className="bg-white/50 p-2 rounded border border-green-200">
                                    <div className="text-green-600 font-medium mb-1">
                                      이후:
                                    </div>
                                    <pre className="whitespace-pre-wrap break-words text-xs text-gray-700">
                                      {change.newValue}
                                    </pre>
                                  </div>
                                </div>
                              )}

                              {change.type === 'added' && (
                                <div className="bg-white/50 p-2 rounded border border-green-200 text-sm">
                                  <pre className="whitespace-pre-wrap break-words text-xs text-gray-700">
                                    {change.newValue}
                                  </pre>
                                </div>
                              )}

                              {change.type === 'removed' && (
                                <div className="bg-white/50 p-2 rounded border border-red-200 text-sm">
                                  <pre className="whitespace-pre-wrap break-words text-xs text-gray-700">
                                    {change.oldValue}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    💡 팁: 왼쪽(빨강)이 이전 버전, 오른쪽(초록)이 현재 활성
                    버전입니다.
                  </AlertDescription>
                </Alert>
              </>
            ) : null}

            <div className="flex justify-end pt-4">
              <Button
                onClick={() => {
                  setCompareVersions(null);
                  setDiffData(null);
                }}
              >
                닫기
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
