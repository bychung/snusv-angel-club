// LPA PDF 생성기

import PDFDocument from 'pdfkit';
import { getNameForSorting } from '../format-utils';
import { getFontPath, registerKoreanFonts, tryFont } from './template-font';
import { processTemplateVariables } from './template-processor';
import {
  addPageFooter,
  parseStyleMarkers,
  renderAppendixHeader,
  renderAppendixTitle,
  renderStyledText,
} from './template-render';
import { STYLE_MARKERS } from './template-utils';
import type {
  AppendixDefinition,
  AppendixFilter,
  LPAContext,
  LPATemplate,
  ProcessedLPAContent,
  TemplateSection,
} from './types';

// 상수 정의
const INDENT_SIZE = 10; // 들여쓰기 크기 (depth 2부터 적용)

/**
 * 타이틀 페이지 추가
 */
function addTitlePage(doc: any, context: LPAContext): void {
  const pageHeight = doc.page.height;
  const pageWidth = doc.page.width;
  const centerY = pageHeight / 2;

  // 메인 타이틀
  doc.fontSize(28);
  tryFont(doc, '맑은고딕-Bold', 'NanumGothicBold');
  doc.text(`${context.fund.name}`, 50, centerY - 60, {
    align: 'center',
    width: pageWidth - 100,
  });

  // 부제목
  doc.fontSize(24);
  tryFont(doc, '맑은고딕', 'NanumGothic');
  doc.text('규약(안)', 50, centerY - 10, {
    align: 'center',
    width: pageWidth - 100,
  });

  // 날짜
  const generatedAt = context.generatedAt;
  const year = generatedAt.getFullYear();
  const month = String(generatedAt.getMonth() + 1).padStart(2, '0');

  doc.fontSize(14);
  tryFont(doc, '맑은고딕', 'NanumGothic');
  doc.text(`${year}. ${month}.`, 50, pageHeight - 150, {
    align: 'center',
    width: pageWidth - 100,
  });

  // 발행처 (실제 GP 멤버들의 이름 표시)
  const gpMembers = context.members.filter(m => m.member_type === 'GP');
  const gpNames = gpMembers.map(gp => gp.name).join(', ');

  doc.fontSize(12);
  tryFont(doc, '맑은고딕', 'NanumGothic');
  doc.text(`업무집행조합원: ${gpNames}`, 50, pageHeight - 120, {
    align: 'center',
    width: pageWidth - 100,
  });

  // 새 페이지 추가
  doc.addPage();
  addPageFooter(doc, 2);
}

/**
 * 항목 번호 포맷팅
 * depth 0: 장(章) 제목 - 별도 렌더링 처리
 * depth 1: 조(條) 제목 - "제X조 (제목)"
 * depth 2: ① ② ③ 형식
 * depth 3: 1. 2. 3. 형식
 * depth 4: 가. 나. 다. 형식
 */
function addIndex(depth: number, index: number, text: string): string {
  // depth 0은 장 제목으로 별도 처리
  if (depth === 0 || depth === 1) return text;

  if (depth === 2) {
    const circled = [
      '①',
      '②',
      '③',
      '④',
      '⑤',
      '⑥',
      '⑦',
      '⑧',
      '⑨',
      '⑩',
      '⑪',
      '⑫',
      '⑬',
      '⑭',
      '⑮',
      '⑯',
      '⑰',
      '⑱',
      '⑲',
      '⑳',
    ];
    if (index >= 1 && index <= 20) {
      return `${circled[index - 1]} ${text}`;
    }
    return `(${index}). ${text}`;
  }

  if (depth === 3) {
    return `${index}. ${text}`;
  }

  if (depth === 4) {
    const korean = [
      '가',
      '나',
      '다',
      '라',
      '마',
      '바',
      '사',
      '아',
      '자',
      '차',
      '카',
      '타',
      '파',
      '하',
    ];
    if (index >= 1 && index <= 14) {
      return `${korean[index - 1]}. ${text}`;
    }
    return `[${index}]. ${text}`;
  }

  return `${index}) ${text}`;
}

/**
 * 테이블 렌더링 (MS Word 스타일)
 */
