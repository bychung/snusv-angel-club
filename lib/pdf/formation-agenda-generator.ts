// 결성총회 의안 PDF 생성기

import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import type { FormationAgendaContent } from '../../types/assemblies';
import { FORMATION_AGENDA_CONFIG } from './formation-agenda-config';
import { getFontPath } from './template-font';
import {
  renderTemplateString,
  STYLE_MARKERS,
  wrapInputValueForPreview,
} from './template-utils';

interface FormationAgendaData {
  fund_name: string;
  assembly_date: string; // YYYY-MM-DD
  content: FormationAgendaContent;
  template?: any; // 템플릿 (선택사항, 없으면 기본값 사용)
  isPreview?: boolean; // 미리보기 모드 (true: 마커 표시, false/undefined: 마커 미표시)
}

// 스타일 마커 색상 정의
const STYLE_MARKER_COLORS = {
  PREVIEW: {
    color: '#0066CC', // 파란색 - 값이 없어 ${...} 그대로 노출되는 변수
    bold: false,
    italic: false,
  },
  INPUT: {
    color: '#FFC107', // 노란색 - 미리보기에서 샘플 데이터로 렌더링되는 모든 값
    bold: false,
    italic: false,
  },
  GRAY: {
    color: '#999999', // 회색 - 보조 텍스트
    bold: false,
    italic: false,
  },
} as const;

type StyleType = keyof typeof STYLE_MARKER_COLORS;

interface StyledSegment {
  text: string;
  styles: {
    color: string;
    bold: boolean;
    italic: boolean;
  };
}

/**
 * 한글 폰트 등록
 */
function registerKoreanFonts(doc: any): void {
  try {
    const fontDir = path.join(process.cwd(), 'lib', 'pdf', 'fonts');

    const regularPath = path.join(fontDir, 'malgun.ttf');
    const boldPath = path.join(fontDir, 'malgunbd.ttf');

    if (fs.existsSync(regularPath)) {
      doc.registerFont('맑은고딕', regularPath);
    }

    if (fs.existsSync(boldPath)) {
      doc.registerFont('맑은고딕-Bold', boldPath);
    }
  } catch (error) {
    console.error('폰트 등록 실패:', error);
  }
}

/**
 * 날짜 포맷팅 (YYYY-MM-DD -> YYYY년 MM월 DD일)
 */
function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr; // 이미 포맷된 문자열이면 그대로 반환
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

/**
 * 스타일 마커 파싱 (여러 마커 지원)
 */
function parseStyleMarkers(text: string): StyledSegment[] {
  const segments: StyledSegment[] = [];

  // 어떤 마커라도 포함되지 않으면 빠른 반환
  const hasAnyMarker = Object.values(STYLE_MARKERS).some(markerConfig =>
    text.includes(markerConfig.start)
  );
  if (!hasAnyMarker) {
    return [{ text, styles: { color: '#000000', bold: false, italic: false } }];
  }

  interface MarkerPosition {
    index: number;
    isStart: boolean;
    type: StyleType;
    markerLength: number;
  }

  const markerPositions: MarkerPosition[] = [];

  Object.entries(STYLE_MARKERS).forEach(([type, markerConfig]) => {
    let pos = 0;
    while ((pos = text.indexOf(markerConfig.start, pos)) !== -1) {
      markerPositions.push({
        index: pos,
        isStart: true,
        type: type as StyleType,
        markerLength: markerConfig.start.length,
      });
      pos += markerConfig.start.length;
    }

    pos = 0;
    while ((pos = text.indexOf(markerConfig.end, pos)) !== -1) {
      markerPositions.push({
        index: pos,
        isStart: false,
        type: type as StyleType,
        markerLength: markerConfig.end.length,
      });
      pos += markerConfig.end.length;
    }
  });

  markerPositions.sort((a, b) => a.index - b.index);

  const active = new Map<StyleType, (typeof STYLE_MARKER_COLORS)[StyleType]>();
  let lastIndex = 0;

  const currentStyle = () => {
    let color = '#000000';
    let bold = false;
    let italic = false;
    active.forEach(s => {
      color = s.color || color;
      bold = s.bold || bold;
      italic = s.italic || italic;
    });
    return { color, bold, italic };
  };

  markerPositions.forEach(m => {
    if (m.index > lastIndex) {
      segments.push({
        text: text.substring(lastIndex, m.index),
        styles: currentStyle(),
      });
    }
    if (m.isStart) {
      active.set(m.type, STYLE_MARKER_COLORS[m.type]);
    } else {
      active.delete(m.type);
    }
    lastIndex = m.index + m.markerLength;
  });

  if (lastIndex < text.length) {
    segments.push({ text: text.substring(lastIndex), styles: currentStyle() });
  }

  return segments;
}

