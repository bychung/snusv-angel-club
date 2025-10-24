// 조합원 명부 PDF 생성기

import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { getNameForSorting } from '../format-utils';
import { MEMBER_LIST_CONFIG } from './member-list-config';
import { getFontPath } from './template-font';
import { loadExternalTemplate } from './template-loader';
import {
  renderTemplateString,
  STYLE_MARKERS,
  wrapInputValueForPreview,
} from './template-utils';

interface GPInfo {
  id: string;
  name: string;
  representative?: string | null;
  entity_type: 'individual' | 'corporate';
}

interface MemberInfo {
  name: string;
  entity_type: 'individual' | 'corporate';
  birth_date?: string | null;
  business_number?: string | null;
  address: string;
  phone: string;
  units: number; // 출자좌수
}

interface MemberListData {
  fund_name: string;
  assembly_date: string; // YYYY-MM-DD
  gps: GPInfo[];
  members: MemberInfo[];
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
  const date = new Date(dateStr);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

/**
 * 생년월일/사업자번호 포맷팅
 */
function formatIdentifier(member: MemberInfo): string {
  if (member.entity_type === 'individual') {
    return member.birth_date || '-';
  } else {
    return member.business_number || '-';
  }
}

/**
 * 스타일 마커 파싱 (여러 마커 지원)
 */
function parseStyleMarkers(text: string): StyledSegment[] {
  const segments: StyledSegment[] = [];

  // 모든 마커 확인
  const hasAnyMarker = Object.values(STYLE_MARKERS).some(markerConfig =>
    text.includes(markerConfig.start)
  );

  if (!hasAnyMarker) {
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

  // 위치순으로 정렬
  markerPositions.sort((a, b) => a.index - b.index);

  // 스타일 스택
  const activeStyles = new Map<
    StyleType,
    (typeof STYLE_MARKER_COLORS)[StyleType]
  >();
  let lastIndex = 0;

  markerPositions.forEach(marker => {
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
      activeStyles.set(marker.type, STYLE_MARKER_COLORS[marker.type]);
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

/**
 * 활성화된 스타일들을 합성하여 최종 스타일 계산
 */
function computeStyles(
  activeStyles: Map<StyleType, (typeof STYLE_MARKER_COLORS)[StyleType]>
): {
  color: string;
  bold: boolean;
  italic: boolean;
} {
  let color = '#000000';
  let bold = false;
  let italic = false;

  // 스타일 우선순위: 나중에 추가된 것이 우선
  activeStyles.forEach(style => {
    // 항상 스타일 적용 (나중에 추가된 것이 우선)
    color = style.color;
    if (style.bold) {
      bold = true;
    }
    if (style.italic) {
      italic = true;
    }
  });

  return { color, bold, italic };
}

/**
 * 스타일이 적용된 텍스트 렌더링 (정렬 지원 버전)
 */
function renderStyledText(doc: any, text: string, options?: any): void {
  const segments = parseStyleMarkers(text);

  const hasStyle = segments.some(s => s.styles.color !== '#000000');
  if (!hasStyle) {
    // 마커가 없으면 일반 렌더링 (X 좌표 명시 필요)
    const correctedOptions = { ...options };

    // width가 페이지 전체 너비인 경우 콘텐츠 영역 너비로 보정
    if (correctedOptions.width === doc.page.width) {
      correctedOptions.width =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;
    }

    // X 좌표를 명시적으로 설정 (테이블 그린 후 doc.x 위치가 불확실하므로)
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

    doc.fillColor('#000000');
  }
}

/**
 * 조합원 명부 기본 템플릿 설정
 */
export function getDefaultMemberListTemplate() {
  return {
    title: '조합원 명부',
    table_config: {
      columns: [
        { key: 'no', label: '번호', width: 30, align: 'center' },
        { key: 'name', label: '조합원명', width: 80, align: 'center' },
        {
          key: 'identifier',
          label: '생년월일\n(사업자등록번호)',
          width: 85,
          align: 'center',
          line_gap: -2,
        },
        { key: 'address', label: '주소', width: 165, align: 'center' },
        { key: 'phone', label: '연락처', width: 75, align: 'center' },
        { key: 'units', label: '출자좌수', width: 60, align: 'center' },
      ],
    },
    footer_labels: {
      gp_prefix: '업무집행조합원',
      seal_text: '(조합인감)',
    },
  };
}

/**
 * 조합원 명부 PDF 생성
 */
export async function generateMemberListPDF(
  data: MemberListData
): Promise<Buffer> {
  // 템플릿 로드 (Promise 생성 전에 처리)
  let finalTemplate: any;
  if (data.template) {
    // 이미 템플릿이 전달된 경우
    console.log(
      '[generateMemberListPDF]템플릿이 전달되었습니다.',
      data.template
    );
    finalTemplate = data.template;
  } else {
    // 템플릿이 없으면 DB → 파일 → 코드 기본값 순서로 로드
    try {
      const loadedContent = await loadExternalTemplate('member-list-template');
      finalTemplate = { content: loadedContent };
    } catch (error) {
      console.log('외부 템플릿 로드 실패, 코드 기본값 사용:', error);
      finalTemplate = { content: getDefaultMemberListTemplate() };
    }
  }

  return new Promise((resolve, reject) => {
    try {
      const defaultFontPath = getFontPath();

      const doc = new PDFDocument({
        size: 'A4',
        font: defaultFontPath,
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // 한글 폰트 등록
      registerKoreanFonts(doc);

      // 템플릿에서 설정 가져오기
      const config = MEMBER_LIST_CONFIG;
      const templateContent = finalTemplate?.content || {};
      const defaultTemplate = getDefaultMemberListTemplate();

      const title = templateContent.title || defaultTemplate.title;
      const tableConfig =
        templateContent.table_config || defaultTemplate.table_config;
      const footerLabels =
        templateContent.footer_labels || defaultTemplate.footer_labels;

      // 미리보기 여부 판단 (명시적인 플래그 사용, 기본값 false)
      const isPreview = data.isPreview ?? false;

      // 공통 컨텍스트
      const commonContext = {
        fund_name: data.fund_name,
        assembly_date: formatDate(data.assembly_date),
      };

      // 제목 (템플릿 변수 치환)
      doc.font(config.fonts.title.family).fontSize(config.fonts.title.size);
      const renderedTitle = renderTemplateString(
        title,
        commonContext,
        isPreview
      );
      renderStyledText(doc, renderedTitle, { align: 'center' });
      doc.moveDown(config.spacing.title_bottom);

      // 조합원 정렬 (가나다순)
      const sortedMembers = [...data.members].sort((a, b) => {
        const nameA = getNameForSorting(a.name);
        const nameB = getNameForSorting(b.name);
        return nameA.localeCompare(nameB, 'ko');
      });

      // 테이블 그리기
      const tableLeft = config.page.table_left;
      const tableWidth = config.page.table_width;

      // 컬럼 너비 정의 (템플릿에서 가져오기)
      const colWidths: Record<string, number> = {};
      tableConfig.columns.forEach((col: any) => {
        colWidths[col.key] = col.width;
      });

      const rowHeight = config.table_style.row_height;
      let currentY = doc.y;
      let pageTableTop = currentY; // 현재 페이지의 테이블 시작 위치

      // 헤더 그리기 함수
      const drawHeader = () => {
        doc
          .font(config.fonts.table_header.family)
          .fontSize(config.fonts.table_header.size);

        // 헤더 배경
        doc
          .rect(tableLeft, currentY, tableWidth, rowHeight)
          .fill(config.table_style.header_background);

        // 헤더 텍스트
        doc.fillColor('#000000');
        let headerX = tableLeft;

        tableConfig.columns.forEach((col: any) => {
          const yOffset = col.line_gap ? currentY + 5 : currentY + 10;
          const options: any = {
            width: col.width,
            align: col.align || 'center',
          };
          if (col.line_gap) {
            options.lineGap = col.line_gap;
          }

          // 템플릿 변수 치환 (헤더 라벨)
          const renderedLabel = renderTemplateString(
            col.label,
            commonContext,
            isPreview
          );
          const segments = parseStyleMarkers(renderedLabel);

          // 스타일이 없으면 일반 렌더링
          const hasStyle = segments.some(s => s.styles.color !== '#000000');
          if (!hasStyle) {
            doc.text(col.label, headerX, yOffset, options);
          } else {
            // 스타일이 있으면 각 세그먼트를 렌더링
            let currentX = headerX;
            segments.forEach((segment, segIndex) => {
              if (!segment.text) return;

              doc.fillColor(segment.styles.color);

              if (segIndex === 0) {
                doc.text(segment.text, currentX, yOffset, {
                  ...options,
                  continued: segIndex < segments.length - 1,
                });
              } else {
                doc.text(segment.text, {
                  continued: segIndex < segments.length - 1,
                });
              }
            });

            // 색상 복원
            doc.fillColor('#000000');
          }

          headerX += col.width;
        });

        currentY += rowHeight;
      };

      // 테이블 테두리 그리기 함수
      const drawTableBorders = (startY: number, endY: number) => {
        doc
          .strokeColor(config.table_style.border_color)
          .lineWidth(config.table_style.border_width);

        // 외곽선
        doc.rect(tableLeft, startY, tableWidth, endY - startY).stroke();

        // 수직선
        let lineX = tableLeft;
        tableConfig.columns.forEach((col: any, index: number) => {
          if (index > 0) {
            doc.moveTo(lineX, startY).lineTo(lineX, endY).stroke();
          }
          lineX += col.width;
        });

        // 수평선
        for (let y = startY; y <= endY; y += rowHeight) {
          doc
            .moveTo(tableLeft, y)
            .lineTo(tableLeft + tableWidth, y)
            .stroke();
        }
      };

      // 첫 페이지 헤더 그리기
      drawHeader();

      // 데이터 행 그리기
      doc
        .font(config.fonts.table_body.family)
        .fontSize(config.fonts.table_body.size);

      sortedMembers.forEach((member, index) => {
        // 페이지 넘김 체크
        if (currentY > config.page.maxY) {
          // 현재 페이지의 테이블 테두리 그리기
          drawTableBorders(pageTableTop, currentY);

          // 새 페이지 추가
          doc.addPage();
          currentY = 50;
          pageTableTop = currentY;

          // 새 페이지 헤더 그리기
          drawHeader();
          doc
            .font(config.fonts.table_body.family)
            .fontSize(config.fonts.table_body.size);
        }

        // 행 배경 (zebra striping)
        if (config.table_style.zebra_striping) {
          const bgColor =
            index % 2 === 0
              ? config.table_style.zebra_colors.even
              : config.table_style.zebra_colors.odd;
          if (bgColor !== '#ffffff') {
            doc.rect(tableLeft, currentY, tableWidth, rowHeight).fill(bgColor);
            doc.fillColor('#000000');
          }
        }

        let currentX = tableLeft;
        const textY = currentY + 10;

        // 각 컬럼 데이터 렌더링
        tableConfig.columns.forEach((col: any) => {
          let value = '';
          let align = col.align || 'center';

          switch (col.key) {
            case 'no':
              value = `${index + 1}`;
              break;
            case 'name':
              value = member.name;
              break;
            case 'identifier':
              value = formatIdentifier(member);
              break;
            case 'address':
              // 주소는 특별 처리 (다중 라인 대응, 미리보기 시 노란색 강조)
              const addressValue = wrapInputValueForPreview(
                member.address,
                isPreview
              );
              const addressHeight = doc.heightOfString(member.address, {
                width: col.width - 10,
                lineGap: -1,
              });
              const addressY = currentY + (rowHeight - addressHeight) / 2;

              // 스타일 렌더링 적용
              const addressSegments = parseStyleMarkers(addressValue);
              const hasAddressStyle = addressSegments.some(
                s => s.styles.color !== '#000000'
              );

              if (!hasAddressStyle) {
                doc.text(member.address, currentX + 5, addressY, {
                  width: col.width - 10,
                  align: align,
                  lineGap: -1,
                });
              } else {
                // 스타일 적용된 주소 렌더링
                const savedY = doc.y;
                doc.y = addressY;
                addressSegments.forEach((segment, segIndex) => {
                  if (!segment.text) return;
                  doc.fillColor(segment.styles.color);
                  if (segIndex === 0) {
                    doc.text(segment.text, currentX + 5, addressY, {
                      width: col.width - 10,
                      align: align,
                      lineGap: -1,
                      continued: segIndex < addressSegments.length - 1,
                    });
                  } else {
                    doc.text(segment.text, {
                      continued: segIndex < addressSegments.length - 1,
                    });
                  }
                });
                doc.fillColor('#000000');
                doc.y = savedY;
              }

              currentX += col.width;
              return; // 다음 컬럼으로
            case 'phone':
              value = member.phone;
              break;
            case 'units':
              value = member.units.toLocaleString();
              break;
          }

          // 미리보기 시 셀 값을 노란색으로 강조
          const cellValue = wrapInputValueForPreview(value, isPreview);

          // 스타일 렌더링
          const segments = parseStyleMarkers(cellValue);
          const hasStyle = segments.some(s => s.styles.color !== '#000000');

          if (!hasStyle) {
            doc.text(value, currentX, textY, {
              width: col.width,
              align: align,
            });
          } else {
            // 스타일이 적용된 텍스트 렌더링
            segments.forEach((segment, segIndex) => {
              if (!segment.text) return;
              doc.fillColor(segment.styles.color);
              if (segIndex === 0) {
                doc.text(segment.text, currentX, textY, {
                  width: col.width,
                  align: align,
                  continued: segIndex < segments.length - 1,
                });
              } else {
                doc.text(segment.text, {
                  continued: segIndex < segments.length - 1,
                });
              }
            });
            doc.fillColor('#000000');
          }

          currentX += col.width;
        });

        currentY += rowHeight;
      });

      // 마지막 페이지의 테이블 테두리 그리기
      drawTableBorders(pageTableTop, currentY);

      // 하단 정보
      doc.moveDown(config.spacing.table_bottom);
      doc.font(config.fonts.date.family).fontSize(config.fonts.date.size);
      doc.fillColor('#000000');

      const bottomY = doc.y;

      // 날짜 (가운데 정렬, 미리보기 시 노란색 강조)
      const datePreviewText = wrapInputValueForPreview(
        formatDate(data.assembly_date),
        isPreview
      );
      renderStyledText(doc, datePreviewText, {
        width: doc.page.width,
        align: 'center',
      });
      doc.moveDown(2);

      // 조합명 (크게, 가운데 정렬)
      doc
        .fontSize(config.fonts.fund_name.size)
        .font(config.fonts.fund_name.family);
      const fundNamePreviewText = wrapInputValueForPreview(
        data.fund_name,
        isPreview
      );
      renderStyledText(doc, fundNamePreviewText, {
        width: doc.page.width,
        align: 'center',
      });
      doc.moveDown(1);
      doc.moveDown(config.spacing.gp_spacing);

      // 업무집행조합원 (한 줄, 가운데 정렬)
      doc.fontSize(config.fonts.gp.size).font(config.fonts.gp.family);
      const gpNames = data.gps
        .map(gp => {
          return gp.entity_type === 'corporate' && gp.representative
            ? `${gp.name} 대표 ${gp.representative}`
            : gp.name;
        })
        .join(', ');

      // 업무집행조합원 텍스트 (템플릿 변수 치환)
      const renderedGpPrefix = renderTemplateString(
        footerLabels.gp_prefix,
        commonContext,
        isPreview
      );
      const renderedSealText = renderTemplateString(
        footerLabels.seal_text,
        commonContext,
        isPreview
      );

      // GP 이름은 미리보기 시 노란색으로 강조
      const gpNamesText = wrapInputValueForPreview(gpNames, isPreview);

      // 두 텍스트를 하나로 합쳐서 렌더링 (색상은 마커로 처리)
      const gpFullText = `${renderedGpPrefix} ${gpNamesText} ${STYLE_MARKERS.GRAY.start}${renderedSealText}${STYLE_MARKERS.GRAY.end}`;

      const gpY = doc.y;

      // 전체 텍스트 한 번에 렌더링
      doc.fillColor('#000000');
      renderStyledText(doc, gpFullText, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
