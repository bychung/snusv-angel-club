import { tryFont } from './template-font';
import { processTemplateVariables } from './template-processor';
import { STYLE_MARKERS } from './template-utils';
import { AppendixContentElement, LPAContext } from './types';

/* -------------------- export functions, types, etc... -------------------*/

/**
 * 별지 헤더 렌더링
 */
export function renderAppendixHeader(doc: any, headerText: string): void {
  const pageMargin = 50;

  doc.fontSize(10);
  tryFont(doc, '맑은고딕', 'NanumGothic');
  doc.text(headerText, pageMargin, doc.y, {
    width: doc.page.width - pageMargin * 2,
    align: 'left',
  });
  doc.moveDown(2);
}

/**
 * 별지 타이틀 렌더링
 */
export function renderAppendixTitle(doc: any, title: string): void {
  const pageMargin = 50;

  doc.fontSize(16);
  tryFont(doc, '맑은고딕-Bold', 'NanumGothicBold');
  doc.text(title, pageMargin, doc.y, {
    width: doc.page.width - pageMargin * 2,
    align: 'center',
  });
  doc.moveDown(2);
}

/**
 * 별지 컨텐츠 요소 렌더링
 */
export async function renderAppendixContentElement(
  doc: any,
  element: AppendixContentElement,
  context: LPAContext
): Promise<void> {
  const pageMargin = 50;
  const isEmpty = isEmptyForm(context);

  switch (element.type) {
    case 'paragraph': {
      let processedText = processTemplateVariables(element.text || '', context);

      // 빈 양식이면 PREVIEW 마커 제거
      if (isEmpty) {
        processedText = cleanEmptyFormText(processedText);
      }

      doc.fontSize(11);
      tryFont(doc, '맑은고딕', 'NanumGothic');
      renderStyledText(
        doc,
        processedText,
        pageMargin,
        doc.y,
        {
          width: doc.page.width - pageMargin * 2,
          align: (element.align || 'left') as any,
          lineGap: 2,
        },
        {
          regular: '맑은고딕',
          bold: '맑은고딕-Bold',
        }
      );
      doc.moveDown(1);
      break;
    }

    case 'form-fields': {
      doc.fontSize(11);
      tryFont(doc, '맑은고딕', 'NanumGothic');

      for (const field of element.fields || []) {
        let value = processTemplateVariables(field.variable, context);

        // 빈 양식이면 PREVIEW 마커와 0 값 제거
        if (isEmpty) {
          value = cleanEmptyFormText(value);
        }

        // 법인의 경우 "생년월일" 레이블을 "사업자번호"로 변경
        let displayLabel = field.label;
        if (field.label === '생년월일' && context.currentMember) {
          const member = context.currentMember as any;
          if (member.entity_type === 'corporate') {
            displayLabel = '사업자번호';
          }
        }

        const labelText = field.seal
          ? `${displayLabel} : ${value}    (인)`
          : `${displayLabel} : ${value}`;

        // 스타일 마커 처리를 위해 renderStyledText 사용
        renderStyledText(
          doc,
          labelText,
          pageMargin + 20,
          doc.y,
          {
            width: doc.page.width - pageMargin * 2 - 20,
            align: 'left' as any,
            lineGap: 0,
          },
          {
            regular: '맑은고딕',
            bold: '맑은고딕-Bold',
          }
        );
        doc.moveDown(0.5);
      }
      break;
    }

    case 'spacer': {
      doc.moveDown(element.lines || 1);
      break;
    }

    case 'date-field': {
      doc.fontSize(11);
      tryFont(doc, '맑은고딕', 'NanumGothic');
      doc.text(element.format || '년    월    일', pageMargin, doc.y, {
        width: doc.page.width - pageMargin * 2,
        align: 'center',
      });
      doc.moveDown(1);
      break;
    }
  }
}

/**
 * 페이지 하단에 페이지 번호 추가
 */
export function addPageFooter(doc: any, pageNumber: number): void {
  if (pageNumber === 1) return; // 첫 페이지는 페이지 번호 없음

  const currentY = doc.y;
  const footerY = doc.page.height - 50;

  doc.fontSize(10);
  tryFont(doc, '맑은고딕', 'NanumGothic');
  doc.text(`- ${pageNumber} -`, 50, footerY, {
    width: doc.page.width - 100,
    align: 'center',
  });

  doc.y = currentY;
}

/**
 * 스타일 마커를 적용하여 텍스트 렌더링 (줄바꿈, 색상, 볼드, 이탤릭 지원)
 */
