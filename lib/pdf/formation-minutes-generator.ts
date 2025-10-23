// 결성총회 의사록 PDF 생성기

import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import type {
  FormationMinutesContent,
  MinutesAgendaItem,
} from '../../types/assemblies';
import { getNameForSorting } from '../format-utils';
import { FORMATION_MINUTES_CONFIG } from './formation-minutes-config';
import {
  renderTemplateString,
  STYLE_MARKERS,
  wrapInputValueForPreview,
} from './template-utils';
import { getFontPath } from './utils';

interface MemberInfo {
  id: string;
  name: string;
  type: '업무집행조합원' | '유한책임조합원';
  units: number;
  entity_type?: 'individual' | 'corporate';
  representative?: string | null;
}

interface FormationMinutesContext {
  fund_name: string;
  assembly_date: string; // YYYY-MM-DD
  assembly_date_raw?: string;
  assembly_time: string;
  all_members: MemberInfo[];
  attended_members_data: MemberInfo[];
  gp_list: Array<{
    name: string;
    representative?: string;
    is_entity: boolean;
  }>;
  gp_names_full: string;
  attendance_rate?: number;
  generated_at?: string;
}

interface FormationMinutesData {
  content: FormationMinutesContent;
  context: FormationMinutesContext;
  template?: any; // 템플릿 (선택사항)
  isPreview?: boolean; // 미리보기 모드
}

