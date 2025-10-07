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
 */
function compareSections(
  originalSections: TemplateSection[],
  modifiedSections: TemplateSection[],
  path: (string | number)[],
  changes: TemplateChange[]
): void {
  const depth = path.filter(p => typeof p === 'number').length + 1;

  // 섹션 개수 변경 확인
  if (originalSections.length !== modifiedSections.length) {
    changes.push({
      type: getChangeType(depth),
      path: path.join('.'),
      description: `섹션 개수 변경 (${originalSections.length} → ${modifiedSections.length})`,
      depth,
    });
  }

  // 각 섹션 비교
  const maxLength = Math.max(originalSections.length, modifiedSections.length);

  for (let i = 0; i < maxLength; i++) {
    const originalSection = originalSections[i];
    const modifiedSection = modifiedSections[i];

    const currentPath = [...path, 'sections', i];

    // 섹션 추가
    if (!originalSection && modifiedSection) {
      changes.push({
        type: getChangeType(depth),
        path: currentPath.join('.'),
        description: `섹션 추가: "${
          modifiedSection.title || modifiedSection.text?.slice(0, 30)
        }"`,
        depth,
      });
      continue;
    }

    // 섹션 삭제
    if (originalSection && !modifiedSection) {
      changes.push({
        type: getChangeType(depth),
        path: currentPath.join('.'),
        description: `섹션 삭제: "${
          originalSection.title || originalSection.text?.slice(0, 30)
        }"`,
        depth,
      });
      continue;
    }

    // 섹션 내용 변경
    if (originalSection && modifiedSection) {
      // 제목 변경
      if (originalSection.title !== modifiedSection.title) {
        changes.push({
          type: getChangeType(depth),
          path: [...currentPath, 'title'].join('.'),
          description: `제목 변경: "${originalSection.title}" → "${modifiedSection.title}"`,
          depth,
        });
      }

      // 텍스트 변경
      if (originalSection.text !== modifiedSection.text) {
        changes.push({
          type: getChangeType(depth),
          path: [...currentPath, 'text'].join('.'),
          description: `내용 변경`,
          depth,
        });
      }

      // 하위 섹션 재귀 비교
      if (originalSection.sub || modifiedSection.sub) {
        compareSections(
          originalSection.sub || [],
          modifiedSection.sub || [],
          [...currentPath, 'sub'],
          changes
        );
      }
    }
  }
}

/**
 * depth에 따른 변경 타입 결정
 * - depth 1~2 (장, 조): major (x.0.0)
 * - depth 3 (항): minor (x.y.0)
 * - depth 4+ (호, 목 등): patch (x.y.z)
 */
function getChangeType(depth: number): ChangeType {
  if (depth <= 2) return 'major';
  if (depth === 3) return 'minor';
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
 * 변경사항 요약 생성
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