export function renderStyledText(
  doc: any,
  text: string,
  x: number,
  y: number,
  options: any,
  baseFont: {
    regular: string;
    bold: string;
    italic?: string;
    boldItalic?: string;
  }
): void {
  // 스타일 마커가 없으면 일반 렌더링
  const hasAnyMarker = Object.values(STYLE_MARKERS).some(marker =>
    text.includes(marker.start)
  );

  if (!hasAnyMarker) {
    doc.text(text, x, y, options);
    return;
  }

  // 줄바꿈으로 먼저 분리
  const lines = text.split('\n');

  // 첫 줄만 위치 지정, 나머지는 자동 줄바꿈
  lines.forEach((line, lineIndex) => {
    const segments = parseStyleMarkers(line);

    // 이 줄에 스타일이 없으면 일반 렌더링
    const hasStyle = segments.some(
      s => s.styles.color !== '#000000' || s.styles.bold || s.styles.italic
    );

    if (!hasStyle) {
      if (lineIndex === 0) {
        doc.text(line, x, y, { ...options });
      } else {
        doc.text(line, { ...options });
      }
    } else {
      // 스타일이 섞인 줄 처리
      const hasAlign =
        options &&
        options.width &&
        (options.align === 'right' || options.align === 'center');

      if (hasAlign) {
        // 우측/가운데 정렬 시: 세그먼트들을 절대 좌표로 이어붙여 한 줄에 정확히 배치
        // 1) 세그먼트 폭 측정 (세그먼트별 폰트 적용 상태에서)
        const widths: number[] = [];
        segments.forEach(seg => {
          if (seg.styles.bold && seg.styles.italic && baseFont.boldItalic) {
            tryFont(doc, baseFont.boldItalic, 'Helvetica-BoldOblique');
          } else if (seg.styles.bold) {
            tryFont(doc, baseFont.bold, 'Helvetica-Bold');
          } else if (seg.styles.italic && baseFont.italic) {
            tryFont(doc, baseFont.italic, 'Helvetica-Oblique');
          } else {
            tryFont(doc, baseFont.regular, 'Helvetica');
          }
          widths.push(doc.widthOfString(seg.text || ''));
        });

        // 2) 전체 폭과 시작 X 계산
        const totalWidth = widths.reduce((a, b) => a + b, 0);
        let startX = x;
        if (options.align === 'right') {
          startX = x + (options.width as number) - totalWidth;
        } else if (options.align === 'center') {
          startX = x + ((options.width as number) - totalWidth) / 2;
        }

        // 3) 절대 좌표로 이어붙이기 (align/width 옵션 없이)
        const baseY = lineIndex === 0 ? y : doc.y;
        const savedY = doc.y;
        let cursorX = startX;
        segments.forEach((seg, i) => {
          if (!seg.text) return;

          if (seg.styles.bold && seg.styles.italic && baseFont.boldItalic) {
            tryFont(doc, baseFont.boldItalic, 'Helvetica-BoldOblique');
          } else if (seg.styles.bold) {
            tryFont(doc, baseFont.bold, 'Helvetica-Bold');
          } else if (seg.styles.italic && baseFont.italic) {
            tryFont(doc, baseFont.italic, 'Helvetica-Oblique');
          } else {
            tryFont(doc, baseFont.regular, 'Helvetica');
          }
          doc.fillColor(seg.styles.color);

          // 절대 좌표로 배치; lineBreak: false로 줄바꿈 방지
          doc.text(seg.text, cursorX, baseY, { lineBreak: false });
          cursorX += widths[i] || 0;
        });

        // 다음 줄로 진행되도록 y를 한 줄 내린다
        doc.y = savedY;
        doc.moveDown(1);

        // 복원
        tryFont(doc, baseFont.regular, 'Helvetica');
        doc.fillColor('#000000');
      } else {
        // 정렬 없으면 기존 방식
        if (lineIndex === 0) {
          doc.text('', x, y, { ...options, continued: true });
        } else {
          doc.text('', { ...options, continued: true });
        }

        segments.forEach((segment, segmentIndex) => {
          if (!segment.text) return;
          if (
            segment.styles.bold &&
            segment.styles.italic &&
            baseFont.boldItalic
          ) {
            tryFont(doc, baseFont.boldItalic, 'Helvetica-BoldOblique');
          } else if (segment.styles.bold) {
            tryFont(doc, baseFont.bold, 'Helvetica-Bold');
          } else if (segment.styles.italic && baseFont.italic) {
            tryFont(doc, baseFont.italic, 'Helvetica-Oblique');
          } else {
            tryFont(doc, baseFont.regular, 'Helvetica');
          }
          doc.fillColor(segment.styles.color);

          const isLast = segmentIndex === segments.length - 1;
          doc.text(segment.text, { continued: !isLast });
        });

        tryFont(doc, baseFont.regular, 'Helvetica');
        doc.fillColor('#000000');
      }
    }
  });
}

