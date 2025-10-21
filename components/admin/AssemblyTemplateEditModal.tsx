'use client';

/**
 * 조합원 총회 템플릿 편집 모달
 */

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { DocumentTemplate } from '@/types/database';
import { AlertCircle, Eye, Loader2, Save } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { AssemblyFormationAgendaEditor } from './AssemblyFormationAgendaEditor';
import { AssemblyMemberListEditor } from './AssemblyMemberListEditor';

const PDFPreviewModal = dynamic(
  () => import('@/components/admin/PDFPreviewModal'),
  {
    ssr: false,
  }
);

interface AssemblyTemplateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: DocumentTemplate;
  onSave?: () => void;
}

export function AssemblyTemplateEditModal({
  isOpen,
  onClose,
  template,
  onSave,
}: AssemblyTemplateEditModalProps) {
  const [originalContent, setOriginalContent] = useState<any>(template.content);
  const [editedContent, setEditedContent] = useState<any>(template.content);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const contentCopy = JSON.parse(JSON.stringify(template.content));
      setOriginalContent(contentCopy);
      setEditedContent(JSON.parse(JSON.stringify(template.content)));
      setDescription('');
      setError(null);
      setPreviewPdfUrl(null);
    } else {
      // 모달이 닫힐 때 PDF URL 정리
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
        setPreviewPdfUrl(null);
      }
    }
  }, [isOpen, template]);

  // 내용이 변경되었는지 확인
  const hasChanges = () => {
    return JSON.stringify(originalContent) !== JSON.stringify(editedContent);
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

  const calculateNextVersion = (currentVersion: string): string => {
    const parts = currentVersion.split('.');
    if (parts.length !== 3) return '1.0.1';

    const [major, minor, patch] = parts.map(Number);
    return `${major}.${minor}.${patch + 1}`;
  };

  const handleSave = async () => {
    if (!description.trim()) {
      setError('변경 사항 설명을 입력해주세요.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const nextVersion = calculateNextVersion(template.version);

      const response = await fetch(`/api/admin/templates/${template.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editedContent,
          version: nextVersion,
          description: description.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '템플릿 저장에 실패했습니다.');
      }

      alert(`템플릿이 v${nextVersion}으로 저장되었습니다.`);
      if (onSave) {
        onSave();
      }
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '템플릿 저장 중 오류가 발생했습니다.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    setPreviewing(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/templates/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: template.type,
          content: editedContent,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '미리보기 생성에 실패했습니다.');
      }

      // 기존 URL이 있으면 정리
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }

      // PDF를 Blob URL로 변환하여 모달에 표시
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPreviewPdfUrl(url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '미리보기 생성 중 오류가 발생했습니다.'
      );
    } finally {
      setPreviewing(false);
    }
  };

  const renderEditor = () => {
    switch (template.type) {
      case 'formation_agenda':
        return (
          <AssemblyFormationAgendaEditor
            content={editedContent}
            onChange={setEditedContent}
            originalContent={originalContent}
          />
        );
      case 'formation_member_list':
        return (
          <AssemblyMemberListEditor
            content={editedContent}
            onChange={setEditedContent}
            originalContent={originalContent}
          />
        );
      default:
        return (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              이 템플릿 타입({template.type})은 아직 편집 UI가 구현되지
              않았습니다.
            </AlertDescription>
          </Alert>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] sm:max-w-3xl p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">
                템플릿 편집: {getTemplateDisplayName(template.type)}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                현재 버전: v{template.version} → 저장 시 v
                {calculateNextVersion(template.version)}
              </p>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="px-6 shrink-0">
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="flex-1 px-6 flex flex-col min-h-0">
          <Tabs defaultValue="edit" className="flex flex-col flex-1 min-h-0">
            <TabsList className="grid w-full grid-cols-2 shrink-0">
              <TabsTrigger value="edit">편집</TabsTrigger>
              <TabsTrigger value="info">기본 정보</TabsTrigger>
            </TabsList>

            <TabsContent
              value="edit"
              className="mt-4 overflow-y-auto pr-4"
              style={{ maxHeight: 'calc(90vh - 400px)' }}
            >
              {renderEditor()}
            </TabsContent>

            <TabsContent
              value="info"
              className="mt-4 overflow-y-auto pr-4"
              style={{ maxHeight: 'calc(90vh - 400px)' }}
            >
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">템플릿 타입</Label>
                  <Input value={template.type} disabled />
                </div>
                <div>
                  <Label className="mb-2 block">현재 버전</Label>
                  <Input value={template.version} disabled />
                </div>
                <div>
                  <Label className="mb-2 block">편집 가능 여부</Label>
                  <Input
                    value={template.editable ? '사용자 편집 가능' : '자동 생성'}
                    disabled
                  />
                </div>
                <div>
                  <Label className="mb-2 block">현재 설명</Label>
                  <Textarea
                    value={template.description || '-'}
                    disabled
                    rows={3}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">생성 일시</Label>
                  <Input
                    value={new Date(template.created_at).toLocaleString(
                      'ko-KR'
                    )}
                    disabled
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="px-6 py-4 border-t space-y-4 shrink-0">
          <div>
            <Label htmlFor="change_description" className="mb-2 block">
              변경 사항 설명 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="change_description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="예: 기본 의안 내용 수정"
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground mt-1">
              어떤 내용을 변경했는지 간단히 설명해주세요.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              취소
            </Button>
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={saving || previewing}
            >
              {previewing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  미리보기
                </>
              )}
            </Button>
            <Button onClick={handleSave} disabled={saving || !hasChanges()}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  저장 (새 버전 생성)
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* PDF 미리보기 모달 (중첩) */}
      {previewPdfUrl && (
        <PDFPreviewModal
          isOpen={!!previewPdfUrl}
          onClose={() => setPreviewPdfUrl(null)}
          previewUrl={previewPdfUrl}
          title={`${getTemplateDisplayName(template.type)} 미리보기`}
          description="편집 중인 템플릿의 샘플 미리보기입니다. 저장하지 않으면 반영되지 않습니다."
        />
      )}
    </Dialog>
  );
}
