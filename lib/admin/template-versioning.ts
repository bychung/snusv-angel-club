// 템플릿 버전 관리 및 변경 분석 유틸리티

interface TemplateSection {
  index: number;
  title: string;
  text?: string;
  sub?: TemplateSection[];
  type?: string;
  [key: string]: any;
}

interface TemplateContent {
  type: string;
  sections: TemplateSection[];
  [key: string]: any;
}

export type ChangeType = 'major' | 'minor' | 'patch';

export interface TemplateChange {
  type: ChangeType;
  path: string;
  description: string;
  depth: number;
  oldValue?: string;
  newValue?: string;
  displayPath?: string; // 사용자에게 표시할 경로
}

/**
 * 두 템플릿 섹션을 비교하여 변경사항 분석
 */
export function analyzeTemplateChanges(
  original: TemplateContent,
  modified: TemplateContent
): TemplateChange[] {
  const changes: TemplateChange[] = [];

  // 섹션 비교
  compareSections(
    original.sections || [],
    modified.sections || [],
    [],
    changes
  );

  return changes;
}

/**
 * 재귀적으로 섹션 비교
 * @param sectionPath 섹션의 실제 index와 depth 정보 배열
 */
function compareSections(
  originalSections: TemplateSection[],
  modifiedSections: TemplateSection[],
  path: (string | number)[],
  changes: TemplateChange[],
  sectionPath: Array<{ index: number; depth: number }> = [] // index와 depth를 함께 저장
): void {
  // depth는 'sections'가 나타나는 횟수로 계산 (0부터 시작)
  const depth = path.filter(p => p === 'sections').length;

  // 수정본의 각 항목에 대해 처리
  for (
    let modifiedIdx = 0;
    modifiedIdx < modifiedSections.length;
    modifiedIdx++
  ) {
    const modifiedSection = modifiedSections[modifiedIdx];
    const currentPath = [...path, 'sections', modifiedIdx];

    // 신규 항목인 경우
    if (modifiedSection._isNew) {
      const currentSectionPath = [
        ...sectionPath,
        { index: modifiedSection.index || modifiedIdx + 1, depth },
      ];

      changes.push({
        type: getChangeType(depth),
        path: currentPath.join('.'),
        description: `섹션 추가: "${
          modifiedSection.title ||
          modifiedSection.text?.slice(0, 30) ||
          '(빈 항목)'
        }"`,
        depth,
        displayPath: buildDisplayPath(currentSectionPath, ''),
        oldValue: '', // 신규 항목이므로 기존 값 없음
        newValue: modifiedSection.title || modifiedSection.text || '(빈 항목)', // 추가된 내용
      });
      continue;
    }

    // 기존 항목: 현재 인덱스 이전의 신규 항목 개수를 세어 원본 인덱스 계산
    let newItemsBefore = 0;
    for (let i = 0; i < modifiedIdx; i++) {
      if (modifiedSections[i]._isNew) {
        newItemsBefore++;
      }
    }

    // 원본 인덱스 = 현재 인덱스 - 이전 신규 항목 개수
    const originalIdx = modifiedIdx - newItemsBefore;

    // 범위를 벗어나면 스킵
    if (originalIdx < 0 || originalIdx >= originalSections.length) {
      continue;
    }

    const originalSection = originalSections[originalIdx];
    const currentSectionPath = [
      ...sectionPath,
      { index: modifiedSection.index || modifiedIdx + 1, depth },
    ];

    // 제목 변경
    if (originalSection.title !== modifiedSection.title) {
      changes.push({
        type: getChangeType(depth),
        path: [...currentPath, 'title'].join('.'),
        description: `제목 변경: "${originalSection.title}" → "${modifiedSection.title}"`,
        depth,
        oldValue: originalSection.title,
        newValue: modifiedSection.title,
        displayPath: buildDisplayPath(currentSectionPath, '제목'),
      });
    }

    // 텍스트 변경
    if (originalSection.text !== modifiedSection.text) {
      changes.push({
        type: getChangeType(depth),
        path: [...currentPath, 'text'].join('.'),
        description: `내용 변경`,
        depth,
        oldValue: originalSection.text,
        newValue: modifiedSection.text,
        displayPath: buildDisplayPath(currentSectionPath, '내용'),
      });
    }

    // 하위 섹션 재귀 비교
    if (originalSection.sub || modifiedSection.sub) {
      compareSections(
        originalSection.sub || [],
        modifiedSection.sub || [],
        [...currentPath, 'sub'],
        changes,
        currentSectionPath
      );
    }
  }

  // 삭제된 항목 확인 (원본에는 있지만 수정본에 없는 경우)
  const newItemsCount = modifiedSections.filter(s => s._isNew).length;
  const expectedModifiedCount = originalSections.length + newItemsCount;

  if (modifiedSections.length < expectedModifiedCount) {
    // 삭제가 있음
    const deletedCount = expectedModifiedCount - modifiedSections.length;
    for (let i = 0; i < deletedCount; i++) {
      const deletedOriginalIdx = originalSections.length - deletedCount + i;
      if (
        deletedOriginalIdx >= 0 &&
        deletedOriginalIdx < originalSections.length
      ) {
        const originalSection = originalSections[deletedOriginalIdx];
        const currentPath = [...path, 'sections', deletedOriginalIdx];
        const currentSectionPath = [
          ...sectionPath,
          { index: originalSection.index || deletedOriginalIdx + 1, depth },
        ];

        changes.push({
          type: getChangeType(depth),
          path: currentPath.join('.'),
          description: `섹션 삭제: "${
            originalSection.title || originalSection.text?.slice(0, 30)
          }"`,
          depth,
          displayPath: buildDisplayPath(currentSectionPath, ''),
          oldValue:
            originalSection.title || originalSection.text || '(빈 항목)', // 삭제된 내용
          newValue: '', // 삭제되었으므로 새 값 없음
        });
      }
    }
  }
}