async function renderTable(
  doc: any,
  section: TemplateSection,
  context: LPAContext,
  xPosition: number
): Promise<void> {
  try {
    if (!section.tableConfig) return;

    const { tableConfig } = section;

    // 결제 방식에 따라 헤더 필터링 (일시납일 때는 추가출자금만 숨김)
    const tableHeaders =
      context.fund.payment_schedule === 'lump_sum'
        ? tableConfig.headers.filter(h => h.property !== 'restAmount')
        : tableConfig.headers;

    const tableAbsoluteWidth = doc.page.width - 110;
    const tableRelativeWidth = tableHeaders.reduce(
      (acc, h) => acc + h.width,
      0
    );

    // 조합원 정렬: GP 먼저, 각 그룹 내에서 가나다순
    const sortedMembers = [...context.members].sort((a, b) => {
      // 1. GP가 LP보다 먼저
      if (a.member_type === 'GP' && b.member_type === 'LP') return -1;
      if (a.member_type === 'LP' && b.member_type === 'GP') return 1;

      // 2. 같은 타입 내에서는 이름으로 가나다순 정렬 (회사 형태 접두사 제거 후)
      const nameA = getNameForSorting(a.name);
      const nameB = getNameForSorting(b.name);
      return nameA.localeCompare(nameB, 'ko-KR');
    });

    // 테이블 데이터 생성
    const isPreview = context.isPreview || false;
    const datas = sortedMembers.map(member => {
      const restAmount = member.total_amount - member.initial_amount;
      const percentage =
        ((member.total_amount / context.fund.total_cap) * 100).toFixed(2) + '%';

      const baseData = {
        memberType: isPreview
          ? `<<PREVIEW>>${
              member.member_type === 'GP' ? '업무집행조합원' : '유한책임조합원'
            }<<PREVIEW_END>>`
          : member.member_type === 'GP'
          ? '업무집행조합원'
          : '유한책임조합원',
        name: isPreview
          ? `<<PREVIEW>>${member.name}<<PREVIEW_END>>`
          : member.name,
        units: isPreview
          ? `<<PREVIEW>>${member.total_units.toLocaleString(
              'ko-KR'
            )}<<PREVIEW_END>>`
          : member.total_units.toLocaleString('ko-KR'),
        totalAmount: isPreview
          ? `<<PREVIEW>>${member.total_amount.toLocaleString(
              'ko-KR'
            )}<<PREVIEW_END>>`
          : member.total_amount.toLocaleString('ko-KR'),
        initialAmount: isPreview
          ? `<<PREVIEW>>${member.initial_amount.toLocaleString(
              'ko-KR'
            )}<<PREVIEW_END>>`
          : member.initial_amount.toLocaleString('ko-KR'),
        percentage: isPreview
          ? `<<PREVIEW>>${percentage}<<PREVIEW_END>>`
          : percentage,
      };

      // 수시납인 경우에만 추가출자금 포함
      return context.fund.payment_schedule === 'lump_sum'
        ? baseData
        : {
            ...baseData,
            restAmount: isPreview
              ? `<<PREVIEW>>${restAmount.toLocaleString(
                  'ko-KR'
                )}<<PREVIEW_END>>`
              : restAmount.toLocaleString('ko-KR'),
          };
    });

    // 합계 행 추가
    const totalUnits = context.members.reduce(
      (sum, member) => sum + member.total_units,
      0
    );

    const baseTotalData = {
      memberType: '계',
      name: '',
      units: totalUnits.toLocaleString('ko-KR'),
      totalAmount: context.fund.total_cap.toLocaleString('ko-KR'),
      initialAmount: context.fund.initial_cap.toLocaleString('ko-KR'),
      percentage: '100.00%',
    };

    // 수시납인 경우에만 추가출자금 포함
    if (context.fund.payment_schedule === 'lump_sum') {
      datas.push(baseTotalData);
    } else {
      datas.push({
        ...baseTotalData,
        restAmount: (
          context.fund.total_cap - context.fund.initial_cap
        ).toLocaleString('ko-KR'),
      });
    }

    // 테이블 렌더링 설정
    const headers = tableHeaders.map(header => ({
      label: header.label,
      property: header.property,
      width: tableAbsoluteWidth * (header.width / tableRelativeWidth),
      align: header.align || 'left',
    }));

    const startX = xPosition ?? 50;
    const startY = doc.y;
    const rowHeight = 18;
    const cellPaddingX = 6;
    const cellPaddingY = 3;
    const borderColor = '#BFBFBF'; // MS Word 테두리 색상
    const headerBgColor = '#D9D9D9'; // MS Word 헤더 배경색
    const totalRowBgColor = '#F2F2F2'; // 합계 행 배경색

    // 헤더 렌더링 함수
    const renderHeader = (y: number) => {
      doc.save();

      // 헤더 행 배경색
      doc
        .rect(startX, y, tableAbsoluteWidth, rowHeight)
        .fillAndStroke(headerBgColor, borderColor);

      // stroke 후 fillColor 리셋
      doc.fillColor('#000000');

      let headerX = startX;

      tryFont(doc, '맑은고딕-Bold', 'Helvetica-Bold');
      doc.fontSize(9);

      headers.forEach((h, idx) => {
        // 세로 구분선 (헤더)
        if (idx > 0) {
          doc
            .moveTo(headerX, y)
            .lineTo(headerX, y + rowHeight)
            .lineWidth(0.5)
            .stroke(borderColor);
          // stroke 후 fillColor 리셋
          doc.fillColor('#000000');
        }

        doc.text(h.label, headerX + cellPaddingX, y + cellPaddingY, {
          width: h.width - cellPaddingX * 2,
          align: 'center',
          lineGap: 0,
        });
        headerX += h.width;
      });

      doc.restore();

      // restore 후에도 명시적으로 설정
      doc.fillColor('#000000');
      tryFont(doc, '맑은고딕', 'NanumGothic');
      doc.fontSize(9);
    };

    // 첫 헤더 렌더링
    let cursorY = startY;
    renderHeader(cursorY);
    cursorY += rowHeight;

    // 각 페이지의 시작 Y 위치 추적
    let pageStartY = startY;

    // 데이터 행 렌더링
    for (let rowIdx = 0; rowIdx < datas.length; rowIdx++) {
      const row = datas[rowIdx];
      const isLastRow = rowIdx === datas.length - 1;

      // 페이지 넘어감 처리
      if (cursorY + rowHeight > doc.page.height - 80) {
        // 현재 페이지의 마지막 행 하단 라인 그리기
        doc
          .moveTo(startX, cursorY)
          .lineTo(startX + tableAbsoluteWidth, cursorY)
          .lineWidth(0.5)
          .stroke(borderColor);
        doc.fillColor('#000000');

        // 현재 페이지의 세로 테두리 그리기
        doc
          .moveTo(startX, pageStartY)
          .lineTo(startX, cursorY)
          .lineWidth(1)
          .stroke(borderColor);
        doc.fillColor('#000000');

        doc
          .moveTo(startX + tableAbsoluteWidth, pageStartY)
          .lineTo(startX + tableAbsoluteWidth, cursorY)
          .lineWidth(1)
          .stroke(borderColor);
        doc.fillColor('#000000');

        // 새 페이지로 이동
        doc.addPage();
        cursorY = doc.y;
        pageStartY = cursorY;

        // 두번째 페이지부터는 헤더 없이 바로 시작
      }

      let cursorX = startX;

      // 합계 행 배경색
      if (isLastRow) {
        doc
          .rect(startX, cursorY, tableAbsoluteWidth, rowHeight)
          .fill(totalRowBgColor);
        // fill 후 fillColor 리셋
        doc.fillColor('#000000');
      }

      // 가로 구분선
      doc
        .moveTo(startX, cursorY)
        .lineTo(startX + tableAbsoluteWidth, cursorY)
        .lineWidth(0.5)
        .stroke(borderColor);
      // stroke 후 fillColor 리셋
      doc.fillColor('#000000');

      // 합계 행은 볼드체로
      if (isLastRow) {
        doc.save();
        tryFont(doc, '맑은고딕-Bold', 'Helvetica-Bold');
        doc.fontSize(9);
      } else {
        tryFont(doc, '맑은고딕', 'NanumGothic');
        doc.fontSize(9);
      }

      headers.forEach((h, colIdx) => {
        // 세로 구분선
        if (colIdx > 0) {
          doc
            .moveTo(cursorX, cursorY)
            .lineTo(cursorX, cursorY + rowHeight)
            .lineWidth(0.5)
            .stroke(borderColor);
          // stroke 후 fillColor 리셋
          doc.fillColor('#000000');
        }

        const text = String((row as any)[h.property] ?? '');

        // 스타일 마커가 있는 경우 특수 렌더링
        const hasStyleMarker = Object.values(STYLE_MARKERS).some(marker =>
          text.includes(marker.start)
        );

        if (hasStyleMarker) {
          const segments = parseStyleMarkers(text);
          const textOptions = {
            width: h.width - cellPaddingX * 2,
            align: h.align as any,
            lineGap: 0,
          };

          // 위치 설정
          doc.text('', cursorX + cellPaddingX, cursorY + cellPaddingY, {
            ...textOptions,
            continued: false,
          });

          // 스타일별로 텍스트 렌더링
          segments.forEach((segment, index) => {
            if (segment.text) {
              // 폰트 적용
              if (segment.styles.bold) {
                tryFont(doc, '맑은고딕-Bold', 'Helvetica-Bold');
              } else {
                tryFont(doc, '맑은고딕', 'Helvetica');
              }

              // 색상 적용
              doc.fillColor(segment.styles.color);

              doc.text(segment.text, {
                ...textOptions,
                continued: index < segments.length - 1,
              });
            }
          });

          // 스타일 복원
          tryFont(doc, '맑은고딕', 'Helvetica');
          doc.fillColor('#000000');
        } else {
          doc.text(text, cursorX + cellPaddingX, cursorY + cellPaddingY, {
            width: h.width - cellPaddingX * 2,
            align: h.align as any,
            lineGap: 0,
          });
        }
        cursorX += h.width;
      });

      if (isLastRow) {
        doc.restore();
        // restore 후 fillColor 리셋
        doc.fillColor('#000000');
      }

      cursorY += rowHeight;
    }

    // 테이블 하단 테두리
    doc
      .moveTo(startX, cursorY)
      .lineTo(startX + tableAbsoluteWidth, cursorY)
      .lineWidth(1)
      .stroke(borderColor);
    // stroke 후 fillColor 리셋
    doc.fillColor('#000000');

    // 마지막 페이지의 세로 테두리 (좌우)
    doc
      .moveTo(startX, pageStartY)
      .lineTo(startX, cursorY)
      .lineWidth(1)
      .stroke(borderColor);
    // stroke 후 fillColor 리셋
    doc.fillColor('#000000');

    doc
      .moveTo(startX + tableAbsoluteWidth, pageStartY)
      .lineTo(startX + tableAbsoluteWidth, cursorY)
      .lineWidth(1)
      .stroke(borderColor);
    // stroke 후 fillColor 리셋
    doc.fillColor('#000000');

    // 색상 및 폰트 완전히 리셋
    doc.fillColor('#000000');
    doc.strokeColor('#000000');
    tryFont(doc, '맑은고딕', 'NanumGothic');
    doc.fontSize(11);

    doc.y = cursorY + 10;
  } catch (error) {
    console.error('테이블 렌더링 오류:', error);
    doc.fontSize(10);
    tryFont(doc, '맑은고딕', 'NanumGothic');
    doc.text('[테이블 렌더링 오류]', 50, doc.y).moveDown(1);
  }
}

