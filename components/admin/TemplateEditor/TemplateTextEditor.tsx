'use client';

import {
  parseTemplateText,
  segmentsToText,
  type TextSegment,
} from '@/lib/admin/template-text-utils';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { TemplateVariableBadge } from './TemplateVariableBadge';

interface TemplateTextEditorProps {
  originalText: string;
  modifiedText: string;
  onChange: (newText: string) => void;
  readOnly?: boolean;
  searchQuery?: string;
  label?: string;
}

export function TemplateTextEditor({
  originalText,
  modifiedText,
  onChange,
  readOnly = false,
  searchQuery = '',
  label,
}: TemplateTextEditorProps) {
  const [segments, setSegments] = useState<TextSegment[]>(() =>
    parseTemplateText(modifiedText)
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isChanged = originalText !== modifiedText;

  // modifiedText가 외부에서 변경되면 segments 업데이트
  useEffect(() => {
    const currentText = segmentsToText(segments);
    if (currentText !== modifiedText) {
      setSegments(parseTemplateText(modifiedText));
    }
  }, [modifiedText]);

  // segments가 변경되면 onChange 호출
  useEffect(() => {
    const newText = segmentsToText(segments);
    if (newText !== modifiedText) {
      onChange(newText);
    }
  }, [segments]);

  const handleEditStart = () => {
    if (readOnly) return;
    setIsEditing(true);
    setEditValue(modifiedText);
  };

  const handleTextChange = (value: string) => {
    setEditValue(value);
  };

  const handleTextBlur = () => {
    if (!isEditing) return;

    // 변수 패턴이 있는지 확인하고 파싱
    const parsed = parseTemplateText(editValue);
    setSegments(parsed);

    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue('');
    }
  };

  const handleVariableRemove = (index: number) => {
    const newSegments = segments.filter((_, idx) => idx !== index);
    // 인덱스 재조정
    const reindexed = newSegments.map((seg, idx) => ({ ...seg, index: idx }));
    setSegments(reindexed);
  };

  const highlightText = (text: string) => {
    if (!searchQuery) return text;

    const regex = new RegExp(`(${searchQuery})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, idx) => {
      const isMatch = part.toLowerCase() === searchQuery.toLowerCase();
      return (
        <span
          key={idx}
          className={isMatch ? 'bg-yellow-200 font-semibold' : ''}
        >
          {part}
        </span>
      );
    });
  };

  return (
    <div className="space-y-3">
      {label && (
        <div className="text-sm font-medium text-gray-700">{label}</div>
      )}

      {/* 좌우 2단 레이아웃 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 기존 (왼쪽) */}
        <div>
          <div className="text-xs font-medium text-gray-500 mb-2">기존</div>
          <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 min-h-[60px]">
            <div className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
              {parseTemplateText(originalText).map(segment => {
                if (segment.type === 'variable') {
                  return (
                    <TemplateVariableBadge
                      key={segment.index}
                      variable={segment.content}
                      readOnly
                    />
                  );
                }
                return (
                  <span key={segment.index}>
                    {highlightText(segment.content)}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* 수정 (오른쪽) */}
        <div>
          <div className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-2">
            <span>수정</span>
            {isChanged && (
              <span className="text-xs text-blue-600 font-semibold">
                ● 변경됨
              </span>
            )}
          </div>
          <div
            className={cn(
              'p-3 border rounded-lg min-h-[60px] transition-colors',
              readOnly
                ? 'bg-gray-50 border-gray-200'
                : 'bg-white border-blue-200 hover:border-blue-300 cursor-text',
              isChanged && 'border-blue-400 bg-blue-50'
            )}
            onClick={handleEditStart}
          >
            {isEditing ? (
              <textarea
                ref={textareaRef}
                value={editValue}
                onChange={e => handleTextChange(e.target.value)}
                onBlur={handleTextBlur}
                onKeyDown={handleKeyDown}
                className="w-full min-h-[100px] p-2 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm leading-relaxed resize-y"
                autoFocus
              />
            ) : (
              <div className="text-sm leading-relaxed">
                {segments.map((segment, idx) => {
                  if (segment.type === 'variable') {
                    return (
                      <TemplateVariableBadge
                        key={segment.index}
                        variable={segment.content}
                        onRemove={
                          readOnly ? undefined : () => handleVariableRemove(idx)
                        }
                        readOnly={readOnly}
                      />
                    );
                  }

                  // 일반 텍스트
                  return (
                    <span
                      key={segment.index}
                      className={cn(
                        'whitespace-pre-wrap break-words',
                        isChanged && 'text-blue-700 font-medium'
                      )}
                    >
                      {highlightText(segment.content)}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