/**
 * 표시용 경로 생성 (장은 생략)
 * @param sectionPath 섹션 인덱스와 depth 정보 배열
 * @param field '제목', '내용' 등
 */
function buildDisplayPath(
  sectionPath: Array<{ index: number; depth: number }>,
  field: string
): string {
  const parts: string[] = [];

  // depth 0 (장)은 생략하고 depth 1부터 표시
  for (const item of sectionPath) {
    if (item.depth === 0) continue; // 장은 생략

    if (item.depth === 1) {
      parts.push(`제${item.index}조`);
    } else if (item.depth === 2) {
      parts.push(`제${item.index}항`);
    } else if (item.depth === 3) {
      parts.push(`제${item.index}호`);
    } else if (item.depth === 4) {
      parts.push(`제${item.index}목`);
    } else {
      parts.push(`제${item.index}항목`);
    }
  }

  if (field) {
    parts.push(field);
  }

  return parts.join(' > ');
}

/**
 * depth에 따른 변경 타입 결정
 * - depth 0~1 (장, 조): major (x.0.0)
 * - depth 2 (항): minor (x.y.0)
 * - depth 3+ (호, 목 등): patch (x.y.z)
 */
function getChangeType(depth: number): ChangeType {
  if (depth <= 1) return 'major';
  if (depth === 2) return 'minor';
  return 'patch';
}

/**
 * 변경사항을 기반으로 새 버전 계산
 */
export function calculateNextVersion(
  currentVersion: string,
  changes: TemplateChange[]
): string {
  const [major, minor, patch] = currentVersion.split('.').map(Number);

  // 가장 높은 우선순위의 변경 타입 찾기
  const hasMajor = changes.some(c => c.type === 'major');
  const hasMinor = changes.some(c => c.type === 'minor');
  const hasPatch = changes.some(c => c.type === 'patch');

  if (hasMajor) {
    return `${major + 1}.0.0`;
  }

  if (hasMinor) {
    return `${major}.${minor + 1}.0`;
  }

  if (hasPatch) {
    return `${major}.${minor}.${patch + 1}`;
  }

  // 변경사항이 없으면 현재 버전 유지
  return currentVersion;
}

/**
 * 변경사항 요약 생성 (참고용)
 * 실제로는 사용자가 직접 커밋 메시지를 입력하도록 되어 있으며,
 * 이 함수는 사용자가 참고할 수 있도록 자동 생성된 요약을 제공합니다.
 */
export function generateChangeDescription(changes: TemplateChange[]): string {
  const majorCount = changes.filter(c => c.type === 'major').length;
  const minorCount = changes.filter(c => c.type === 'minor').length;
  const patchCount = changes.filter(c => c.type === 'patch').length;

  const parts: string[] = [];
  if (majorCount > 0) parts.push(`주요 변경 ${majorCount}건`);
  if (minorCount > 0) parts.push(`부 변경 ${minorCount}건`);
  if (patchCount > 0) parts.push(`경미한 변경 ${patchCount}건`);

  return parts.join(', ');
}

/**
 * 섹션 경로를 사람이 읽을 수 있는 형태로 변환
 */
export function formatSectionPath(path: string): string {
  // "sections.0.sub.1.text" → "제1장 > 제2조"
  const parts = path.split('.');
  const indices: number[] = [];

  for (let i = 0; i < parts.length; i++) {
    if (!isNaN(Number(parts[i]))) {
      indices.push(Number(parts[i]));
    }
  }

  return indices
    .map((idx, level) => {
      if (level === 0) return `제${idx + 1}장`;
      if (level === 1) return `제${idx + 1}조`;
      if (level === 2) return `제${idx + 1}항`;
      if (level === 3) return `제${idx + 1}호`;
      return `제${idx + 1}목`;
    })
    .join(' > ');
}

/**
 * 섹션 경로에서 depth 레벨 가져오기
 */
export function getSectionDepth(path: string): number {
  const parts = path.split('.');
  let depth = 0;

  for (let i = 0; i < parts.length; i++) {
    if (!isNaN(Number(parts[i]))) {
      depth++;
    }
  }

  return depth;
}

/**
 * depth에 따른 한글 라벨 가져오기 (단수형)
 */
export function getDepthLabel(depth: number): string {
  const labels = ['장', '조', '항', '호', '목'];
  return labels[depth - 1] || '항목';
}

/**
 * 섹션 경로와 섹션 정보로부터 전체 라벨 생성
 * 예: "제1장 총칙", "제4조 목적"
 * 음수 인덱스(부칙 등)는 제목만 표시
 */
export function getSectionFullLabel(
  sectionIndex: number,
  depth: number,
  sectionTitle: string
): string {
  // 음수 인덱스는 제목만 표시 (예: 부칙)
  if (sectionIndex < 0) {
    return sectionTitle;
  }

  const depthLabel = getDepthLabel(depth);
  return `제${sectionIndex}${depthLabel} ${sectionTitle}`;
}
