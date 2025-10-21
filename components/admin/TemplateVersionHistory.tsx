'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import type { DocumentTemplate } from '@/types/database';
import {
  ChevronDown,
  Eye,
  GitCompare,
  History,
  Loader2,
  MoreVertical,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import TemplateDiffModal from './TemplateDiffModal';
import { TemplatePreviewModal } from './TemplateEditor/TemplatePreviewModal';

interface TemplateVersionHistoryProps {
  documentType: string;
  fundId?: string; // 펀드별 템플릿 조회 시 전달, 없으면 글로벌 템플릿
  onTemplateActivated?: () => void; // 템플릿 활성화 후 상위 컴포넌트 새로고침용
}

export default function TemplateVersionHistory({
  documentType,
  fundId,
  onTemplateActivated,
}: TemplateVersionHistoryProps) {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // 미리보기 모달 상태
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<DocumentTemplate | null>(null);

  // Diff 모달 상태
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [selectedForDiff, setSelectedForDiff] = useState<string | null>(null);

  // authStore에서 권한 가져오기
  const { isSystemAdminUser } = useAuthStore();

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      // fundId가 있으면 펀드별 템플릿, 없으면 글로벌 템플릿 조회
      const apiUrl = fundId
        ? `/api/admin/funds/${fundId}/templates/${documentType}/versions`
        : `/api/admin/templates/types/${documentType}`;

      const response = await fetch(apiUrl);

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || data.versions || []);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || '템플릿 목록 조회 실패');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 템플릿 목록 자동 로드
  useEffect(() => {
    fetchTemplates();
  }, [documentType, fundId]); // documentType이나 fundId가 변경되면 재로드

  const handleActivate = async (templateId: string) => {
    try {
      setActivating(templateId);

      // fundId가 있으면 펀드별 활성화 API, 없으면 글로벌 활성화 API
      const apiUrl = fundId
        ? `/api/admin/funds/${fundId}/templates/${documentType}/activate`
        : `/api/admin/templates/${templateId}/activate`;

      const body = fundId
        ? { templateId } // 펀드별 API는 body에 templateId 전달
        : undefined; // 글로벌 API는 body 없음

      const response = await fetch(apiUrl, {
        method: fundId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '템플릿 활성화 실패');
      }

      // 목록 새로고침
      await fetchTemplates();

      // 상위 컴포넌트에 알림 (ActiveTemplateInfo 새로고침용)
      if (onTemplateActivated) {
        onTemplateActivated();
      }

      alert('템플릿이 활성화되었습니다.');
    } catch (err) {
      console.error('템플릿 활성화 오류:', err);
      alert(
        err instanceof Error
          ? err.message
          : '템플릿 활성화 중 오류가 발생했습니다.'
      );
    } finally {
      setActivating(null);
    }
  };

  const handleViewTemplate = async (templateId: string) => {
    try {
      // 템플릿 상세 조회
      const response = await fetch(`/api/admin/templates/${templateId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '템플릿 조회 실패');
      }

      const data = await response.json();
      setSelectedTemplate(data.template);
      setPreviewModalOpen(true);
    } catch (err) {
      console.error('템플릿 조회 오류:', err);
      alert(
        err instanceof Error
          ? err.message
          : '템플릿을 조회하는 중 오류가 발생했습니다.'
      );
    }
  };

  const handleCompare = (templateId: string) => {
    // 현재 템플릿의 인덱스 찾기
    const currentIndex = templates.findIndex(t => t.id === templateId);

    if (currentIndex === -1) {
      alert('템플릿을 찾을 수 없습니다.');
      return;
    }

    // 직전 버전 찾기 (배열은 최신순이므로 다음 인덱스)
    const previousTemplate = templates[currentIndex + 1];

    if (!previousTemplate) {
      alert('비교할 이전 버전이 없습니다.');
      return;
    }

    // Diff 모달 열기 (이전 버전 vs 현재 버전)
    setSelectedForDiff(templateId);
    setDiffModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // SYSTEM_ADMIN이 아니면 아예 렌더링하지 않음
  if (!isSystemAdminUser) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="font-semibold">템플릿 버전 히스토리</span>
            <Badge variant="secondary">
              {loading ? '조회 중...' : `${templates.length}개 버전`}
            </Badge>
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin mr-2" />
            <span className="text-sm text-gray-500">
              템플릿 히스토리 조회 중...
            </span>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600 text-sm">
            템플릿 히스토리를 불러올 수 없습니다: {error}
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            등록된 템플릿이 없습니다
          </div>
        ) : (
          <>
            {templates.map((template, index) => (
              <Card
                key={template.id}
                className={cn(
                  'transition-all',
                  template.is_active && 'border-blue-500 bg-blue-50'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        {/* 타임라인 선 */}
                        {index < templates.length - 1 && (
                          <div className="absolute left-2 top-6 bottom-0 w-px bg-gray-200" />
                        )}
                        <div
                          className={cn(
                            'h-4 w-4 rounded-full border-2',
                            template.is_active
                              ? 'bg-blue-600 border-blue-600'
                              : 'bg-white border-gray-300'
                          )}
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            v{template.version}
                          </span>
                          {template.is_active && (
                            <Badge className="bg-blue-600">활성</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {template.description || '설명 없음'}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatDate(template.created_at)}
                          {isSystemAdminUser &&
                            (() => {
                              const profile = (template as any)
                                .created_by_profile;
                              if (profile) {
                                return (
                                  <span>
                                    {' '}
                                    · 생성자: {profile.name} ({profile.email})
                                  </span>
                                );
                              }
                              return null;
                            })()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* SYSTEM_ADMIN만 활성화 버튼 표시 */}
                      {!template.is_active && isSystemAdminUser && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivate(template.id)}
                          disabled={activating === template.id}
                        >
                          {activating === template.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              활성화 중...
                            </>
                          ) : (
                            '활성화'
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewTemplate(template.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleCompare(template.id)}
                          >
                            <GitCompare className="h-4 w-4 mr-2" />
                            활성 버전과 비교
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </CollapsibleContent>

      {/* 템플릿 미리보기 모달 */}
      {selectedTemplate && (
        <TemplatePreviewModal
          isOpen={previewModalOpen}
          onClose={() => {
            setPreviewModalOpen(false);
            setSelectedTemplate(null);
          }}
          templateContent={selectedTemplate.content}
          templateType={selectedTemplate.type}
        />
      )}

      {/* 템플릿 Diff 모달 */}
      <TemplateDiffModal
        isOpen={diffModalOpen}
        onClose={() => {
          setDiffModalOpen(false);
          setSelectedForDiff(null);
        }}
        templates={templates}
        defaultFromId={
          selectedForDiff
            ? templates[templates.findIndex(t => t.id === selectedForDiff) + 1]
                ?.id
            : undefined
        }
        defaultToId={selectedForDiff || undefined}
      />
    </Collapsible>
  );
}
