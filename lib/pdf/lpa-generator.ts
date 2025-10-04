// LPA PDF 생성기

import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { processTemplateVariables } from './template-processor';
import type { LPAContext, ProcessedLPAContent, TemplateSection } from './types';

/**
 * 한글 폰트 등록
 */
function registerKoreanFonts(doc: any): void {
  try {
    const fontDir = path.join(process.cwd(), 'lib', 'pdf', 'fonts');

    const regularPath = path.join(fontDir, 'malgun.ttf');
    const boldPath = path.join(fontDir, 'malgunbd.ttf');
    const nanumRegularPath = path.join(fontDir, 'NanumGothic.ttf');
    const nanumBoldPath = path.join(fontDir, 'NanumGothicBold.ttf');

    if (fs.existsSync(regularPath)) {
      doc.registerFont('맑은고딕', regularPath);
    }

    if (fs.existsSync(boldPath)) {
      doc.registerFont('맑은고딕-Bold', boldPath);
    }

    if (fs.existsSync(nanumRegularPath)) {
      doc.registerFont('NanumGothic', nanumRegularPath);
    }

    if (fs.existsSync(nanumBoldPath)) {
      doc.registerFont('NanumGothicBold', nanumBoldPath);
    }
  } catch (error) {
    console.error('폰트 등록 실패:', error);
  }
}

/**
 * 폰트 안전하게 적용
 */
function tryFont(doc: any, preferredFont: string, fallbackFont: string): void {
  try {
    doc.font(preferredFont);
  } catch {
    // 시스템 폰트 대신 번들된 한글 폰트를 사용
    try {
      doc.font('NanumGothic');
    } catch {
      doc.font(fallbackFont);
    }
  }
}

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

  // 발행처
  doc.fontSize(12);
  tryFont(doc, '맑은고딕', 'NanumGothic');
  doc.text(`업무집행조합원: ${context.user.name}`, 50, pageHeight - 120, {
    align: 'center',
    width: pageWidth - 100,
  });

  // 새 페이지 추가
  doc.addPage();
  addPageFooter(doc, 2);
}

/**
 * 페이지 하단에 페이지 번호 추가
 */