/**
 * 섹션 렌더링
 */
async function renderSection(
  doc: any,
  section: TemplateSection,
  context: LPAContext,
  depth: number,
  indent: number,
  currentPageNumber: { value: number }
): Promise<void> {
  const fontSize = 12;
  const pageMargin = 50;
  const pageBottomMargin = 80;
  const maxY = doc.page.height - pageBottomMargin;

  // depth 0: 장(章) 제목 렌더링
  if (depth === 0 && section.title) {
    const chapterFontSize = 16;
    const titleHeight = chapterFontSize + 30;

    if (doc.y + titleHeight > maxY) {
      doc.addPage();
      currentPageNumber.value++;
      addPageFooter(doc, currentPageNumber.value);
    }

    // 위쪽 간격 추가 (페이지 시작이 아닌 경우에만)
    if (doc.y > 100) {
      doc.moveDown(2);
    }

    doc.fontSize(chapterFontSize);
    tryFont(doc, '맑은고딕-Bold', 'NanumGothicBold');

    // index가 -1이면 장 번호 없이 title만 표시
    const chapterTitle =
      section.index === -1
        ? section.title
        : `제 ${section.index} 장    ${section.title}`;

    doc.text(chapterTitle, pageMargin, doc.y, {
      width: doc.page.width - pageMargin * 2,
      align: 'center',
      continued: false,
    });
    doc.moveDown(2);
  }
  // depth 1: 조(條) 제목 렌더링
  else if (depth === 1 && section.title) {
    const titleHeight = fontSize + 10;
    if (doc.y + titleHeight > maxY) {
      doc.addPage();
      currentPageNumber.value++;
      addPageFooter(doc, currentPageNumber.value);
    }

    doc.fontSize(fontSize);
    tryFont(doc, '맑은고딕-Bold', 'NanumGothicBold');
    doc.text(
      `제${section.index}조 (${section.title})`,
      pageMargin, // depth 1은 indent 없음
      doc.y,
      {
        continued: false,
      }
    );
    doc.moveDown(0.5);
  }

  // 내용 렌더링
  if (section.text && section.type !== 'table') {
    const processedText = processTemplateVariables(section.text, context);
    const processedTextWithIndex = addIndex(
      depth,
      section.index,
      processedText
    );

    // depth 0, 1은 indent 없음
    const currentIndent = depth >= 2 ? indent : 0;

    const textOptions = {
      width: doc.page.width - pageMargin * 2 - currentIndent,
      align: 'justify' as const,
      lineGap: 2,
    };

    doc.fontSize(fontSize - 1);
    tryFont(doc, '맑은고딕', 'NanumGothic');

    // 스타일 마커 제거 후 높이 계산
    const textForHeight = processedTextWithIndex.replace(
      /<<\w+>>|<<\w+_END>>/g,
      ''
    );
    const textHeight = doc.heightOfString(textForHeight, textOptions);

    if (doc.y + textHeight > maxY) {
      doc.addPage();
      currentPageNumber.value++;
      addPageFooter(doc, currentPageNumber.value);
    }

    doc.fontSize(fontSize - 1);
    tryFont(doc, '맑은고딕', 'NanumGothic');
    renderStyledText(
      doc,
      processedTextWithIndex,
      pageMargin + currentIndent,
      doc.y,
      textOptions,
      {
        regular: '맑은고딕',
        bold: '맑은고딕-Bold',
      }
    );
    doc.moveDown(1);
  } else if (section.text && section.type === 'table') {
    const processedText = processTemplateVariables(section.text, context);

    // depth 0, 1은 indent 없음
    const currentIndent = depth >= 2 ? indent : 0;

    doc.fontSize(fontSize - 1);
    tryFont(doc, '맑은고딕', 'NanumGothic');
    renderStyledText(
      doc,
      processedText,
      pageMargin + currentIndent,
      doc.y,
      {
        width: doc.page.width - pageMargin * 2 - currentIndent,
        align: 'justify' as const,
        lineGap: 2,
      },
      {
        regular: '맑은고딕',
        bold: '맑은고딕-Bold',
      }
    );
    doc.moveDown(0.5);
  }

  // 테이블 렌더링
  if (section.type === 'table' && section.tableConfig) {
    // depth 0, 1은 indent 없음
    const currentIndent = depth >= 2 ? indent : 0;
    await renderTable(doc, section, context, pageMargin + currentIndent);
  }

  // 하위 섹션 재귀적으로 렌더링
  if (section.sub && section.sub.length > 0) {
    for (const subSection of section.sub) {
      // 다음 depth 계산
      const nextDepth = depth + 1;

      // indent 계산: depth 2부터 적용, index > 0인 경우 indent 증가
      let nextIndent = indent;
      if (nextDepth >= 2 && subSection.index > 0) {
        nextIndent = indent + INDENT_SIZE;
      }

      await renderSection(
        doc,
        subSection,
        context,
        nextDepth,
        nextIndent,
        currentPageNumber
      );
    }
  }
}

