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
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DeleteSectionModal } from './TemplateEditor/DeleteSectionModal';
import { FundDocumentConfirmModal } from './TemplateEditor/FundDocumentConfirmModal';
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
  fundId?: string; // 펀드별 규약 수정 시 전달
  fundName?: string; // 펀드별 규약 수정 시 전달
  onSave?: () => void;
}

export function TemplateEditModal({
  isOpen,
  onClose,
  template,
  fundId,
  fundName,
  onSave,
}: TemplateEditModalProps) {
  // 원본과 수정본
  const [original, setOriginal] = useState<DocumentTemplate>(template);
  const [modified, setModified] = useState<DocumentTemplate>(
    JSON.parse(JSON.stringify(template))
  );

  // template prop이 변경되면 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setOriginal(template);
      setModified(JSON.parse(JSON.stringify(template)));
    }
  }, [isOpen, template]);

  // UI 상태
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [showFundConfirmModal, setShowFundConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetPath, setDeleteTargetPath] = useState<string | null>(null);

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

  // Index 재정렬 함수
  const recalculateIndices = (
    sections: TemplateSection[],
    startIndex: number = 1
  ): TemplateSection[] => {
    return sections.map((section, idx) => {
      const newSection = { ...section };

      // index가 음수가 아니면 재정렬 (음수는 부칙 등 특수 항목)
      if (section.index >= 0) {
        newSection.index = startIndex + idx;
      }

      // 하위 항목도 재귀적으로 처리
      if (newSection.sub && newSection.sub.length > 0) {
        newSection.sub = recalculateIndices(newSection.sub, 1);
      }

      return newSection;
    });
  };

  // _isNew 플래그 제거 함수 (저장 전 정리용)
  const removeIsNewFlags = (content: any): any => {
    if (!content || typeof content !== 'object') return content;

    if (Array.isArray(content)) {
      return content.map(item => removeIsNewFlags(item));
    }

    const cleaned: any = {};
    for (const key in content) {
      if (key !== '_isNew') {
        cleaned[key] = removeIsNewFlags(content[key]);
      }
    }
    return cleaned;
  };

  // 경로에서 섹션과 부모 배열 가져오기
  const getSectionAndParent = (path: string) => {
    const pathParts = path.split('.');
    const newModified = JSON.parse(JSON.stringify(modified));
    let current: any = newModified.content;
    let parent: any = null;
    let parentKey: string | null = null;
    let arrayIndex: number = -1;

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];

      if (part === 'sections' || part === 'sub') {
        parent = current;
        parentKey = part;
        const index = parseInt(pathParts[i + 1]);
        arrayIndex = index;
        current = current[part][index];
        i++; // 인덱스 스킵
      }
    }

    return { section: current, parent, parentKey, arrayIndex, newModified };
  };

  // 하위 항목 개수 계산 (재귀)
  const countChildren = (section: TemplateSection): number => {
    if (!section.sub || section.sub.length === 0) return 0;

    let count = section.sub.length;
    section.sub.forEach(child => {
      count += countChildren(child);
    });

    return count;
  };

  // 항목 즉시 추가
  const handleAddSectionWithPosition = (
    path: string,
    position: 'before' | 'after' | 'child'
  ) => {
    // 깊은 복사
    const newModified = JSON.parse(JSON.stringify(modified));

    // 경로 파싱
    const pathParts = path.split('.');
    let current: any = newModified.content;
    let parent: any = null;
    let parentKey: string | null = null;
    let arrayIndex: number = -1;

    // 경로를 따라가면서 대상 찾기
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];

      if (part === 'sections' || part === 'sub') {
        parent = current;
        parentKey = part;
        const index = parseInt(pathParts[i + 1]);
        arrayIndex = index;
        current = current[part][index];
        i++; // 인덱스 스킵
      }
    }

    if (!current) {
      console.error('항목을 찾을 수 없습니다:', path);
      return;
    }

    // 새 섹션 생성 (빈 항목)
    const newSection: TemplateSection = {
      index: 1, // 임시값, 나중에 재정렬됨
      title: '',
      text: '',
      sub: [],
      _isNew: true, // 신규 항목 표시 (임시 플래그)
    };

    if (position === 'child') {
      // 하위 항목으로 추가
      if (!current.sub) {
        current.sub = [];
      }
      current.sub.push(newSection);
      current.sub = recalculateIndices(current.sub, 1);
    } else if (parent && parentKey && arrayIndex >= 0) {
      // 형제 항목으로 추가
      const siblings = parent[parentKey];
      const insertIndex = position === 'before' ? arrayIndex : arrayIndex + 1;
      siblings.splice(insertIndex, 0, newSection);
      // Index 재정렬
      parent[parentKey] = recalculateIndices(siblings, 1);
    }

    console.log('항목 추가됨:', { position, path, newModified });
    setModified(newModified);
  };

  // 항목 삭제 확인
  const handleDeleteClick = (path: string) => {
    setDeleteTargetPath(path);
    setShowDeleteModal(true);
  };

  // 항목 삭제 실행
  const handleDeleteSection = () => {
    if (!deleteTargetPath) return;

    const { parent, parentKey, arrayIndex, newModified } =
      getSectionAndParent(deleteTargetPath);

    if (!parent || !parentKey || arrayIndex < 0) {
      alert('삭제할 수 없는 항목입니다.');
      return;
    }

    // 배열에서 제거
    const siblings = parent[parentKey];
    siblings.splice(arrayIndex, 1);

    // Index 재정렬
    parent[parentKey] = recalculateIndices(siblings, 1);

    setModified(newModified);
    setShowDeleteModal(false);
    setDeleteTargetPath(null);

    // 선택 해제
    setSelectedPath(null);

    alert('항목이 삭제되었습니다.');
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

  // 저장 버튼 클릭
  const handleSaveClick = () => {
    if (changes.length === 0) {
      alert('수정된 내용이 없습니다.');
      return;
    }

    // 펀드 규약과 글로벌 템플릿 모두 확인 모달 표시
    if (fundId) {
      setShowFundConfirmModal(true);
    } else {
      setShowCommitModal(true);
    }
  };

  // 글로벌 템플릿 저장 (커밋 메시지와 함께)
  const handleSave = async (commitMessage: string) => {
    try {
      setSaving(true);

      // _isNew 플래그 제거
      const cleanedContent = removeIsNewFlags(modified.content);

      const response = await fetch(`/api/admin/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: cleanedContent,
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

  // 펀드 규약 저장 (PDF 생성 및 다운로드)
  const handleSaveFundDocument = async () => {
    if (!fundId || !fundName) return;

    try {
      setSaving(true);

      // _isNew 플래그 제거
      const cleanedContent = removeIsNewFlags(modified.content);
      const cleanedAppendix = removeIsNewFlags(modified.appendix);

      // 규약 저장 + PDF 생성 (한 번의 API 호출로 처리)
      const response = await fetch(
        `/api/admin/funds/${fundId}/generated-documents/${template.type}/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modifiedContent: cleanedContent,
            modifiedAppendix: cleanedAppendix,
            changeDescription,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '규약 저장 및 생성에 실패했습니다');
      }

      // PDF 다운로드
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Content-Disposition 헤더에서 파일명 추출 시도
      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName = `${fundName}_규약(안)_${
        new Date().toISOString().split('T')[0]
      }.pdf`;

      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(
          /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
        );
        if (fileNameMatch && fileNameMatch[1]) {
          fileName = decodeURIComponent(fileNameMatch[1].replace(/['"]/g, ''));
        }
      }

      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert('규약이 저장되고 다운로드되었습니다.');

      setShowFundConfirmModal(false);
      onSave?.();
      onClose();
    } catch (error) {
      console.error('규약 저장 실패:', error);
      alert(
        error instanceof Error
          ? error.message
          : '규약 저장 중 오류가 발생했습니다.'
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
    return (
      <>
        {subSections.map((subSection, idx) => {
          const subPath = `${parentPath}.sub.${idx}`;

          // 신규 항목인 경우 원본을 빈 객체로 처리
          let originalSubSection;
          if (subSection._isNew) {
            originalSubSection = {
              index: subSection.index,
              title: '',
              text: '',
              sub: [],
            };
          } else {
            // 기존 항목: 현재 인덱스 이전의 신규 항목 개수를 세어 원본 인덱스 계산
            let newItemsBefore = 0;
            for (let i = 0; i < idx; i++) {
              if (subSections[i]._isNew) {
                newItemsBefore++;
              }
            }

            // 원본 인덱스 = 현재 인덱스 - 이전 신규 항목 개수
            const originalIdx = idx - newItemsBefore;

            if (originalIdx >= 0 && originalIdx < originalSubSections.length) {
              originalSubSection = originalSubSections[originalIdx];
            } else {
              // 범위를 벗어나면 빈 객체
              originalSubSection = {
                index: subSection.index,
                title: '',
                text: '',
                sub: [],
              };
            }
          }

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
            <div key={subPath}>
              {/* 항목 사이에 추가 버튼 (첫 번째 항목 전) */}
              {idx === 0 && (
                <div
                  style={{ marginLeft: `${indentLevel * 24}px` }}
                  className="py-2 border-t border-dashed border-gray-300 flex items-center justify-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer"
                  onClick={() => {
                    handleAddSectionWithPosition(subPath, 'before');
                  }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-gray-500 hover:text-blue-600"
                    onClick={e => {
                      e.stopPropagation();
                      handleAddSectionWithPosition(subPath, 'before');
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    여기에 추가
                  </Button>
                </div>
              )}

              <div style={{ marginLeft: `${indentLevel * 24}px` }}>
                {idx > 0 && <Separator className="my-4" />}

                {/* 신규 항목이거나 제목/텍스트가 있는 경우 렌더링 */}
                {(subSection.title || subSection.text || subSection._isNew) && (
                  <div className="space-y-4">
                    {/* 제목 영역 - 조(depth 1)까지만 표시 */}
                    {currentDepth <= 1 &&
                      (subSection.title || subSection._isNew) && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium text-gray-700">
                              {indexLabel ? `${indexLabel} 제목` : '제목'}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => {
                                  handleAddSectionWithPosition(
                                    subPath,
                                    'child'
                                  );
                                }}
                                title="하위 항목 추가"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                하위 추가
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteClick(subPath)}
                                title="삭제"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <TemplateTextEditor
                            originalText={originalSubSection.title || ''}
                            modifiedText={subSection.title || ''}
                            onChange={newText =>
                              handleTextChange(`${subPath}.title`, newText)
                            }
                            searchQuery={searchQuery}
                            label=""
                          />
                        </div>
                      )}

                    {/* 텍스트 영역 */}
                    {(subSection.text ||
                      subSection._isNew ||
                      currentDepth > 1) && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium text-gray-700">
                            {indexLabel || '내용'}
                          </div>
                          {(currentDepth > 1 || !subSection.title) && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => {
                                  handleAddSectionWithPosition(
                                    subPath,
                                    'child'
                                  );
                                }}
                                title="하위 항목 추가"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                하위 추가
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteClick(subPath)}
                                title="삭제"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <TemplateTextEditor
                          originalText={
                            (originalSubSection.text as string) || ''
                          }
                          modifiedText={subSection.text || ''}
                          onChange={newText =>
                            handleTextChange(`${subPath}.text`, newText)
                          }
                          searchQuery={searchQuery}
                          label=""
                        />
                      </div>
                    )}
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

              {/* 항목 사이에 추가 버튼 (각 항목 후) */}
              <div
                style={{ marginLeft: `${indentLevel * 24}px` }}
                className="py-2 border-t border-dashed border-gray-300 flex items-center justify-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer"
                onClick={() => {
                  handleAddSectionWithPosition(subPath, 'after');
                }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-gray-500 hover:text-blue-600"
                  onClick={e => {
                    e.stopPropagation();
                    handleAddSectionWithPosition(subPath, 'after');
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  여기에 추가
                </Button>
              </div>
            </div>
          );
        })}
      </>
    );
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
                {fundId
                  ? `펀드 규약 수정 - ${template.type.toUpperCase()} v${
                      template.version
                    } (${fundName})`
                  : `템플릿 수정 - ${template.type.toUpperCase()} v${
                      template.version
                    }`}
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
                onAddSection={path => {
                  handleAddSectionWithPosition(path, 'after');
                }}
                onDeleteSection={handleDeleteClick}
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
                      <div className="pb-4 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {sectionLabel}
                          </h3>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                selectedPath && handleDeleteClick(selectedPath)
                              }
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              삭제
                            </Button>
                          </div>
                        </div>
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

      {/* 커밋 메시지 입력 모달 (글로벌 템플릿만) */}
      {!fundId && (
        <TemplateCommitModal
          isOpen={showCommitModal}
          onClose={() => setShowCommitModal(false)}
          onConfirm={handleSave}
          nextVersion={nextVersion}
          changes={changes}
        />
      )}

      {/* 펀드 규약 확인 모달 */}
      {fundId && (
        <FundDocumentConfirmModal
          isOpen={showFundConfirmModal}
          onClose={() => setShowFundConfirmModal(false)}
          onConfirm={handleSaveFundDocument}
          changes={changes}
          fundName={fundName}
        />
      )}

      {/* 항목 삭제 모달 */}
      <DeleteSectionModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTargetPath(null);
        }}
        onConfirm={handleDeleteSection}
        sectionLabel={
          deleteTargetPath
            ? (() => {
                const { section: delSection } = getSelectedSection();
                return delSection
                  ? getSectionFullLabel(
                      delSection.index,
                      getPathDepth(deleteTargetPath),
                      delSection.title || '(제목 없음)'
                    )
                  : '항목';
              })()
            : '항목'
        }
        childCount={
          deleteTargetPath
            ? (() => {
                const pathParts = deleteTargetPath.split('.');
                const newModified = JSON.parse(JSON.stringify(modified));
                let current: any = newModified.content;

                for (let i = 0; i < pathParts.length; i++) {
                  const part = pathParts[i];
                  if (part === 'sections' || part === 'sub') {
                    current = current[part][parseInt(pathParts[i + 1])];
                    i++;
                  }
                }

                return countChildren(current);
              })()
            : 0
        }
      />
    </Dialog>
  );
}
