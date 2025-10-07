// 템플릿 텍스트 처리 유틸리티 (변수 파싱 등)

export interface TextSegment {
  type: 'text' | 'variable';
  content: string;
  index: number;
}

/**
 * 텍스트를 파싱하여 일반 텍스트와 변수로 분리
 * 예: "본 조합의 명칭은 ${fundName}입니다"
 * → [{ type: 'text', content: '본 조합의 명칭은 ' }, { type: 'variable', content: '${fundName}' }, ...]
 */
export function parseTemplateText(text: string): TextSegment[] {
  if (!text) return [];

  const segments: TextSegment[] = [];
  const regex = /\$\{[^}]+\}/g;
  let lastIndex = 0;
  let match;
  let index = 0;

  while ((match = regex.exec(text)) !== null) {
    // 변수 앞의 일반 텍스트
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
        index: index++,
      });
    }

    // 변수
    segments.push({
      type: 'variable',
      content: match[0],
      index: index++,
    });

    lastIndex = regex.lastIndex;
  }

  // 마지막 일반 텍스트
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
      index: index++,
    });
  }

  return segments;
}

/**
 * 세그먼트 배열을 다시 문자열로 결합
 */
export function segmentsToText(segments: TextSegment[]): string {
  return segments.map(s => s.content).join('');
}

/**
 * 변수명 추출
 * "${fundName}" → "fundName"
 */
export function extractVariableName(variable: string): string {
  return variable.replace(/^\$\{/, '').replace(/\}$/, '');
}

/**
 * 변수가 유효한지 확인
 */
export function isValidVariable(text: string): boolean {
  return /^\$\{[a-zA-Z_][a-zA-Z0-9_]*\}$/.test(text);
}

/**
 * 텍스트에 변수가 포함되어 있는지 확인
 */
export function hasVariables(text: string): boolean {
  return /\$\{[^}]+\}/.test(text);
}

/**
 * 변수 목록 추출
 */
export function extractVariables(text: string): string[] {
  const matches = text.match(/\$\{[^}]+\}/g);
  return matches || [];
}

/**
 * 검색어로 텍스트 하이라이트 세그먼트 생성
 */
export function highlightSearchText(
  text: string,
  searchQuery: string
): Array<{ text: string; highlight: boolean }> {
  if (!searchQuery) {
    return [{ text, highlight: false }];
  }

  const segments: Array<{ text: string; highlight: boolean }> = [];
  const regex = new RegExp(`(${escapeRegExp(searchQuery)})`, 'gi');
  const parts = text.split(regex);

  for (const part of parts) {
    if (part) {
      const isMatch = part.toLowerCase() === searchQuery.toLowerCase();
      segments.push({ text: part, highlight: isMatch });
    }
  }

  return segments;
}

/**
 * 정규식 특수문자 이스케이프
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 텍스트 비교하여 차이점 계산 (간단한 diff)
 */
export function compareTexts(
  original: string,
  modified: string
): {
  isChanged: boolean;
  originalSegments: TextSegment[];
  modifiedSegments: TextSegment[];
} {
  const originalSegments = parseTemplateText(original);
  const modifiedSegments = parseTemplateText(modified);

  const isChanged = original !== modified;

  return {
    isChanged,
    originalSegments,
    modifiedSegments,
  };
}
