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

interface TemplateVersionHistoryProps {
  documentType: string;
  onTemplateActivated?: () => void; // 템플릿 활성화 후 상위 컴포넌트 새로고침용
}

export default function TemplateVersionHistory({
  documentType,
  onTemplateActivated,
}: TemplateVersionHistoryProps) {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/admin/templates/types/${documentType}`
      );

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
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

  useEffect(() => {
    if (isOpen && templates.length === 0 && !loading && !error) {
      fetchTemplates();
    }
  }, [isOpen, templates.length, loading, error]);

  const handleActivate = async (templateId: string) => {
    try {
      setActivating(templateId);

      const response = await fetch(
        `/api/admin/templates/${templateId}/activate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

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

  const handleViewTemplate = (templateId: string) => {
    // TODO: 템플릿 상세보기 모달
    console.log('템플릿 상세보기:', templateId);
    alert('템플릿 상세보기는 아직 구현되지 않았습니다.');
  };

  const handleCompare = (templateId: string) => {
    // TODO: 활성 버전과 비교 모달
    console.log('활성 버전과 비교:', templateId);
    alert('템플릿 비교 기능은 아직 구현되지 않았습니다.');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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
                          {template.created_by && (
                            <span> · ID: {template.created_by}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!template.is_active && (
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
    </Collapsible>
  );
}
