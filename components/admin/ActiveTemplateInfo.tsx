'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import type { DocumentTemplate } from '@/types/database';
import { CheckCircle2, Edit, Eye, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TemplateEditModal } from './TemplateEditModal';
import { TemplatePreviewModal } from './TemplateEditor/TemplatePreviewModal';

interface ActiveTemplateInfoProps {
  documentType: string;
  refreshTrigger?: number;
}

export default function ActiveTemplateInfo({
  documentType,
  refreshTrigger = 0,
}: ActiveTemplateInfoProps) {
  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // authStore에서 권한 가져오기
  const { isSystemAdminUser } = useAuthStore();

  useEffect(() => {
    const fetchActiveTemplate = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/admin/templates/types/${documentType}/active`
        );

        if (response.ok) {
          const data = await response.json();
          setTemplate(data.template);
        } else if (response.status === 404) {
          setTemplate(null);
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || '활성 템플릿 조회 실패');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류');
      } finally {
        setLoading(false);
      }
    };

    fetchActiveTemplate();
  }, [documentType, refreshTrigger]);

  if (loading) {
    return (
      <div className="rounded-lg border bg-blue-50 border-blue-200 p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
          <span className="text-sm font-medium text-blue-900">
            활성 템플릿 조회 중...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border bg-red-50 border-red-200 p-4">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full bg-red-500" />
          <div>
            <span className="text-sm font-medium text-red-900">
              템플릿 조회 오류
            </span>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="rounded-lg border bg-yellow-50 border-yellow-200 p-4">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full bg-yellow-500" />
          <div>
            <span className="text-sm font-medium text-yellow-900">
              활성 템플릿 없음
            </span>
            <p className="text-xs text-yellow-700 mt-1">
              {documentType.toUpperCase()} 타입의 활성 템플릿이 없습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="rounded-lg border bg-blue-50 border-blue-200 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-900">
                현재 활성 템플릿
              </span>
              <Badge className="bg-blue-600">v{template.version}</Badge>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              {template.description || '설명 없음'}
            </p>
            <p className="text-xs text-blue-600 mt-2">
              생성일: {formatDate(template.created_at)}
              {isSystemAdminUser && template.created_by && (
                <span> · ID: {template.created_by}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreviewModalOpen(true)}
            className="border-blue-300 hover:bg-blue-100"
          >
            <Eye className="h-4 w-4 mr-1" />
            상세보기
          </Button>

          {/* SYSTEM_ADMIN만 수정 버튼 표시 */}
          {isSystemAdminUser && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="border-blue-300 hover:bg-blue-100"
            >
              <Edit className="h-4 w-4 mr-1" />
              수정
            </Button>
          )}
        </div>
      </div>

      {/* 템플릿 상세보기 모달 */}
      {template && (
        <TemplatePreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          templateContent={template.content}
          templateType={template.type}
          // originalContent를 전달하지 않으면 변경사항이 없는 것으로 표시됨
        />
      )}

      {/* 템플릿 수정 모달 */}
      {/* SYSTEM_ADMIN만 표시 */}
      {template && isSystemAdminUser && (
        <TemplateEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          template={template}
          onSave={() => {
            // 템플릿이 저장되면 다시 조회
            setIsEditModalOpen(false);
            // refreshTrigger를 변경하여 재조회 (부모 컴포넌트에서 관리)
            window.location.reload(); // 임시 방편
          }}
        />
      )}
    </div>
  );
}