/**
 * 스타일이 적용된 텍스트 렌더링 (정렬 지원 버전)
 */
function renderStyledText(doc: any, text: string, options?: any): void {
  const segments = parseStyleMarkers(text);

  // 스타일이 없으면 일반 렌더링
  const hasStyle = segments.some(s => s.styles.color !== '#000000');
  if (!hasStyle) {
    // 마커가 없으면 일반 렌더링 (X 좌표 명시 필요)
    const correctedOptions = { ...options };

    // width가 페이지 전체 너비인 경우 콘텐츠 영역 너비로 보정
    if (correctedOptions.width === doc.page.width) {
      correctedOptions.width =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;
    }

    // X 좌표를 명시적으로 설정
    doc.text(text, doc.page.margins.left, doc.y, correctedOptions);
    return;
  }

  // 가운데/우측 정렬이 있는 경우 절대 좌표로 처리
  const hasAlign =
    options && (options.align === 'center' || options.align === 'right');

  if (hasAlign) {
    // 1) 각 세그먼트의 폭 측정
    const widths: number[] = [];
    segments.forEach(seg => {
      if (seg.text) {
        widths.push(doc.widthOfString(seg.text));
      } else {
        widths.push(0);
      }
    });

    // 2) 전체 폭과 시작 X 계산
    const totalWidth = widths.reduce((a, b) => a + b, 0);
    const pageWidth = doc.page.width;
    const marginLeft = doc.page.margins.left;
    const marginRight = doc.page.margins.right;
    const contentWidth = pageWidth - marginLeft - marginRight;

    let startX = marginLeft;
    if (options.align === 'center') {
      startX = marginLeft + (contentWidth - totalWidth) / 2;
    } else if (options.align === 'right') {
      startX = marginLeft + contentWidth - totalWidth;
    }

    // 3) 절대 좌표로 이어붙이기
    const startY = doc.y;
    const savedY = doc.y; // Y 위치 저장
    let cursorX = startX;

    segments.forEach((seg, i) => {
      if (!seg.text) return;

      doc.fillColor(seg.styles.color);
      // 절대 좌표로 배치, lineBreak: false로 줄바꿈 방지
      doc.text(seg.text, cursorX, startY, { lineBreak: false });
      cursorX += widths[i];

      // 각 세그먼트 렌더링 후 Y 위치를 startY로 복원
      doc.y = startY;
    });

    // Y/X 위치만 복원 (간격은 호출자가 제어)
    doc.y = savedY;
    doc.x = doc.page.margins.left;

    // 색상 복원
    doc.fillColor('#000000');
  } else {
    // 정렬이 없으면 줄 시작을 명시적으로 초기화한 뒤 이어 붙임
    const pageWidth = doc.page.width;
    const marginLeft = doc.page.margins.left;
    const marginRight = doc.page.margins.right;
    const contentWidth = pageWidth - marginLeft - marginRight;

    // 줄 시작 위치 고정 (기존 상태 영향 제거)
    doc.text('', marginLeft, doc.y, {
      width: contentWidth,
      align: (options && options.align) || 'left',
      continued: true,
    });

    segments.forEach((segment, index) => {
      if (!segment.text) return;
      doc.fillColor(segment.styles.color);
      const isLast = index === segments.length - 1;
      doc.text(segment.text, { continued: !isLast });
    });

    // 색상 복원
    doc.fillColor('#000000');
  }
}

/**
 * 결성총회 의안 PDF 생성
 */
