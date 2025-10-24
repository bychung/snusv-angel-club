'use client';

/**
 * 조합원 총회 문서 템플릿 관리 메인 컴포넌트
 */

import { AssemblyTemplateEditModal } from '@/components/admin/AssemblyTemplateEditModal';
import { AssemblyTemplateVersionHistoryModal } from '@/components/admin/AssemblyTemplateVersionHistoryModal';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertCircle, Edit, Eye, History, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const PDFPreviewModal = dynamic(
  () => import('@/components/admin/PDFPreviewModal'),
  {
    ssr: false,
  }
);

interface Template {
  id: string;
  type: string;
  version: string;
  description: string;
  editable: boolean;
  is_active: boolean;
  created_at: string;
  created_by_profile?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export default function AssemblyTemplateManagement() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 모달 상태
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [versionHistoryTemplate, setVersionHistoryTemplate] =
    useState<Template | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewingTemplate, setPreviewingTemplate] = useState<Template | null>(
    null
  );

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/templates?category=assembly');

      if (!response.ok) {
        throw new Error('템플릿 목록을 불러올 수 없습니다.');
      }

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      );
    } finally {
      setLoading(false);
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

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
  };

  const handleVersionHistory = (template: Template) => {
    setVersionHistoryTemplate(template);
  };

  const handlePreview = async (template: Template) => {
    try {
      setPreviewingTemplate(template);

      // 템플릿 상세 조회
      const response = await fetch(`/api/admin/templates/${template.id}`);
      if (!response.ok) {
        throw new Error('템플릿을 불러올 수 없습니다.');
      }
      const data = await response.json();

      // PDF 미리보기 생성
      const previewResponse = await fetch('/api/admin/templates/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: template.type,
          content: data.template.content,
        }),
      });

      if (!previewResponse.ok) {
        throw new Error('미리보기 생성에 실패했습니다.');
      }

      // PDF를 Blob URL로 변환하여 모달에 표시
      const blob = await previewResponse.blob();
      const url = URL.createObjectURL(blob);
      setPreviewPdfUrl(url);
    } catch (err) {
      setPreviewingTemplate(null);
      alert(
        err instanceof Error
          ? err.message
          : '미리보기 생성 중 오류가 발생했습니다.'
      );
    }
  };

  const handleCloseModals = () => {
    setEditingTemplate(null);
    setVersionHistoryTemplate(null);
    setPreviewingTemplate(null);
    if (previewPdfUrl) {
      URL.revokeObjectURL(previewPdfUrl);
      setPreviewPdfUrl(null);
    }
  };

  const handleTemplateSaved = () => {
    handleCloseModals();
    fetchTemplates(); // 목록 새로고침
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">총회 문서 템플릿 관리</h1>
        <p className="text-muted-foreground mt-2">
          조합원 총회 문서 생성 시 사용되는 템플릿을 관리합니다.
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          템플릿 수정은 이후 생성되는 모든 문서에 반영됩니다. 기존에 생성된
          문서는 영향을 받지 않습니다.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {templates.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                등록된 템플릿이 없습니다.
              </p>
            </CardContent>
          </Card>
        ) : (
          templates.map(template => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {getTemplateDisplayName(template.type)}
                      <span className="text-sm font-normal text-muted-foreground">
                        v{template.version}
                      </span>
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {template.description || '설명이 없습니다.'}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {template.is_active && (
                      <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                        활성
                      </span>
                    )}
                    {template.editable && (
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                        편집 가능
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    <p>타입: {template.type}</p>
                    <p>
                      마지막 수정:{' '}
                      {new Date(template.created_at).toLocaleDateString(
                        'ko-KR'
                      )}
                      {template.created_by_profile &&
                        ` by ${template.created_by_profile.name} (${template.created_by_profile.email})`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      편집
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVersionHistory(template)}
                    >
                      <History className="h-4 w-4 mr-1" />
                      히스토리
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(template)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      미리보기
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 편집 모달 */}
      {editingTemplate && (
        <AssemblyTemplateEditModal
          isOpen={!!editingTemplate}
          onClose={handleCloseModals}
          template={editingTemplate as any}
          onSave={handleTemplateSaved}
        />
      )}

      {/* 버전 히스토리 모달 */}
      {versionHistoryTemplate && (
        <AssemblyTemplateVersionHistoryModal
          isOpen={!!versionHistoryTemplate}
          onClose={handleCloseModals}
          templateType={versionHistoryTemplate.type}
          onRollback={handleTemplateSaved}
        />
      )}

      {/* PDF 미리보기 모달 */}
      {previewingTemplate && previewPdfUrl && (
        <PDFPreviewModal
          isOpen={!!previewPdfUrl}
          onClose={handleCloseModals}
          previewUrl={previewPdfUrl}
          title={`${getTemplateDisplayName(
            previewingTemplate.type
          )} 템플릿 미리보기`}
          description="현재 활성화된 템플릿의 샘플 미리보기입니다."
        />
      )}
    </div>
  );
}
