// 템플릿 버전 간 Diff 생성 및 분석
import * as jsondiff from 'jsondiffpatch';
import { getTemplateById } from './document-templates';

export interface TemplateChange {
  path: string; // 예: "sections[2].title"
  type: 'added' | 'removed' | 'modified';
  oldValue?: string;
  newValue?: string;
  displayPath?: string; // 사용자 친화적 경로명
}

export interface TemplateDiff {
  fromVersion: string;
  toVersion: string;
  changes: TemplateChange[];
  summary: {
    added: number;
    removed: number;
    modified: number;
  };
}

/**
 * 비교에서 제외할 필드 목록
 */
const EXCLUDED_FIELDS = [
  'id',
  'created_at',
  'updated_at',
  'is_active',
  'created_by',
  'fund_id',
  'version', // 버전은 당연히 바뀌므로 제외
  'description', // 설명도 당연히 바뀌므로 제외
];

/**
 * 비교용 데이터 정제 (제외할 필드 제거)
 */
function sanitizeForComparison(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForComparison(item));
  }

  const sanitized: any = {};
  for (const key in obj) {
    if (!EXCLUDED_FIELDS.includes(key)) {
      sanitized[key] = sanitizeForComparison(obj[key]);
    }
  }
  return sanitized;
}

/**
 * 두 템플릿 버전을 비교하여 변경사항 추출
 */
export async function compareTemplateVersions(
  fromTemplateId: string,
  toTemplateId: string
): Promise<TemplateDiff> {
  // 1. 두 템플릿 조회
  const [fromTemplate, toTemplate] = await Promise.all([
    getTemplateById(fromTemplateId),
    getTemplateById(toTemplateId),
  ]);

  if (!fromTemplate || !toTemplate) {
    throw new Error('템플릿을 찾을 수 없습니다');
  }

  // 타입이 다른 템플릿은 비교 불가
  if (fromTemplate.type !== toTemplate.type) {
    throw new Error('다른 타입의 템플릿은 비교할 수 없습니다');
  }

  // 2. 비교 대상 데이터 준비 (content + appendix만, version/description 제외)
  const fromData = {
    content: fromTemplate.content,
    appendix: fromTemplate.appendix,
  };

  const toData = {
    content: toTemplate.content,
    appendix: toTemplate.appendix,
  };

  // 3. 비교에서 제외할 필드 제거
  const sanitizedFromData = sanitizeForComparison(fromData);
  const sanitizedToData = sanitizeForComparison(toData);

  // 4. jsondiffpatch로 diff 생성
  const differ = jsondiff.create({
    objectHash: (obj: any) =>
      obj.index || obj.id || obj.title || JSON.stringify(obj),
    arrays: { detectMove: false }, // 배열 이동 무시
  });

  const delta = differ.diff(sanitizedFromData, sanitizedToData);

  if (!delta) {
    return {
      fromVersion: fromTemplate.version,
      toVersion: toTemplate.version,
      changes: [],
      summary: { added: 0, removed: 0, modified: 0 },
    };
  }

  // 5. Delta를 변경사항 배열로 변환 (원본 템플릿을 rootContent로 전달)
  const changes = extractChanges(
    delta,
    sanitizedFromData,
    '',
    sanitizedFromData
  );

  // 6. 요약 정보 생성
  const summary = {
    added: changes.filter(c => c.type === 'added').length,
    removed: changes.filter(c => c.type === 'removed').length,
    modified: changes.filter(c => c.type === 'modified').length,
  };

  return {
    fromVersion: fromTemplate.version,
    toVersion: toTemplate.version,
    changes,
    summary,
  };
}

/**
 * jsondiffpatch delta를 변경사항 배열로 변환
 */
function extractChanges(
  delta: any,
  originalContent: any,
  basePath: string = '',
  rootContent?: any
): TemplateChange[] {
  const changes: TemplateChange[] = [];

  // 최초 호출시 rootContent 설정
  if (!rootContent) {
    rootContent = originalContent;
  }

  for (const key in delta) {
    // _t 키는 배열 타입 표시자이므로 건너뜀
    if (key === '_t') continue;

    const value = delta[key];
    const currentPath = basePath ? `${basePath}.${key}` : key;

    if (Array.isArray(value)) {
      if (value.length === 1) {
        // 추가된 값
        changes.push({
          path: currentPath,
          type: 'added',
          newValue: formatValue(value[0]),
          displayPath: getDisplayPath(currentPath, rootContent),
        });
      } else if (value.length === 2) {
        // 수정된 값
        changes.push({
          path: currentPath,
          type: 'modified',
          oldValue: formatValue(value[0]),
          newValue: formatValue(value[1]),
          displayPath: getDisplayPath(currentPath, rootContent),
        });
      } else if (value.length === 3 && value[2] === 0) {
        // 삭제된 값
        changes.push({
          path: currentPath,
          type: 'removed',
          oldValue: formatValue(value[0]),
          displayPath: getDisplayPath(currentPath, rootContent),
        });
      }
    } else if (typeof value === 'object' && value !== null) {
      // 중첩된 객체 또는 배열 변경 - 재귀 호출
      // _t가 있어도 내부의 변경사항을 추출해야 함
      const nestedChanges = extractChanges(
        value,
        originalContent?.[key],
        currentPath,
        rootContent
      );
      changes.push(...nestedChanges);
    }
  }

  return changes;
}