export async function generateFormationAgendaPDF(
  data: FormationAgendaData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const defaultFontPath = getFontPath();

      const doc = new PDFDocument({
        font: defaultFontPath,
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 70, right: 70 },
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // 한글 폰트 등록
      registerKoreanFonts(doc);

      // 템플릿에서 레이블 가져오기 (없으면 기본값)
      let labels, titleTemplate, footerMessage;

      if (data.template?.content) {
        const templateContent = data.template.content;
        labels = templateContent.labels;
        titleTemplate = templateContent.title_template;
        footerMessage = templateContent.footer_message;

        console.log('[generateFormationAgendaPDF] DB 템플릿 사용:', {
          templateId: data.template.id,
          templateVersion: data.template.version,
        });
      } else {
        const defaultTemplate = getDefaultFormationAgendaTemplate();
        labels = defaultTemplate.labels;
        titleTemplate = defaultTemplate.title_template;
        footerMessage = defaultTemplate.footer_message;

        console.log('[generateFormationAgendaPDF] 기본 템플릿(fallback) 사용');
      }

      // 미리보기 여부 판단 (명시적인 플래그 사용, 기본값 false)
      const isPreview = data.isPreview ?? false;

      // 공통 컨텍스트
      const commonContext = {
        fund_name: data.fund_name,
        assembly_date: formatDate(data.assembly_date),
      };

      // 제목 생성 (템플릿 변수 치환)
      const title = renderTemplateString(
        titleTemplate,
        { fund_name: data.fund_name },
        isPreview
      );

      // 제목
      const config = FORMATION_AGENDA_CONFIG;
      doc.font(config.fonts.title.family).fontSize(config.fonts.title.size);
      renderStyledText(doc, title, { align: config.alignment.title });
      doc.moveDown(config.spacing.title_bottom);

      // 일시 (미리보기 시 날짜를 노란색으로 강조)
      doc
        .font(config.fonts.date_chairman.family)
        .fontSize(config.fonts.date_chairman.size);
      const dateText = `* ${labels.date} ${wrapInputValueForPreview(
        formatDate(data.assembly_date),
        isPreview
      )}`;
      renderStyledText(doc, dateText, {
        align: config.alignment.section,
      });
      doc.moveDown(0.5);

      // 의장 (미리보기 시 입력값 노란색)
      const chairmanText = `* ${labels.chairman} ${wrapInputValueForPreview(
        data.content.chairman || '',
        isPreview
      )}`;
      renderStyledText(doc, chairmanText, {
        align: config.alignment.section,
      });
      doc.moveDown(config.spacing.section_spacing);

      // 부의안건
      doc
        .font(config.fonts.section_header.family)
        .fontSize(config.fonts.section_header.size);
      doc.text(`* ${labels.agendas_section}`, {
        align: config.alignment.section,
      });
      doc.moveDown(1.5);

      // 의안 목록
      doc
        .font(config.fonts.agenda_title.family)
        .fontSize(config.fonts.agenda_title.size);

      data.content.agendas.forEach((agenda, index) => {
        // 페이지 넘김 체크
        if (doc.y > config.page.maxY) {
          doc.addPage();
        }

        // 의안 제목 (템플릿 변수 치환)
        const agendaTitle = renderTemplateString(
          labels.agenda_title_template,
          {
            index: index + 1,
            title: agenda.title,
          },
          isPreview
        );

        doc
          .font(config.fonts.agenda_title.family)
          .fontSize(config.fonts.agenda_title.size);
        renderStyledText(doc, agendaTitle, {
          align: config.alignment.content,
          underline: false,
        });
        doc.moveDown(config.spacing.agenda_title_bottom);

        // 의안 내용
        doc
          .font(config.fonts.agenda_content.family)
          .fontSize(config.fonts.agenda_content.size);

        // 내용을 줄바꿈 처리
        const lines = (agenda.content || '').split('\n');
        lines.forEach((line, lineIndex) => {
          if (line.trim()) {
            doc.text(line, { align: config.alignment.content, indent: 0 });
            if (lineIndex < lines.length - 1) {
              doc.moveDown(config.spacing.content_line_spacing);
            }
          } else {
            doc.moveDown(config.spacing.content_line_spacing);
          }
        });

        // 의안 사이 간격
        if (index < data.content.agendas.length - 1) {
          doc.moveDown(config.spacing.agenda_spacing);
        }
      });

      // 하단 정보
      doc.moveDown(config.spacing.footer_top);
      doc.font(config.fonts.footer.family).fontSize(config.fonts.footer.size);
      doc.moveDown(config.spacing.footer_spacing);
      if (footerMessage) {
        const renderedFooter = renderTemplateString(
          footerMessage,
          commonContext,
          isPreview
        );
        renderStyledText(doc, renderedFooter);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 결성총회 의안 기본 템플릿 설정
 */
export function getDefaultFormationAgendaTemplate() {
  console.log('getDefaultFormationAgendaTemplate');
  return {
    title_template: '${fund_name} 결성총회',
    labels: {
      date: '일시:',
      chairman: '의장:',
      agendas_section: '부의안건',
      agenda_title_template: '(제${index}호 의안) ${title}',
    },
    chairman: '',
    agendas: [
      {
        title: '규약(안) 승인의 건',
        content: '첨부한 규약 참조 부탁드립니다.',
      },
      {
        title: '사업계획 승인의 건',
        content:
          '당 조합은 유망한 중소벤처기업에 투자하여 투자수익을 실현하고, 벤처생태계 활성화에 기여하고자 합니다.\n\n주요 투자 분야: IT, 바이오, 제조, 서비스 등 성장 가능성이 높은 중소벤처기업\n투자 방식: 직접 투자 및 간접 투자 병행',
      },
    ],
    footer_message: '위 의안에 대하여 조합원 여러분들의 승인을 부탁드립니다.',
  };
}