/**
 * 텍스트에서 스타일 마커를 파싱하여 세그먼트로 분리
 * 여러 스타일을 중첩해서 사용 가능
 */
export function parseStyleMarkers(text: string): StyledSegment[] {
  const segments: StyledSegment[] = [];

  // 모든 마커의 정규식을 생성
  const markerPatterns = Object.entries(STYLE_MARKERS).map(
    ([type, config]) => ({
      type: type as StyleType,
      start: config.start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      end: config.end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      config,
    })
  );

  // 마커가 있는지 확인
  const hasMarker = markerPatterns.some(p => text.includes(p.config.start));

  if (!hasMarker) {
    // 마커가 없으면 일반 텍스트로 반환
    return [
      {
        text,
        styles: {
          color: '#000000',
          bold: false,
          italic: false,
        },
      },
    ];
  }

  // 모든 마커 위치 찾기
  interface MarkerPosition {
    index: number;
    isStart: boolean;
    type: StyleType;
    markerLength: number;
  }

  const markers: MarkerPosition[] = [];

  markerPatterns.forEach(({ type, config }) => {
    let pos = 0;
    while ((pos = text.indexOf(config.start, pos)) !== -1) {
      markers.push({
        index: pos,
        isStart: true,
        type,
        markerLength: config.start.length,
      });
      pos += config.start.length;
    }

    pos = 0;
    while ((pos = text.indexOf(config.end, pos)) !== -1) {
      markers.push({
        index: pos,
        isStart: false,
        type,
        markerLength: config.end.length,
      });
      pos += config.end.length;
    }
  });

  // 위치순으로 정렬
  markers.sort((a, b) => a.index - b.index);

  // 스타일 스택 (중첩 지원)
  const activeStyles: Set<StyleType> = new Set();
  let lastIndex = 0;

  markers.forEach(marker => {
    // 마커 전의 텍스트 추출
    if (marker.index > lastIndex) {
      const segmentText = text.substring(lastIndex, marker.index);
      const currentStyles = computeStyles(activeStyles);
      segments.push({
        text: segmentText,
        styles: currentStyles,
      });
    }

    // 스타일 스택 업데이트
    if (marker.isStart) {
      activeStyles.add(marker.type);
    } else {
      activeStyles.delete(marker.type);
    }

    lastIndex = marker.index + marker.markerLength;
  });

  // 남은 텍스트
  if (lastIndex < text.length) {
    const segmentText = text.substring(lastIndex);
    const currentStyles = computeStyles(activeStyles);
    segments.push({
      text: segmentText,
      styles: currentStyles,
    });
  }

  return segments;
}

/* -------------------- none-export functions, types, etc... -------------------*/

/**
 * 스타일이 적용된 텍스트 세그먼트
 */
interface StyledSegment {
  text: string;
  styles: {
    color: string;
    bold: boolean;
    italic: boolean;
  };
}

type StyleType = keyof typeof STYLE_MARKERS;

/**
 * 빈 양식인지 확인 (조합원 정보가 모두 비어있는지)
 */
function isEmptyForm(context: LPAContext): boolean {
  if (!context.currentMember) return false;
  const member = context.currentMember as any;
  return (
    member.name === '' &&
    !member.address &&
    !member.total_units &&
    !member.phone &&
    !member.birth_date &&
    !member.business_number
  );
}

/**
 * 빈 양식용 텍스트 정리 (PREVIEW 마커 제거, 좌수 값 제거)
 */
function cleanEmptyFormText(text: string): string {
  // PREVIEW 마커 제거
  let cleaned = text
    .replace(/<<PREVIEW>>/g, '')
    .replace(/<<PREVIEW_END>>/g, '');
  // 좌수 패턴 제거 (숫자가 있든 없든 "좌" 제거)
  cleaned = cleaned.replace(/[0-9]*\s*좌/g, '');
  return cleaned;
}

/**
 * 활성화된 스타일들을 합성하여 최종 스타일 계산
 */
function computeStyles(activeStyles: Set<StyleType>): {
  color: string;
  bold: boolean;
  italic: boolean;
} {
  let color = '#000000';
  let bold = false;
  let italic = false;

  // 스타일 우선순위: 나중에 추가된 것이 우선
  activeStyles.forEach(styleType => {
    const style = STYLE_MARKERS[styleType];
    if (style.color !== undefined && style.color !== '#000000') {
      color = style.color;
    }
    if (style.bold !== undefined && style.bold) {
      bold = true;
    }
    if (style.italic !== undefined && style.italic) {
      italic = true;
    }
  });

  return { color, bold, italic };
}
