'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMemo } from 'react';

interface TemplateSection {
  index: number;
  title?: string;
  text?: string;
  sub?: TemplateSection[];
  type?: string;
  [key: string]: any;
}

interface TemplatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateContent: any;
  templateType: string;
  originalContent?: any;
}

export function TemplatePreviewModal({
  isOpen,
  onClose,
  templateContent,
  templateType,
  originalContent,
}: TemplatePreviewModalProps) {
  // 변경된 경로 찾기
  const changedPaths = useMemo(() => {
    if (!originalContent) return new Set<string>();

    const changes = new Set<string>();

    const compareSection = (
      original: TemplateSection | undefined,
      modified: TemplateSection | undefined,
      path: string
    ) => {
      if (!original || !modified) return;

      // 제목 변경 확인
      if (original.title !== modified.title) {
        changes.add(`${path}.title`);
      }

      // 텍스트 변경 확인
      if (original.text !== modified.text) {
        changes.add(`${path}.text`);
      }

      // 하위 섹션 비교
      if (modified.sub) {
        modified.sub.forEach((modSub, idx) => {
          const origSub = original.sub?.[idx];
          compareSection(origSub, modSub, `${path}.sub.${idx}`);
        });
      }
    };

    const originalSections = originalContent.sections || [];
    const modifiedSections = templateContent.sections || [];

    modifiedSections.forEach((section: TemplateSection, idx: number) => {
      compareSection(originalSections[idx], section, `sections.${idx}`);
    });

    return changes;
  }, [originalContent, templateContent]);

  // 변수를 파란색 배경으로 표시하는 함수
  const renderTextWithVariables = (
    text: string,
    path: string,
    isChanged: boolean
  ) => {
    if (!text) return null;

    const parts: React.ReactNode[] = [];
    const regex = /(\$\{[^}]+\})/g;
    const segments = text.split(regex);

    segments.forEach((segment, idx) => {
      if (segment.match(regex)) {
        // 변수는 파란색 배경으로 표시
        parts.push(
          <span
            key={idx}
            className="inline-block bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-sm font-medium mx-0.5"
          >
            {segment}
          </span>
        );
      } else if (segment) {
        // 일반 텍스트는 변경 여부에 따라 스타일 적용
        parts.push(
          <span
            key={idx}
            className={isChanged ? 'text-blue-600 font-bold' : ''}
          >
            {segment}
          </span>
        );
      }
    });

    return <>{parts}</>;
  };

  // 섹션 번호 포맷팅
  const formatSectionNumber = (index: number, depth: number) => {
    // 음수 인덱스는 표시하지 않음 (부칙 등)
    if (index < 0) return null;

    if (depth === 0) return `제${index}장`;
    if (depth === 1) return `제${index}조`;

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

  // 재귀적으로 섹션 렌더링
  const renderSection = (
    section: TemplateSection,
    path: string,
    depth: number
  ) => {
    const sectionNumber = formatSectionNumber(section.index, depth);
    const titlePath = `${path}.title`;
    const textPath = `${path}.text`;
    const isTitleChanged = changedPaths.has(titlePath);
    const isTextChanged = changedPaths.has(textPath);

    return (
      <div key={path} className="mb-6">
        {/* 제목 */}
        {section.title && (
          <div
            className={`mb-3 ${
              depth === 0 ? 'text-xl' : depth === 1 ? 'text-lg' : 'text-base'
            } font-semibold`}
          >
            {sectionNumber && <span className="mr-2">{sectionNumber}</span>}
            <span className={isTitleChanged ? 'text-blue-600 font-bold' : ''}>
              {section.title}
            </span>
          </div>
        )}

        {/* 텍스트 */}
        {section.text && (
          <div
            className={`mb-3 leading-relaxed whitespace-pre-wrap ${
              depth > 1 ? 'ml-6' : ''
            }`}
          >
            {!section.title && sectionNumber && (
              <span className="font-medium mr-2">{sectionNumber}</span>
            )}
            {renderTextWithVariables(section.text, textPath, isTextChanged)}
          </div>
        )}

        {/* 하위 섹션 */}
        {section.sub && section.sub.length > 0 && (
          <div className={depth > 0 ? 'ml-8' : ''}>
            {section.sub.map((subSection, idx) =>
              renderSection(subSection, `${path}.sub.${idx}`, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-[60vw] w-[60vw] sm:max-w-[1600px] max-h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>템플릿 미리보기</DialogTitle>
            {changedPaths.size > 0 && (
              <div className="text-sm text-gray-600">
                <span className="text-blue-600 font-bold">파란색 볼드</span>:
                수정된 부분
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-5xl mx-auto">
            {/* 제목 */}
            <div className="text-center mb-12">
              <h1 className="text-2xl font-bold mb-2">
                {templateType === 'lpa' && '투자조합 규약'}
                {templateType === 'plan' && '업무집행계획서'}
                {!['lpa', 'plan'].includes(templateType) && '문서'}
              </h1>
              <div className="text-sm text-gray-500">
                (변수는{' '}
                <span className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-xs">
                  파란색 배경
                </span>
                으로 표시됩니다)
              </div>
            </div>

            {/* 섹션들 */}
            <div className="space-y-8">
              {templateContent.sections?.map(
                (section: TemplateSection, idx: number) =>
                  renderSection(section, `sections.${idx}`, 0)
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
