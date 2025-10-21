// 템플릿 문자열 처리 유틸리티

/**
 * 스타일 마커 정의
 * - PREVIEW: 파란색, 값이 없어 ${...} 그대로 노출되는 변수
 * - INPUT: 노란색, 미리보기에서 샘플 데이터로 렌더링되는 모든 값
 * - GRAY: 회색, 보조 텍스트
 */
export const STYLE_MARKERS = {
  PREVIEW: {
    start: '<<PREVIEW>>',
    end: '<<PREVIEW_END>>',
  },
  INPUT: {
    start: '<<INPUT>>',
    end: '<<INPUT_END>>',
  },
  GRAY: {
    start: '<<GRAY>>',
    end: '<<GRAY_END>>',
  },
} as const;

/**
 * 템플릿 문자열 내의 ${변수명} 토큰을 컨텍스트 값으로 치환하거나 마커로 감싼다.
 *
 * @param template - 템플릿 문자열 (예: "${fund_name} 결성총회")
 * @param context - 치환할 값들의 객체 (예: { fund_name: "테스트 투자조합" })
 * @param isPreview - 미리보기 모드 여부
 * @returns 치환 및 마킹이 완료된 문자열
 *
 * 동작:
 * - 컨텍스트에 값이 존재하고 비어있지 않으면: 값으로 치환하고 isPreview=true인 경우 <<INPUT>>값<<INPUT_END>>로 감싼다.
 * - 컨텍스트에 값이 없거나 빈 문자열이면: 원형 ${var}를 유지하되 <<PREVIEW>>${var}<<PREVIEW_END>>로 감싼다.
 */
export function renderTemplateString(
  template: string | null | undefined,
  context: Record<string, any>,
  isPreview: boolean
): string {
  // null/undefined 안전 처리
  if (!template) {
    return '';
  }

  // ${변수명} 패턴을 찾아서 치환
  return template.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    const value = context[varName];

    // 값이 존재하고 비어있지 않은 경우
    if (value !== undefined && value !== null && value !== '') {
      const stringValue = String(value);

      // 미리보기 모드면 노란색 마커로 감싸기
      if (isPreview) {
        return `${STYLE_MARKERS.INPUT.start}${stringValue}${STYLE_MARKERS.INPUT.end}`;
      }

      // 실제 생성 모드면 값만 반환
      return stringValue;
    }

    // 값이 없거나 빈 문자열이면 원형 유지하고 파란색 마커로 감싸기
    return `${STYLE_MARKERS.PREVIEW.start}${match}${STYLE_MARKERS.PREVIEW.end}`;
  });
}

/**
 * 미리보기 전용: 사용자 입력값/샘플 데이터 값을 노란색으로 강조
 *
 * @param value - 강조할 값
 * @param isPreview - 미리보기 모드 여부
 * @returns 미리보기 시 노란색 마커로 감싼 값, 아니면 원본
 *
 * 용도: 템플릿 변수가 아닌 직접 렌더링 값(배열 데이터, 계산된 값 등)을 강조할 때 사용
 */
export function wrapInputValueForPreview(
  value: string | number | null | undefined,
  isPreview: boolean
): string {
  if (!isPreview || value === null || value === undefined) {
    return String(value || '');
  }

  const stringValue = String(value);
  return `${STYLE_MARKERS.INPUT.start}${stringValue}${STYLE_MARKERS.INPUT.end}`;
}

/**
 * [Deprecated] 템플릿 변수를 파란색 마커로 감싸기
 *
 * @deprecated renderTemplateString 사용을 권장합니다.
 * 이 함수는 값 존재 여부를 확인하지 않고 무조건 파란색으로 표시합니다.
 */
export function wrapTemplateVariables(template: string): string {
  return template.replace(
    /\$\{([^}]+)\}/g,
    `${STYLE_MARKERS.PREVIEW.start}$\{$1\}${STYLE_MARKERS.PREVIEW.end}`
  );
}