/**
 * 값을 사용자가 읽기 쉬운 형식으로 변환
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) return '(없음)';

  if (typeof value === 'string') {
    // 빈 문자열
    if (value.length === 0) return '(빈 문자열)';
    // 너무 긴 문자열은 자르기
    if (value.length > 200) {
      return value.substring(0, 200) + '...';
    }
    return value;
  }

  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? '예' : '아니오';

  if (typeof value === 'object') {
    // 빈 배열
    if (Array.isArray(value) && value.length === 0) {
      return '(빈 배열)';
    }
    // 빈 객체
    if (Object.keys(value).length === 0) {
      return '(빈 객체)';
    }
    // 객체나 배열은 JSON으로 변환 (들여쓰기)
    const json = JSON.stringify(value, null, 2);
    if (json.length > 200) {
      return json.substring(0, 200) + '...';
    }
    return json;
  }

  return String(value);
}

/**
 * 경로에서 실제 섹션 인덱스를 조회
 */
function getSectionIndexByPath(
  rootContent: any,
  fullPath: string
): number | null {
  if (!rootContent) return null;

  const segments = fullPath.split('.');
  let current = rootContent;

  for (const segment of segments) {
    if (!current) return null;

    // 배열 인덱스인 경우
    if (/^\d+$/.test(segment)) {
      const arrayIndex = parseInt(segment);
      if (Array.isArray(current)) {
        current = current[arrayIndex];
      } else {
        return null;
      }
    } else {
      // 객체 키인 경우
      current = current[segment];
    }
  }

  // 현재 객체에 index 필드가 있으면 반환
  if (current && typeof current === 'object' && 'index' in current) {
    return current.index;
  }

  return null;
}

/**
 * 경로를 사용자 친화적 이름으로 변환
 */
function getDisplayPath(path: string, rootContent?: any): string {
  // 필드명 매핑
  const fieldMapping: Record<string, string> = {
    title: '제목',
    text: '내용',
    index: '순서',
    type: '타입',
    filter: '필터',
    id: 'ID',
  };

  // content. 또는 appendix. 접두사 확인
  let prefix = '';
  let workPath = path;

  if (path.startsWith('content.')) {
    prefix = '본문';
    workPath = path.substring('content.'.length);
  } else if (path.startsWith('appendix.')) {
    prefix = '부칙';
    workPath = path.substring('appendix.'.length);
  } else if (path === 'appendix') {
    return '부칙';
  } else if (path === 'content') {
    return '본문';
  }

  // appendix 배열 항목 처리
  if (prefix === '부칙') {
    const appendixItemMatch = workPath.match(/^(\d+)\.(.+)$/);
    if (appendixItemMatch) {
      const index = parseInt(appendixItemMatch[1]);
      const field = appendixItemMatch[2];
      return `${prefix} ${index + 1}번 - ${fieldMapping[field] || field}`;
    }
    if (!workPath || workPath === '.' || workPath === '') {
      return prefix;
    }
  }

  // sections 경로 분석 (예: sections.3.sub.25.sub.0.text)
  const sectionsMatch = workPath.match(/^sections\.(\d+)\.(.+)$/);
  if (sectionsMatch && rootContent) {
    const sectionArrayIndex = parseInt(sectionsMatch[1]);
    const remainingPath = sectionsMatch[2]; // 예: "sub.25.sub.0.text"

    // 필드명 추출 (마지막 부분)
    const parts = remainingPath.split('.');
    const fieldName = parts[parts.length - 1];
    const displayFieldName = fieldMapping[fieldName] || fieldName;

    // sub 계층 구조 파싱
    const subIndices: number[] = [];
    let tempPath = remainingPath;

    while (true) {
      const match = tempPath.match(/^sub\.(\d+)\.(.+)$/);
      if (match) {
        subIndices.push(parseInt(match[1]));
        tempPath = match[2];
      } else {
        break;
      }
    }

    // getSectionIndexByPath를 통해 실제 index 값 조회
    let basePath = `content.sections.${sectionArrayIndex}`;

    if (subIndices.length === 0) {
      // sections.X.field 형태 (장 레벨)
      const sectionIndex = getSectionIndexByPath(rootContent, basePath);
      if (sectionIndex !== null) {
        return `제${sectionIndex}조 - ${displayFieldName}`;
      }
    } else if (subIndices.length === 1) {
      // sections.X.sub.Y.field 형태 (조 레벨)
      basePath += `.sub.${subIndices[0]}`;
      const articleIndex = getSectionIndexByPath(rootContent, basePath);
      if (articleIndex !== null) {
        return `제${articleIndex}조 - ${displayFieldName}`;
      }
    } else if (subIndices.length >= 2) {
      // sections.X.sub.Y.sub.Z.field 형태 (항 레벨)
      const articlePath = basePath + `.sub.${subIndices[0]}`;
      const itemPath = articlePath + `.sub.${subIndices[1]}`;

      const articleIndex = getSectionIndexByPath(rootContent, articlePath);
      const itemIndex = getSectionIndexByPath(rootContent, itemPath);

      if (articleIndex !== null && itemIndex !== null) {
        return `제${articleIndex}조 ${itemIndex}항 - ${displayFieldName}`;
      }
    }
  }

  // fallback: 경로를 그대로 표시
  const displayPath = workPath.replace(/\./g, ' → ');
  return prefix ? `${prefix} → ${displayPath}` : displayPath;
}
