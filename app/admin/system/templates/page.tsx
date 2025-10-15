'use client';

import ActiveTemplateInfo from '@/components/admin/ActiveTemplateInfo';
import AdminLayout from '@/components/admin/AdminLayout';
import { TemplateEditModal } from '@/components/admin/TemplateEditModal';
import TemplateVersionHistory from '@/components/admin/TemplateVersionHistory';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { DocumentTemplate } from '@/types/database';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';

export default function GlobalTemplatesPage() {
  const [editingTemplate, setEditingTemplate] =
    useState<DocumentTemplate | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleEditTemplate = async (type: string) => {
    try {
      const response = await fetch(`/api/admin/templates/types/${type}/active`);

      if (!response.ok) {
        throw new Error('템플릿을 불러오는데 실패했습니다');
      }

      const data = await response.json();
      setEditingTemplate(data.template);
    } catch (error) {
      console.error('템플릿 조회 실패:', error);
      alert(
        error instanceof Error
          ? error.message
          : '템플릿을 불러오는데 실패했습니다'
      );
    }
  };

  const handleTemplateSave = () => {
    setEditingTemplate(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'lpa':
        return 'LPA (조합 규약)';
      case 'plan':
        return 'PLAN (결성계획서)';
      default:
        return type.toUpperCase();
    }
  };

  const renderTemplateSection = (type: 'lpa' | 'plan') => {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>{getDocumentTypeLabel(type)}</CardTitle>
            <CardDescription>
              글로벌 템플릿 - 새 펀드 생성 시 기본 템플릿으로 사용됩니다
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 활성 템플릿 정보 */}
          <ActiveTemplateInfo
            documentType={type}
            refreshTrigger={refreshTrigger}
          />

          {/* 버전 히스토리 */}
          <TemplateVersionHistory
            documentType={type}
            onTemplateActivated={() => setRefreshTrigger(prev => prev + 1)}
          />
        </CardContent>
      </Card>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div>
          <h1 className="text-3xl font-bold">🌐 글로벌 템플릿 관리</h1>
          <p className="text-muted-foreground">
            SYSTEM_ADMIN 전용 - 모든 펀드의 기본 템플릿을 관리합니다
          </p>
        </div>

        {/* 경고 메시지 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-1">⚠️ 주의사항</h3>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>
                  • 글로벌 템플릿은 <strong>새로 생성되는 펀드</strong>의 초기
                  템플릿으로 사용됩니다
                </li>
                <li>
                  • 기존 펀드는 이미 펀드별 템플릿을 가지고 있으므로{' '}
                  <strong>영향받지 않습니다</strong>
                </li>
                <li>• 수정 시 신중하게 검토 후 변경해주세요</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 템플릿 섹션들 */}
        <div className="grid gap-6">
          {renderTemplateSection('lpa')}
          {/* {renderTemplateSection('plan')} */}
        </div>
      </div>

      {/* 템플릿 편집 모달 */}
      {editingTemplate && (
        <TemplateEditModal
          isOpen={!!editingTemplate}
          onClose={() => setEditingTemplate(null)}
          template={editingTemplate}
          onSave={handleTemplateSave}
        />
      )}
    </AdminLayout>
  );
}
