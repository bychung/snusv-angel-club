'use client';

import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface TemplateSection {
  index: number;
  title: string;
  text?: string;
  sub?: TemplateSection[];
  [key: string]: any;
}

interface TemplateTreeProps {
  sections: TemplateSection[];
  expandedSections: Set<string>;
  selectedPath: string | null;
  changedPaths: Set<string>;
  searchResults: Set<string>;
  onToggleSection: (path: string) => void;
  onSelectSection: (path: string) => void;
  searchQuery?: string;
}

/**
 * 인덱스 포맷팅 함수
 * index는 1부터 시작하는 값이 들어옴
 * 음수 인덱스는 빈 문자열 반환 (부칙 등)
 */
function formatIndex(depth: number, index: number): string {
  // 음수 인덱스는 표기하지 않음
  if (index < 0) return '';

  if (depth === 0) return `제${index}장`;
  if (depth === 1) return `제${index}조`;

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
    if (index >= 1 && index <= 20) {
      return circled[index - 1];
    }
    return `(${index})`;
  }

  if (depth === 3) {
    return `${index}.`;
  }

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
    if (index >= 1 && index <= 14) {
      return `${korean[index - 1]}.`;
    }
    return `[${index}]`;
  }

  return `${index})`;
}

export function TemplateTree({
  sections,
  expandedSections,
  selectedPath,
  changedPaths,
  searchResults,
  onToggleSection,
  onSelectSection,
  searchQuery = '',
}: TemplateTreeProps) {
  const renderSection = (
    section: TemplateSection,
    path: string,
    depth: number
  ): React.ReactNode => {
    // depth 2 이상은 트리에 표시하지 않음
    if (depth >= 2) return null;

    const hasChildren = section.sub && section.sub.length > 0;
    const isExpanded = expandedSections.has(path);
    const isSelected = selectedPath === path;
    const isChanged = changedPaths.has(path);
    const isSearchResult = searchResults.has(path);

    // 검색 모드일 때 검색 결과가 아니면 숨김
    const isHidden = searchQuery && !isSearchResult;

    if (isHidden) return null;

    const indexLabel = formatIndex(depth, section.index);
    const label = section.title
      ? indexLabel
        ? `${indexLabel} ${section.title}` // 인덱스가 있으면 "제1장 총칙"
        : section.title // 인덱스가 없으면 "부칙"
      : section.text?.slice(0, 50) || '(내용 없음)';

    return (
      <div key={path} className="select-none">
        <div
          className={cn(
            'flex items-center gap-2 py-2 px-3 rounded-md cursor-pointer transition-colors',
            'hover:bg-gray-100',
            isSelected && 'bg-blue-100 hover:bg-blue-200',
            isChanged && 'border-l-4 border-blue-500',
            depth === 0 && 'font-semibold'
          )}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          onClick={() => {
            onSelectSection(path);
            // 하위 항목이 있으면 토글도 함께 수행
            if (hasChildren && depth < 1) {
              onToggleSection(path);
            }
          }}
        >
          {/* 펼침/접기 아이콘 */}
          {hasChildren && depth < 1 && (
            <div className="p-0.5">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-600" />
              )}
            </div>
          )}

          {/* 아이콘 자리 유지 */}
          {(!hasChildren || depth >= 1) && <div className="w-5 h-5" />}

          {/* 레이블 */}
          <div className="flex-1 flex items-center gap-2">
            <span
              className={cn(
                'text-sm truncate',
                isChanged && 'text-blue-700 font-medium',
                isSearchResult && searchQuery && 'bg-yellow-200'
              )}
            >
              {highlightSearchQuery(label, searchQuery)}
            </span>

            {/* 변경 표시 */}
            {isChanged && <span className="text-xs text-blue-600">●</span>}
          </div>
        </div>

        {/* 하위 섹션 (depth 1까지만) */}
        {hasChildren && isExpanded && depth < 1 && (
          <div>
            {section.sub!.map((subSection, idx) => {
              const subPath = `${path}.sub.${idx}`;
              return renderSection(subSection, subPath, depth + 1);
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1 overflow-y-auto">
      {sections.map((section, idx) => {
        const path = `sections.${idx}`;
        return renderSection(section, path, 0);
      })}
    </div>
  );
}

/**
 * 검색어 하이라이트
 */
function highlightSearchQuery(text: string, query: string): React.ReactNode {
  if (!query) return text;

  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    const isMatch = part.toLowerCase() === query.toLowerCase();
    return (
      <span key={idx} className={isMatch ? 'bg-yellow-300 font-semibold' : ''}>
        {part}
      </span>
    );
  });
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