/**
 * 조합원 필터링 (이름 가나다순 정렬, 회사 형태 접두사 제외)
 */
function filterMembers(filter: AppendixFilter, context: LPAContext) {
  let filtered: typeof context.members;

  switch (filter) {
    case 'gpMembers':
      filtered = context.members.filter(m => m.member_type === 'GP');
      break;
    case 'lpMembers':
      filtered = context.members.filter(m => m.member_type === 'LP');
      break;
    case 'allMembers':
      filtered = context.members;
      break;
    default:
      return [];
  }

  // 이름 기준 가나다순 정렬 (회사 형태 접두사 제거 후)
  return filtered.sort((a, b) => {
    const nameA = getNameForSorting(a.name);
    const nameB = getNameForSorting(b.name);
    return nameA.localeCompare(nameB, 'ko-KR');
  });
}

/**
 * 섹션 반복 렌더링 (별지1 스타일)
 */
async function renderRepeatingSectionAppendix(
  doc: any,
  appendixDef: AppendixDefinition,
  members: any[],
  context: LPAContext,
  currentPageNumber: { value: number }
): Promise<void> {
  const pageMargin = 50;

  // 새 페이지 시작
  doc.addPage();
  currentPageNumber.value++;

  // 헤더 렌더링
  if (appendixDef.template.header) {
    renderAppendixHeader(doc, appendixDef.template.header.text);
  }

  // 타이틀 렌더링
  if (appendixDef.title) {
    renderAppendixTitle(doc, appendixDef.template.title || '');
  }

  // 각 조합원에 대해 섹션 반복
  for (const member of members) {
    // currentMember 설정
    const memberContext: LPAContext = {
      ...context,
      currentMember: member,
    };

    for (const section of appendixDef.template.sections || []) {
      if (section.title) {
        doc.fontSize(12);
        tryFont(doc, '맑은고딕-Bold', 'NanumGothicBold');
        doc.text(section.title, pageMargin, doc.y);
        doc.moveDown(1);
      }

      // 필드 렌더링
      doc.fontSize(11);
      tryFont(doc, '맑은고딕', 'NanumGothic');

      for (const field of section.fields) {
        const value = processTemplateVariables(field.variable, memberContext);

        // 법인의 경우 "생년월일" 레이블을 "사업자번호"로 변경
        let displayLabel = field.label;
        if (field.label === '생년월일' && member) {
          const memberData = member as any;
          if (memberData.entity_type === 'corporate') {
            displayLabel = '사업자번호';
          }
        }

        // 스타일 마커 처리를 위해 renderStyledText 사용
        const labelText = (field as any).seal
          ? `${displayLabel} : ${value}    (인)`
          : `${displayLabel} : ${value}`;
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

      doc.moveDown(2);
    }
  }

  addPageFooter(doc, currentPageNumber.value);
}

/**
 * 별지 렌더링 메인 함수
 */
async function renderAppendix(
  doc: any,
  appendixDef: AppendixDefinition,
  context: LPAContext,
  currentPageNumber: { value: number }
): Promise<void> {
  // 필터에 따라 조합원 선택
  const members = filterMembers(appendixDef.filter, context);

  if (members.length === 0) {
    console.log(`별지 ${appendixDef.id}: 렌더링할 조합원이 없습니다.`);
    return;
  }

  if (appendixDef.type === 'repeating-section') {
    await renderRepeatingSectionAppendix(
      doc,
      appendixDef,
      members,
      context,
      currentPageNumber
    );
  }
}

/**
 * LPA PDF 생성
 */
export async function generateLPAPDF(
  content: ProcessedLPAContent,
  context: LPAContext,
  template?: LPATemplate
): Promise<Buffer> {
  const defaultFontPath = getFontPath();

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 30, left: 50, right: 50 },
    font: defaultFontPath,
    info: {
      Title: `${context.fund.name} 규약(안)`,
      Author: context.user.name,
      Subject: `${context.fund.name} 규약(안)`,
      Creator: 'SNUSV Angel Club Document System',
    },
  });

  // 한글 폰트 등록
  registerKoreanFonts(doc);

  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  // 페이지 번호 추적
  const currentPageNumber = { value: 1 };

  // 타이틀 페이지
  addTitlePage(doc, context);
  currentPageNumber.value = 2;

  // 섹션 렌더링
  for (const section of content.sections) {
    await renderSection(doc, section, context, 0, 0, currentPageNumber);
  }

  // 별지 렌더링
  if (template?.appendix && template.appendix.length > 0) {
    console.log(`별지 ${template.appendix.length}개 렌더링 시작`);

    for (const appendixDef of template.appendix) {
      await renderAppendix(doc, appendixDef, context, currentPageNumber);
    }
  }

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      console.log(`LPA PDF 생성 완료: ${pdfBuffer.length} bytes`);
      resolve(pdfBuffer);
    });
    doc.on('error', reject);
  });
}
