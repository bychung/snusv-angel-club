// 문서 버전 간 Diff 생성 및 분석
import * as jsondiff from 'jsondiffpatch';
import { getFundDocumentById } from './fund-documents';

export interface DocumentChange {
  path: string; // 예: "articles[2].content"
  type: 'added' | 'removed' | 'modified';
  oldValue?: string;
  newValue?: string;
  displayPath?: string; // 사용자 친화적 경로명
}

export interface DocumentDiff {
  fromVersion: number;
  toVersion: number;
  changes: DocumentChange[];
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
  'processedAt',
  'generatedAt',
  'timestamp',
  'created_at',
  'updated_at',
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
 * 두 문서 버전을 비교하여 변경사항 추출
 */
export async function compareDocumentVersions(
  fromDocId: string,
  toDocId: string
): Promise<DocumentDiff> {
  // 1. 두 문서 조회
  const [fromDoc, toDoc] = await Promise.all([
    getFundDocumentById(fromDocId),
    getFundDocumentById(toDocId),
  ]);

  if (!fromDoc || !toDoc) {
    throw new Error('문서를 찾을 수 없습니다');
  }

  console.log('fromDoc', fromDoc.generation_context);
  console.log('toDoc', toDoc.generation_context);

  // 2. 비교 대상 데이터 준비 (content + context)
  const fromData = {
    content: fromDoc.processed_content,
    context: fromDoc.generation_context,
  };

  const toData = {
    content: toDoc.processed_content,
    context: toDoc.generation_context,
  };

  // 3. 비교에서 제외할 필드 제거
  const sanitizedFromData = sanitizeForComparison(fromData);
  const sanitizedToData = sanitizeForComparison(toData);

  console.log('sanitizedFromData', sanitizedFromData);
  console.log('sanitizedToData', sanitizedToData);

  // 4. jsondiffpatch로 diff 생성
  const differ = jsondiff.create({
    objectHash: (obj: any) => obj.id || obj.title || JSON.stringify(obj),
    arrays: { detectMove: false }, // 배열 이동 무시
  });

  const delta = differ.diff(sanitizedFromData, sanitizedToData);

  console.log('delta', delta);

  if (!delta) {
    return {
      fromVersion: fromDoc.version_number,
      toVersion: toDoc.version_number,
      changes: [],
      summary: { added: 0, removed: 0, modified: 0 },
    };
  }

  // 5. Delta를 변경사항 배열로 변환
  const changes = extractChanges(delta, sanitizedFromData);

  // 6. 요약 정보 생성
  const summary = {
    added: changes.filter(c => c.type === 'added').length,
    removed: changes.filter(c => c.type === 'removed').length,
    modified: changes.filter(c => c.type === 'modified').length,
  };

  return {
    fromVersion: fromDoc.version_number,
    toVersion: toDoc.version_number,
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
  basePath: string = ''
): DocumentChange[] {
  const changes: DocumentChange[] = [];

  for (const key in delta) {
    const value = delta[key];
    const currentPath = basePath ? `${basePath}.${key}` : key;

    if (Array.isArray(value)) {
      if (value.length === 1) {
        // 추가된 값
        changes.push({
          path: currentPath,
          type: 'added',
          newValue: formatValue(value[0]),
          displayPath: getDisplayPath(currentPath),
        });
      } else if (value.length === 2) {
        // 수정된 값
        changes.push({
          path: currentPath,
          type: 'modified',
          oldValue: formatValue(value[0]),
          newValue: formatValue(value[1]),
          displayPath: getDisplayPath(currentPath),
        });
      } else if (value.length === 3 && value[2] === 0) {
        // 삭제된 값
        changes.push({
          path: currentPath,
          type: 'removed',
          oldValue: formatValue(value[0]),
          displayPath: getDisplayPath(currentPath),
        });
      }
    } else if (typeof value === 'object' && value !== null && !value._t) {
      // 중첩된 객체 - 재귀 호출 (_t는 배열 변경 표시)
      const nestedChanges = extractChanges(
        value,
        originalContent?.[key],
        currentPath
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
  if (typeof value === 'string') {
    // 너무 긴 문자열은 자르기
    if (value.length > 200) {
      return value.substring(0, 200) + '...';
    }
    return value;
  }
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? '예' : '아니오';
  if (value === null) return '(없음)';
  if (typeof value === 'object') {
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
 * 경로를 사용자 친화적 이름으로 변환
 */
function getDisplayPath(path: string): string {
  // content. 또는 context. 접두사 제거
  let cleanPath = path.replace(/^(content|context)\./, '');

  // 기본 매핑
  const pathMapping: Record<string, string> = {
    // Context 관련
    fundName: '펀드명',
    'fund.name': '펀드명',
    'fund.address': '펀드 주소',
    'fund.total_cap': '총출자금액',
    'fund.initial_cap': '초기 출자금액',
    'fund.par_value': '1좌당 금액',
    'fund.closed_at': '결성일',
    'fund.duration': '존속기간',
    'fund.payment_schedule': '출자방식',
    members: '조합원 정보',
    membersCount: '조합원 수',
    totalCap: '총 출자금액',
    'gp.name': '업무집행조합원',
    'gp.address': '업무집행조합원 주소',
    'user.name': '사용자명',
    'user.email': '사용자 이메일',
  };

  // 매핑된 경로가 있으면 반환
  if (pathMapping[cleanPath]) {
    return pathMapping[cleanPath];
  }

  // 배열 인덱스 처리 (예: articles.0 -> 제1조)
  const articleMatch = cleanPath.match(/articles\.(\d+)\.?(.*)$/);
  if (articleMatch) {
    const index = parseInt(articleMatch[1]);
    const subPath = articleMatch[2];
    const articleName = `제${index + 1}조`;

    if (subPath) {
      const subMapping: Record<string, string> = {
        title: '제목',
        content: '내용',
        number: '번호',
        text: '내용',
      };
      return `${articleName} - ${subMapping[subPath] || subPath}`;
    }
    return articleName;
  }

  // 멤버 관련 처리 (예: members.0.name -> 조합원 1 - 이름)
  const memberMatch = cleanPath.match(/members\.(\d+)\.(.+)$/);
  if (memberMatch) {
    const index = parseInt(memberMatch[1]);
    const field = memberMatch[2];
    const fieldMapping: Record<string, string> = {
      name: '이름',
      units: '출자좌수',
      amount: '출자금액',
      total_units: '총 출자좌수',
      total_amount: '총 출자금액',
      initial_amount: '초기 출자금액',
      member_type: '조합원 유형',
    };
    return `조합원 ${index + 1} - ${fieldMapping[field] || field}`;
  }

  // sections 처리 (예: sections.0.title)
  const sectionMatch = cleanPath.match(/sections\.(\d+)\.(.+)$/);
  if (sectionMatch) {
    const index = parseInt(sectionMatch[1]);
    const field = sectionMatch[2];
    const fieldMapping: Record<string, string> = {
      title: '제목',
      text: '내용',
      index: '순서',
    };
    return `섹션 ${index + 1} - ${fieldMapping[field] || field}`;
  }

  // 기본: 경로를 그대로 표시 (점 대신 화살표로)
  return cleanPath.replace(/\./g, ' → ');
}
