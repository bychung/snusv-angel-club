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
 * 테이블 렌더링
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
        ? tableConfig.headers.filter(h => h.property !== 'restAmount')
        : tableConfig.headers;

    const tableAbsoluteWidth = doc.page.width - 110;
    const tableRelativeWidth = tableHeaders.reduce(
      (acc, h) => acc + h.width,
      0
    );

    // 테이블 데이터 생성
    const datas = context.members.map(member => {
      const restAmount = member.total_amount - member.initial_amount;
      const percentage =
        ((member.total_amount / context.fund.total_cap) * 100).toLocaleString(
          'ko-KR'
        ) + '%';

      return context.fund.payment_schedule === 'lump_sum'
        ? {
            memberType:
              member.member_type === 'GP' ? '업무집행조합원' : '유한책임조합원',
            name: member.name,
            totalAmount: member.total_amount.toLocaleString('ko-KR'),
            initialAmount: member.initial_amount.toLocaleString('ko-KR'),
            percentage,
          }
        : {
            memberType:
              member.member_type === 'GP' ? '업무집행조합원' : '유한책임조합원',
            name: member.name,
            totalAmount: member.total_amount.toLocaleString('ko-KR'),
            initialAmount: member.initial_amount.toLocaleString('ko-KR'),
            restAmount: restAmount.toLocaleString('ko-KR'),
            percentage,
          };
    });

    // 합계 행 추가
    if (context.fund.payment_schedule === 'lump_sum') {
      datas.push({
        memberType: '계',
        name: '',
        totalAmount: context.fund.total_cap.toLocaleString('ko-KR'),
        initialAmount: context.fund.total_cap.toLocaleString('ko-KR'),
        percentage: '100%',
      });
    } else {
      datas.push({
        memberType: '계',
        name: '',
        totalAmount: context.fund.total_cap.toLocaleString('ko-KR'),
        initialAmount: context.fund.initial_cap.toLocaleString('ko-KR'),
        restAmount: (
          context.fund.total_cap - context.fund.initial_cap
        ).toLocaleString('ko-KR'),
        percentage: '100%',
      });
    }

    // 수동 테이블 렌더링 (pdfkit-table 제거)
    const headers = tableHeaders.map(header => ({
      label: header.label,
      property: header.property,
      width: tableAbsoluteWidth * (header.width / tableRelativeWidth),
      align: header.align || 'left',
    }));

    const startX = xPosition ?? 50;
    let cursorX = startX;
    let cursorY = doc.y;
    const rowHeight = 16;
    const cellPaddingX = 4;

    // 헤더 렌더링
    doc.save();
    tryFont(doc, '맑은고딕-Bold', 'Helvetica-Bold');
    doc.fontSize(9).fillColor('#000');
    headers.forEach(h => {
      doc.text(h.label, cursorX + cellPaddingX, cursorY, {
        width: h.width - cellPaddingX * 2,
        align: 'left',
      });
      cursorX += h.width;
    });
    doc.restore();
    cursorY += rowHeight;
    doc
      .moveTo(startX, cursorY - 4)
      .lineTo(startX + tableAbsoluteWidth, cursorY - 4)
      .lineWidth(0.5)
      .stroke('#999');

    // 데이터 렌더링
    tryFont(doc, '맑은고딕', 'NanumGothic');
    doc.fontSize(9).fillColor('#000');
    for (const row of datas) {
      // 페이지 넘어감 처리
      if (cursorY + rowHeight > doc.page.height - 80) {
        doc.addPage();
        cursorY = doc.y;
      }
      cursorX = startX;
      headers.forEach(h => {
        const text = String((row as any)[h.property] ?? '');
        doc.text(text, cursorX + cellPaddingX, cursorY, {
          width: h.width - cellPaddingX * 2,
          align: h.align as any,
        });
        cursorX += h.width;
      });
      cursorY += rowHeight;
    }
    doc.y = cursorY + 6;
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