// 스타일 마커 색상 정의
const STYLE_MARKER_COLORS = {
  PREVIEW: {
    color: '#0066CC',
    bold: false,
    italic: false,
  },
  INPUT: {
    color: '#FFC107',
    bold: false,
    italic: false,
  },
  GRAY: {
    color: '#999999',
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
  if (isNaN(date.getTime())) return dateStr;
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

/**
 * 스타일 마커 파싱
 */
function parseStyleMarkers(text: string): StyledSegment[] {
  const segments: StyledSegment[] = [];

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
 * 스타일이 적용된 텍스트 렌더링
 */
function renderStyledText(
  doc: any,
  text: string,
  x: number,
  y: number,
  options?: any
): void {
  const segments = parseStyleMarkers(text);

  let currentX = x;
  let currentY = y;
  const lineHeight = options?.lineGap || 0;

  segments.forEach(segment => {
    const currentFont = doc._font;
    const currentFontSize = doc._fontSize;

    // 스타일 적용
    doc.fillColor(segment.styles.color);

    // 텍스트 렌더링
    doc.text(segment.text, currentX, currentY, {
      ...options,
      continued: true,
      lineBreak: false,
    });

    // 다음 세그먼트 위치 계산
    currentX += doc.widthOfString(segment.text);

    // 폰트와 색상 복원
    doc.font(currentFont).fontSize(currentFontSize).fillColor('#000000');
  });

  // 라인 종료
  doc.text('', options);
}

/**
 * 일반 텍스트 렌더링 (스타일 마커 처리 포함)
 */
function renderText(
  doc: any,
  text: string,
  options?: { align?: 'left' | 'center' | 'right'; indent?: number }
): void {
  const segments = parseStyleMarkers(text);
  const hasStyle = segments.some(s => s.styles.color !== '#000000');

  if (!hasStyle) {
    doc.text(text, options);
    return;
  }

  // 스타일이 있는 경우 세그먼트별 렌더링
  segments.forEach((segment, idx) => {
    doc.fillColor(segment.styles.color);
    doc.text(segment.text, {
      continued: idx < segments.length - 1,
      ...options,
    });
  });

  doc.fillColor('#000000');
}

/**
 * 페이지 넘김 체크
 */
function checkPageBreak(doc: any, requiredHeight: number): void {
  if (doc.y + requiredHeight > FORMATION_MINUTES_CONFIG.page.maxY) {
    doc.addPage();
  }
}

/**
 * 제목 렌더링
 */
function renderTitle(
  doc: any,
  data: FormationMinutesData,
  context: FormationMinutesContext
): void {
  const titleConfig = FORMATION_MINUTES_CONFIG.fonts.title;
  const titleTemplate = data.content.title_template;

  let titleText = renderTemplateString(titleTemplate, context, data.isPreview);

  if (data.isPreview) {
    titleText = wrapInputValueForPreview(titleText);
  }

  doc.font(titleConfig.family).fontSize(titleConfig.size).text(titleText, {
    align: FORMATION_MINUTES_CONFIG.alignment.title,
  });

  doc.moveDown(FORMATION_MINUTES_CONFIG.spacing.title_bottom);
}

/**
 * 섹션 텍스트 렌더링 (레이블 + 값)
 */
function renderSection(
  doc: any,
  label: string,
  value: string,
  context: FormationMinutesContext,
  isPreview: boolean = false
): void {
  checkPageBreak(doc, 30);

  const labelConfig = FORMATION_MINUTES_CONFIG.fonts.section_label;
  const bodyConfig = FORMATION_MINUTES_CONFIG.fonts.body;

  // 레이블 렌더링
  doc.font(labelConfig.family).fontSize(labelConfig.size);
  renderText(doc, label);

  // 값 렌더링
  doc.font(bodyConfig.family).fontSize(bodyConfig.size);
  let renderedValue = renderTemplateString(value, context, isPreview);
  if (isPreview) {
    renderedValue = wrapInputValueForPreview(renderedValue);
  }
  renderText(doc, renderedValue);

  doc.moveDown(FORMATION_MINUTES_CONFIG.spacing.section_spacing);
}

/**
 * 조합원 테이블 렌더링 (2열 구조)
 */
function renderMemberTable(
  doc: any,
  members: MemberInfo[],
  columns: any[]
): void {
  checkPageBreak(doc, 100);

  const config = FORMATION_MINUTES_CONFIG.table_style;
  const pageConfig = FORMATION_MINUTES_CONFIG.page;
  const tableX = pageConfig.table_left;
  const tableWidth = pageConfig.table_width;

  // 컬럼 너비 계산
  const colWidths = columns.map(col => col.width);
  const totalWidth = colWidths.reduce((sum, w) => sum + w, 0);
  const scale = tableWidth / totalWidth;
  const scaledWidths = colWidths.map(w => w * scale);

  // GP와 LP 분리 및 정렬
  const gps = members
    .filter(m => m.type === '업무집행조합원')
    .sort((a, b) =>
      getNameForSorting(a.name).localeCompare(getNameForSorting(b.name))
    );
  const lps = members
    .filter(m => m.type === '유한책임조합원')
    .sort((a, b) =>
      getNameForSorting(a.name).localeCompare(getNameForSorting(b.name))
    );

  // 2열 구조로 배치
  const allMembers = [...gps, ...lps];
  const rows: Array<{ left?: MemberInfo; right?: MemberInfo }> = [];

  for (let i = 0; i < allMembers.length; i += 2) {
    rows.push({
      left: allMembers[i],
      right: allMembers[i + 1],
    });
  }

  // 테이블 헤더 렌더링
  let currentY = doc.y;
  doc
    .font(FORMATION_MINUTES_CONFIG.fonts.table_header.family)
    .fontSize(FORMATION_MINUTES_CONFIG.fonts.table_header.size);

  // 헤더 배경
  doc
    .rect(tableX, currentY, tableWidth, config.header_height)
    .fillAndStroke(config.header_background, config.border_color);

  // 헤더 텍스트
  let currentX = tableX;
  ['구분', '조합원명', '총 출자좌수', '조합원명', '총 출자좌수'].forEach(
    (label, idx) => {
      doc.fillColor('#000000').text(label, currentX + 5, currentY + 12, {
        width: scaledWidths[idx] - 10,
        align: 'center',
      });
      currentX += scaledWidths[idx];
    }
  );

  currentY += config.header_height;

  // 테이블 바디 렌더링
  doc
    .font(FORMATION_MINUTES_CONFIG.fonts.table_body.family)
    .fontSize(FORMATION_MINUTES_CONFIG.fonts.table_body.size);

  let isGPSection = true;
  let rowIdx = 0;

  rows.forEach(row => {
    checkPageBreak(doc, config.row_height);

    // GP/LP 구분 표시 (첫 행만)
    const leftType = row.left?.type;
    const showType =
      (isGPSection && leftType === '업무집행조합원') ||
      (!isGPSection && leftType === '유한책임조합원');

    if (leftType === '유한책임조합원' && isGPSection) {
      isGPSection = false;
    }

    // 배경색 (줄무늬)
    const bgColor =
      config.zebra_striping && rowIdx % 2 === 0
        ? config.zebra_colors.even
        : config.zebra_colors.odd;

    doc
      .rect(tableX, currentY, tableWidth, config.row_height)
      .fillAndStroke(bgColor, config.border_color);

    currentX = tableX;

    // 구분 (왼쪽)
    const typeText = showType
      ? leftType === '업무집행조합원'
        ? '업무\n집행\n조합\n원'
        : '유한\n책임\n조합\n원\n(가나다순)'
      : '';
    doc.fillColor('#000000').text(typeText, currentX + 5, currentY + 5, {
      width: scaledWidths[0] - 10,
      align: 'center',
      lineGap: -2,
    });
    currentX += scaledWidths[0];

    // 왼쪽 조합원 정보
    if (row.left) {
      doc.text(row.left.name, currentX + 5, currentY + 10, {
        width: scaledWidths[1] - 10,
        align: 'center',
      });
      currentX += scaledWidths[1];
      doc.text(row.left.units.toString(), currentX + 5, currentY + 10, {
        width: scaledWidths[2] - 10,
        align: 'center',
      });
      currentX += scaledWidths[2];
    } else {
      currentX += scaledWidths[1] + scaledWidths[2];
    }

    // 오른쪽 조합원 정보
    if (row.right) {
      doc.text(row.right.name, currentX + 5, currentY + 10, {
        width: scaledWidths[3] - 10,
        align: 'center',
      });
      currentX += scaledWidths[3];
      doc.text(row.right.units.toString(), currentX + 5, currentY + 10, {
        width: scaledWidths[4] - 10,
        align: 'center',
      });
    }

    currentY += config.row_height;
    rowIdx++;
  });

  doc.y = currentY;
  doc.moveDown(FORMATION_MINUTES_CONFIG.spacing.section_spacing);
}

/**
 * 의안 심의 결과 렌더링
 */
function renderAgendas(
  doc: any,
  agendas: MinutesAgendaItem[],
  agendasSection: any,
  isPreview: boolean = false
): void {
  checkPageBreak(doc, 50);

  const labelConfig = FORMATION_MINUTES_CONFIG.fonts.section_label;
  const bodyConfig = FORMATION_MINUTES_CONFIG.fonts.body;

  // 섹션 레이블
  doc
    .font(labelConfig.family)
    .fontSize(labelConfig.size)
    .text(agendasSection.label);

  doc.moveDown(1);

  // 각 의안 렌더링
  agendas.forEach(agenda => {
    checkPageBreak(doc, 40);

    doc.font(bodyConfig.family).fontSize(bodyConfig.size);

    // 의안 제목
    const agendaTitle = agendasSection.agenda_template
      .replace('{index}', agenda.index.toString())
      .replace('{title}', agenda.title);

    let titleText = isPreview
      ? wrapInputValueForPreview(agendaTitle)
      : agendaTitle;
    renderText(doc, titleText);

    // 의안 결과
    const resultText = `- ${agenda.result}`;
    let renderedResult = isPreview
      ? wrapInputValueForPreview(resultText)
      : resultText;
    renderText(doc, renderedResult);

    doc.moveDown(FORMATION_MINUTES_CONFIG.spacing.agenda_spacing);
  });
}

/**
 * 하단 메시지 렌더링
 */
function renderClosing(doc: any, closingTemplate: string): void {
  checkPageBreak(doc, 100);

  const bodyConfig = FORMATION_MINUTES_CONFIG.fonts.body;

  doc.moveDown(FORMATION_MINUTES_CONFIG.spacing.closing_top);

  doc.font(bodyConfig.family).fontSize(bodyConfig.size).text(closingTemplate, {
    align: 'left',
  });
}

/**
 * 서명란 렌더링
 */
function renderSignature(
  doc: any,
  signature: any,
  context: FormationMinutesContext,
  isPreview: boolean = false
): void {
  checkPageBreak(doc, 150);

  const signatureConfig = FORMATION_MINUTES_CONFIG.fonts.signature;

  doc.moveDown(FORMATION_MINUTES_CONFIG.spacing.signature_top);

  // 날짜
  let dateText = renderTemplateString(signature.date_label, context, isPreview);
  if (isPreview) {
    dateText = wrapInputValueForPreview(dateText);
  }
  doc
    .font(signatureConfig.family)
    .fontSize(signatureConfig.size)
    .text(dateText, {
      align: FORMATION_MINUTES_CONFIG.alignment.signature,
    });

  // 조합명
  let fundNameText = renderTemplateString(
    signature.fund_name_label,
    context,
    isPreview
  );
  if (isPreview) {
    fundNameText = wrapInputValueForPreview(fundNameText);
  }
  doc.text(fundNameText, {
    align: FORMATION_MINUTES_CONFIG.alignment.signature,
  });

  doc.moveDown(1);

  // GP 서명
  context.gp_list.forEach(gp => {
    const gpText = gp.is_entity
      ? `${signature.gp_label}  ${gp.name} 대표이사`
      : `${signature.gp_label}  ${gp.name}`;

    let renderedGP = isPreview ? wrapInputValueForPreview(gpText) : gpText;
    doc.text(renderedGP, {
      align: FORMATION_MINUTES_CONFIG.alignment.signature,
    });

    if (gp.representative) {
      let repText = `${gp.representative} ${signature.seal_text}`;
      if (isPreview) {
        repText = wrapInputValueForPreview(repText);
      }
      doc.text(repText, {
        align: FORMATION_MINUTES_CONFIG.alignment.signature,
      });
    } else {
      doc.text(signature.seal_text, {
        align: FORMATION_MINUTES_CONFIG.alignment.signature,
      });
    }

    doc.moveDown(0.5);
  });
}

/**
 * 결성총회 의사록 PDF 생성
 */
export async function generateFormationMinutesPDF(
  data: FormationMinutesData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const chunks: Buffer[] = [];

      // PDF 문서 생성
      const doc = new PDFDocument({
        size: FORMATION_MINUTES_CONFIG.page.size,
        margins: FORMATION_MINUTES_CONFIG.page.margins,
        font: getFontPath(),
      });

      // 한글 폰트 등록
      registerKoreanFonts(doc);

      // 데이터 수집
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const context = data.context;

      // 출석률 계산
      const totalMembers = context.all_members.length;
      const attendedMembers = context.attended_members_data.length;
      const attendanceRate =
        totalMembers > 0 ? (attendedMembers / totalMembers) * 100 : 0;

      const enrichedContext = {
        ...context,
        attendance_rate: attendanceRate.toFixed(1),
        total_members: totalMembers,
        attended_members: attendedMembers,
      };

      // 1. 제목 렌더링
      renderTitle(doc, data, enrichedContext);

      // 2. 일시 렌더링
      const timeValue = data.content.sections.time.value_template;
      renderSection(
        doc,
        data.content.sections.time.label,
        timeValue,
        enrichedContext,
        data.isPreview
      );

      // 3. 장소 렌더링
      renderSection(
        doc,
        data.content.sections.location.label,
        data.content.sections.location.value,
        enrichedContext,
        data.isPreview
      );

      // 4. 출석 현황 렌더링
      const attendanceValue = data.content.sections.attendance.template;
      renderSection(
        doc,
        data.content.sections.attendance.label,
        attendanceValue,
        enrichedContext,
        data.isPreview
      );

      // 5. 조합원 테이블 렌더링
      renderMemberTable(
        doc,
        context.attended_members_data,
        data.content.sections.member_table.columns
      );

      // 6. 개회선언 렌더링
      const openingValue = data.content.sections.opening.template;
      renderSection(
        doc,
        data.content.sections.opening.label,
        openingValue,
        enrichedContext,
        data.isPreview
      );

      // 7. 의안 심의 결과 렌더링
      renderAgendas(
        doc,
        data.content.sections.agendas.items,
        data.content.sections.agendas,
        data.isPreview
      );

      // 8. 하단 메시지 렌더링
      renderClosing(doc, data.content.sections.closing.template);

      // 9. 서명란 렌더링
      renderSignature(
        doc,
        data.content.sections.signature,
        enrichedContext,
        data.isPreview
      );

      // PDF 생성 완료
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
