'use client';

/**
 * 조합원 총회 문서 템플릿 관리 메인 컴포넌트
 */

import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Template {
  id: string;
  type: string;
  version: string;
  description: string;
  editable: boolean;
  is_active: boolean;
  created_at: string;
  created_by: {
    id: string;
    name: string;
  } | null;
}

export default function AssemblyTemplateManagement() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      formation_member_list: '조합원 명부',
      formation_official_letter: '공문',
      formation_minutes: '회의록',
    };
    return names[type] || type;
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
                      {template.created_by && ` by ${template.created_by.name}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {/* TODO: 버튼 추가 (편집, 버전 히스토리, 미리보기) */}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* TODO: 모달 추가 */}
    </div>
  );
}
