'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  analyzeTemplateChanges,
  calculateNextVersion,
  generateChangeDescription,
  getSectionFullLabel,
} from '@/lib/admin/template-versioning';
import type { DocumentTemplate } from '@/types/database';
import {
  AlertCircle,
  Eye,
  FileText,
  Loader2,
  RotateCcw,
  Save,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { TemplateCommitModal } from './TemplateEditor/TemplateCommitModal';
import { TemplatePreviewModal } from './TemplateEditor/TemplatePreviewModal';
import { TemplateSearchBar } from './TemplateEditor/TemplateSearchBar';
import { TemplateTextEditor } from './TemplateEditor/TemplateTextEditor';
import { TemplateTree } from './TemplateEditor/TemplateTree';

interface TemplateSection {
  index: number;
  title: string;
  text?: string;
  sub?: TemplateSection[];
  [key: string]: any;
}

interface TemplateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: DocumentTemplate;
  onSave?: () => void;
}

export function TemplateEditModal({
  isOpen,
  onClose,
  template,
  onSave,
}: TemplateEditModalProps) {
  // 원본과 수정본
  const [original] = useState<DocumentTemplate>(template);
  const [modified, setModified] = useState<DocumentTemplate>(
    JSON.parse(JSON.stringify(template))
  );

  // UI 상태
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCommitModal, setShowCommitModal] = useState(false);

  // 변경사항 분석
  const changes = useMemo(() => {
    return analyzeTemplateChanges(original.content, modified.content);
  }, [original, modified]);

  const changedPaths = useMemo(() => {
    return new Set(changes.map(c => c.path));
  }, [changes]);

  const nextVersion = useMemo(() => {
    return calculateNextVersion(original.version, changes);
  }, [original.version, changes]);

  const changeDescription = useMemo(() => {
    return generateChangeDescription(changes);
  }, [changes]);

  // 검색 결과
  const searchResults = useMemo(() => {
    if (!searchQuery) return new Set<string>();

    const results = new Set<string>();
    const query = searchQuery.toLowerCase();

    const searchInSections = (
      sections: TemplateSection[],
      parentPath: string
    ) => {
      sections.forEach((section, idx) => {
        const path = parentPath
          ? `${parentPath}.sub.${idx}`
          : `sections.${idx}`;

        // 제목이나 텍스트에 검색어가 있는지 확인
        const title = section.title?.toLowerCase() || '';
        const text = section.text?.toLowerCase() || '';

        if (title.includes(query) || text.includes(query)) {
          // 최상위 depth 경로만 추가
          const topLevelPath = path.split('.sub.')[0];
          results.add(topLevelPath);

          // 현재 경로도 추가 (하위 항목 표시용)
          results.add(path);
        }

        // 하위 섹션 재귀 검색
        if (section.sub && section.sub.length > 0) {
          searchInSections(section.sub, path);
        }
      });
    };

    searchInSections(modified.content.sections || [], '');
    return results;
  }, [searchQuery, modified]);

  // 검색 시 자동으로 펼치기
  useEffect(() => {
    if (searchQuery && searchResults.size > 0) {
      setExpandedSections(new Set(searchResults));
    }
  }, [searchQuery, searchResults]);

  // 섹션 펼침/접기
  const handleToggleSection = (path: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedSections(newExpanded);
  };

  // 섹션 선택
  const handleSelectSection = (path: string) => {
    setSelectedPath(path);

    // 선택한 섹션이 접혀있으면 펼치기
    if (!expandedSections.has(path)) {
      setExpandedSections(new Set([...expandedSections, path]));
    }
  };

  // 텍스트 변경
  const handleTextChange = (path: string, newText: string) => {
    const newModified = JSON.parse(JSON.stringify(modified));

    // 경로를 따라가서 해당 위치 찾기
    const pathParts = path.split('.');
    let current: any = newModified.content;

    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      const index = pathParts[i + 1];

      if (part === 'sections' || part === 'sub') {
        current = current[part][parseInt(index)];
        i++; // 인덱스 스킵
      }
    }

    // 마지막 속성 업데이트
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart === 'title' || lastPart === 'text') {
      current[lastPart] = newText;
    } else {
      current.text = newText;
    }

    setModified(newModified);
  };

  // 초기화
  const handleReset = () => {
    if (!confirm('모든 변경사항이 초기화됩니다. 계속하시겠습니까?')) {
      return;
    }

    setModified(JSON.parse(JSON.stringify(original)));
    setSelectedPath(null);
    alert('모든 변경사항이 초기화되었습니다.');
  };

  // 저장 버튼 클릭 - 커밋 모달 열기
  const handleSaveClick = () => {
    if (changes.length === 0) {
      alert('수정된 내용이 없습니다.');
      return;
    }

    setShowCommitModal(true);
  };

  // 실제 저장 (커밋 메시지와 함께)
  const handleSave = async (commitMessage: string) => {
    try {
      setSaving(true);

      const response = await fetch(`/api/admin/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: modified.content,
          version: nextVersion,
          description: commitMessage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '템플릿 저장에 실패했습니다');
      }

      alert(`템플릿이 v${nextVersion}으로 저장되었습니다.`);

      setShowCommitModal(false);
      onSave?.();
      onClose();
    } catch (error) {
      console.error('템플릿 저장 실패:', error);
      alert(
        error instanceof Error
          ? error.message
          : '템플릿 저장 중 오류가 발생했습니다.'
      );
    } finally {
      setSaving(false);
    }
  };

  // 미리보기
  const handlePreview = () => {
    setShowPreview(true);
  };

  // 선택된 섹션 가져오기
  const getSelectedSection = (): {
    section: TemplateSection | null;
    originalSection: TemplateSection | null;
  } => {
    if (!selectedPath) return { section: null, originalSection: null };

    const getSection = (content: any, path: string) => {
      const pathParts = path.split('.');
      let current: any = content;

      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        const index = pathParts[i + 1];

        if (part === 'sections' || part === 'sub') {
          current = current[part][parseInt(index)];
          i++; // 인덱스 스킵
        }
      }

      return current;
    };

    return {
      section: getSection(modified.content, selectedPath),
      originalSection: getSection(original.content, selectedPath),
    };
  };

  // 선택된 섹션의 depth 계산
  const getPathDepth = (path: string): number => {
    if (!path) return 0;
    const parts = path.split('.');
    let depth = 0;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === 'sections' || parts[i] === 'sub') {
        depth++;
      }
    }
    return depth;
  };

  const { section, originalSection } = getSelectedSection();

  // 선택된 섹션의 실제 depth (0: 장, 1: 조, 2: 항...)
  const selectedSectionDepth = selectedPath
    ? getPathDepth(selectedPath) - 1
    : 0;

  // 선택된 섹션의 라벨 생성
  const sectionLabel =
    section && selectedPath
      ? getSectionFullLabel(
          section.index,
          selectedSectionDepth + 1, // getDepthLabel은 1부터 시작 (1:장, 2:조, 3:항...)
          section.title || '(제목 없음)'
        )
      : '';

  // 하위 섹션들을 재귀적으로 렌더링하는 함수
  const renderSubSections = (
    subSections: TemplateSection[],
    originalSubSections: TemplateSection[],
    parentPath: string,
    parentDepth: number
  ): React.ReactNode => {
    return subSections.map((subSection, idx) => {
      const subPath = `${parentPath}.sub.${idx}`;
      const originalSubSection = originalSubSections[idx];

      if (!originalSubSection) return null;

      // 현재 서브섹션의 실제 depth (부모 depth + 1)
      const currentDepth = parentDepth + 1;

      // 인덱스 포맷팅 - 실제 문서 구조에 맞춤
      const getIndexLabel = (depth: number, index: number) => {
        // 음수 인덱스는 표기하지 않음
        if (index < 0) return '';

        if (depth === 1) return `제${index}조`; // 조

        // 항
        if (depth === 2) {
          const circled = [
            '①',
            '②',
            '③',
            '④',
            '⑤',
            '⑥',
            '⑦',
            '⑧',
            '⑨',
            '⑩',
            '⑪',
            '⑫',
            '⑬',
            '⑭',
            '⑮',
            '⑯',
            '⑰',
            '⑱',
            '⑲',
            '⑳',
          ];
          if (index >= 1 && index <= 20) return circled[index - 1];
          return `(${index})`;
        }

        // 호
        if (depth === 3) return `${index}.`;

        // 목
        if (depth === 4) {
          const korean = [
            '가',
            '나',
            '다',
            '라',
            '마',
            '바',
            '사',
            '아',
            '자',
            '차',
            '카',
            '타',
            '파',
            '하',
          ];
          if (index >= 1 && index <= 14) return `${korean[index - 1]}.`;
          return `[${index}]`;
        }

        return `${index})`;
      };

      const indexLabel = getIndexLabel(currentDepth, subSection.index);
      const indentLevel = parentDepth;

      return (
        <div key={subPath} style={{ marginLeft: `${indentLevel * 24}px` }}>
          {idx > 0 && <Separator className="my-4" />}

          {/* 제목이 있는 경우 */}
          {subSection.title && (
            <div className="mb-4">
              <TemplateTextEditor
                originalText={originalSubSection.title || ''}
                modifiedText={subSection.title}
                onChange={newText =>
                  handleTextChange(`${subPath}.title`, newText)
                }
                searchQuery={searchQuery}
                label={indexLabel ? `${indexLabel} 제목` : '제목'}
              />
            </div>
          )}

          {/* 텍스트가 있는 경우 */}
          {subSection.text && (
            <div className="mb-4">
              <TemplateTextEditor
                originalText={originalSubSection.text || ''}
                modifiedText={subSection.text}
                onChange={newText =>
                  handleTextChange(`${subPath}.text`, newText)
                }
                searchQuery={searchQuery}
                label={indexLabel || '내용'}
              />
            </div>
          )}

          {/* 하위 항목이 있으면 재귀 호출 */}
          {subSection.sub && subSection.sub.length > 0 && (
            <div>
              {renderSubSections(
                subSection.sub,
                originalSubSection.sub || [],
                subPath,
                currentDepth
              )}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="w-[90vw] max-w-[90vw] sm:max-w-[1800px] h-[90vh] max-h-[1000px] flex flex-col p-0">
        {/* 헤더 */}
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-gray-600" />
              <DialogTitle>
                템플릿 수정 - {template.type.toUpperCase()} v{template.version}
              </DialogTitle>
              {changes.length > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-700"
                >
                  {changes.length}개 변경
                </Badge>
              )}
            </div>

            {/* 액션 버튼들 */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={changes.length === 0}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                초기화
              </Button>

              <Button variant="outline" size="sm" onClick={handlePreview}>
                <Eye className="h-4 w-4 mr-1" />
                미리보기
              </Button>

              <Button
                size="sm"
                onClick={handleSaveClick}
                disabled={changes.length === 0 || saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    저장 (v{nextVersion})
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* 검색바 */}
        <div className="px-6 py-3 border-b bg-gray-50">
          <TemplateSearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            resultCount={searchResults.size}
          />
        </div>

        {/* 변경 정보 */}
        {changes.length > 0 && (
          <div className="px-6 py-3 bg-blue-50 border-b">
            <Alert className="border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-800">
                <strong>변경 요약:</strong> {changeDescription} · 새 버전:{' '}
                <strong>v{nextVersion}</strong>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* 메인 컨텐츠 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 왼쪽: 트리 네비게이션 */}
          <div className="w-96 border-r bg-gray-50">
            <ScrollArea className="h-full p-4">
              <TemplateTree
                sections={modified.content.sections || []}
                expandedSections={expandedSections}
                selectedPath={selectedPath}
                changedPaths={changedPaths}
                searchResults={searchResults}
                onToggleSection={handleToggleSection}
                onSelectSection={handleSelectSection}
                searchQuery={searchQuery}
              />
            </ScrollArea>
          </div>

          {/* 오른쪽: 편집 영역 */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
                {section && originalSection ? (
                  <div className="space-y-6 max-w-5xl">
                    {/* 섹션 헤더 */}
                    {sectionLabel && (
                      <div className="pb-2 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {sectionLabel}
                        </h3>
                      </div>
                    )}

                    {/* 제목 편집 */}
                    {section.title && (
                      <TemplateTextEditor
                        originalText={originalSection.title || ''}
                        modifiedText={section.title}
                        onChange={newText =>
                          handleTextChange(`${selectedPath}.title`, newText)
                        }
                        searchQuery={searchQuery}
                        label="제목"
                      />
                    )}

                    {/* 본문 편집 */}
                    {section.text && (
                      <>
                        {section.title && <Separator />}
                        <TemplateTextEditor
                          originalText={originalSection.text || ''}
                          modifiedText={section.text}
                          onChange={newText =>
                            handleTextChange(`${selectedPath}.text`, newText)
                          }
                          searchQuery={searchQuery}
                          label="내용"
                        />
                      </>
                    )}

                    {/* 모든 하위 항목들을 재귀적으로 렌더링 */}
                    {section.sub && section.sub.length > 0 && selectedPath && (
                      <>
                        {(section.title || section.text) && <Separator />}
                        {renderSubSections(
                          section.sub,
                          originalSection.sub || [],
                          selectedPath,
                          selectedSectionDepth
                        )}
                      </>
                    )}

                    {/* 테이블 타입 표시 */}
                    {section.type === 'table' && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          이 섹션은 테이블 타입입니다. 테이블 구조는 현재 편집할
                          수 없습니다.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>왼쪽에서 항목을 선택하여 수정하세요</p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>

      {/* 미리보기 모달 */}
      <TemplatePreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        templateContent={modified.content}
        templateType={template.type}
        originalContent={original.content}
      />

      {/* 커밋 메시지 입력 모달 */}
      <TemplateCommitModal
        isOpen={showCommitModal}
        onClose={() => setShowCommitModal(false)}
        onConfirm={handleSave}
        nextVersion={nextVersion}
        changes={changes}
      />
    </Dialog>
  );
}