function addPageFooter(doc: any, pageNumber: number): void {
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
 * 항목 번호 포맷팅
 */
function addIndex(depth: number, index: number, text: string): string {
  if (depth === 0) return text;

  if (depth === 1) {
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

  if (depth === 2) {
    return `${index}. ${text}`;
  }

  if (depth === 3) {
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

    // 결제 방식에 따라 헤더 필터링
    const tableHeaders =
      context.fund.payment_schedule === 'lump_sum'
        ? tableConfig.headers.filter(
            h => h.property !== 'initialAmount' && h.property !== 'restAmount'
          )
        : tableConfig.headers;

    const tableAbsoluteWidth = doc.page.width - 110;
    const tableRelativeWidth = tableHeaders.reduce(
      (acc, h) => acc + h.width,
      0
    );

    // 정렬용 이름 추출 (회사 형태 접두사 제거)
    const getNameForSorting = (name: string): string => {
      return name
        .replace(/^주식회사\s*/g, '') // 앞의 "주식회사" 제거
        .replace(/\s*주식회사$/g, '') // 뒤의 "주식회사" 제거
        .replace(/^\(주\)\s*/g, '') // 앞의 "(주)" 제거
        .replace(/^㈜\s*/g, '') // 앞의 "㈜" 제거
        .trim();
    };

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
    const datas = sortedMembers.map(member => {
      const restAmount = member.total_amount - member.initial_amount;
      const percentage =
        ((member.total_amount / context.fund.total_cap) * 100).toFixed(2) + '%';

      return context.fund.payment_schedule === 'lump_sum'
        ? {
            memberType:
              member.member_type === 'GP' ? '업무집행조합원' : '유한책임조합원',
            name: member.name,
            units: member.total_units.toLocaleString('ko-KR'),
            totalAmount: member.total_amount.toLocaleString('ko-KR'),
            percentage,
          }
        : {
            memberType:
              member.member_type === 'GP' ? '업무집행조합원' : '유한책임조합원',
            name: member.name,
            units: member.total_units.toLocaleString('ko-KR'),
            totalAmount: member.total_amount.toLocaleString('ko-KR'),
            initialAmount: member.initial_amount.toLocaleString('ko-KR'),
            restAmount: restAmount.toLocaleString('ko-KR'),
            percentage,
          };
    });

    // 합계 행 추가
    const totalUnits = context.members.reduce(
      (sum, member) => sum + member.total_units,
      0
    );

    if (context.fund.payment_schedule === 'lump_sum') {
      datas.push({
        memberType: '계',
        name: '',
        units: totalUnits.toLocaleString('ko-KR'),
        totalAmount: context.fund.total_cap.toLocaleString('ko-KR'),
        percentage: '100.00%',
      });
    } else {
      datas.push({
        memberType: '계',
        name: '',
        units: totalUnits.toLocaleString('ko-KR'),
        totalAmount: context.fund.total_cap.toLocaleString('ko-KR'),
        initialAmount: context.fund.initial_cap.toLocaleString('ko-KR'),
        restAmount: (
          context.fund.total_cap - context.fund.initial_cap
        ).toLocaleString('ko-KR'),
        percentage: '100.00%',
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
    const rowHeight = 22;
    const cellPaddingX = 6;
    const cellPaddingY = 5;
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
        doc.text(text, cursorX + cellPaddingX, cursorY + cellPaddingY, {
          width: h.width - cellPaddingX * 2,
          align: h.align as any,
          lineGap: 0,
        });
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

  // 제목 렌더링
  if (section.title) {
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
      pageMargin + indent,
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

    const textOptions = {
      width: doc.page.width - pageMargin * 2 - indent,
      align: 'justify' as const,
      lineGap: 2,
    };

    doc.fontSize(fontSize - 1);
    tryFont(doc, '맑은고딕', 'NanumGothic');
    const textHeight = doc.heightOfString(processedTextWithIndex, textOptions);

    if (doc.y + textHeight > maxY) {
      doc.addPage();
      currentPageNumber.value++;
      addPageFooter(doc, currentPageNumber.value);
    }

    doc.fontSize(fontSize - 1);
    tryFont(doc, '맑은고딕', 'NanumGothic');
    doc.text(processedTextWithIndex, pageMargin + indent, doc.y, textOptions);
    doc.moveDown(1);
  } else if (section.text && section.type === 'table') {
    const processedText = processTemplateVariables(section.text, context);

    doc.fontSize(fontSize - 1);
    tryFont(doc, '맑은고딕', 'NanumGothic');
    doc.text(processedText, pageMargin + indent, doc.y, {
      width: doc.page.width - pageMargin * 2 - indent,
      align: 'justify' as const,
      lineGap: 2,
    });
    doc.moveDown(0.5);
  }

  // 테이블 렌더링
  if (section.type === 'table' && section.tableConfig) {
    await renderTable(doc, section, context, pageMargin + indent);
  }

  // 하위 섹션 재귀적으로 렌더링
  if (section.sub && section.sub.length > 0) {
    for (const subSection of section.sub) {
      await renderSection(
        doc,
        subSection,
        context,
        depth + 1,
        subSection.index > 0 ? indent + 10 : indent,
        currentPageNumber
      );
    }
  }
}

/**
 * LPA PDF 생성
 */
export async function generateLPAPDF(
  content: ProcessedLPAContent,
  context: LPAContext
): Promise<Buffer> {
  // PDFKit는 기본 폰트가 지정되지 않으면 Helvetica를 로드하려고 하므로,
  // 생성 시점에 번들된 TTF 폰트를 기본 폰트로 지정한다.
  const fontsDir = path.join(process.cwd(), 'lib', 'pdf', 'fonts');
  const defaultFontCandidates = [
    path.join(fontsDir, 'NanumGothic.ttf'),
    path.join(fontsDir, 'malgun.ttf'),
  ];
  const defaultFontPath = defaultFontCandidates.find(p => fs.existsSync(p));

  if (!defaultFontPath) {
    throw new Error(
      '기본 폰트를 찾을 수 없습니다. lib/pdf/fonts에 TTF 파일을 배치하세요.'
    );
  }

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
    await renderSection(doc, section, context, 0, 10, currentPageNumber);
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
