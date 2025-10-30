/**
 * 개인정보 수집·이용·제공 동의서 PDF 생성기
 *
 * 개인 조합원(entity_type = 'individual')을 대상으로
 * 2페이지 구조의 동의서를 생성합니다.
 */

import type {
  MemberPage,
  PersonalInfoConsentFormContext,
  PersonalInfoConsentFormTemplate,
} from '@/types/assemblies';
import PDFDocument from 'pdfkit';
import { getFontPath, registerKoreanFonts } from './template-font';

// PDF 페이지 크기 및 여백 설정
const PAGE_WIDTH = 595.28; // A4 width in points
const PAGE_HEIGHT = 841.89; // A4 height in points
const MARGIN_LEFT = 60;
const MARGIN_RIGHT = 60;
const MARGIN_TOP = 60;
const MARGIN_BOTTOM = 60;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

// 들여쓰기 맵
const INDENT_MAP: Record<number, number> = {
  0: 0, // 제목 레벨
  1: 15, // 주요 항목 (○)
  2: 25, // 세부 항목 (-)
  3: 35,
};

const INDENT_MAP_MARGIN: Record<number, number> = {
  0: 1, // 제목 레벨
  1: 0.5, // 주요 항목 (○)
  2: 0.5, // 세부 항목 (-)
  3: 0.3, // 세부 항목 (-)
};

/**
 * 개인정보 동의서 PDF 생성
 *
 * @param template - 개인정보 동의서 템플릿
 * @param context - 조합원 정보 컨텍스트
 * @returns PDF Buffer 및 memberPages 매핑 정보
 */
export async function generatePersonalInfoConsentFormPDF(
  template: PersonalInfoConsentFormTemplate,
  context: PersonalInfoConsentFormContext
): Promise<{
  pdfBuffer: Buffer;
  memberPages: MemberPage[];
}> {
  const defaultFontPath = getFontPath();

  const doc = new PDFDocument({
    size: 'A4',
    margins: {
      top: MARGIN_TOP,
      bottom: MARGIN_BOTTOM,
      left: MARGIN_LEFT,
      right: MARGIN_RIGHT,
    },
    font: defaultFontPath,
    autoFirstPage: false,
    info: {
      Title: `${context.fund.name} 개인정보 수집·이용·제공 동의서`,
      Subject: '개인정보 수집·이용·제공 동의서',
      Creator: 'SNUSV Angel Club Document System',
    },
  });

  // 한글 폰트 등록
  registerKoreanFonts(doc);

  // 등록 후 기본 폰트로 설정 (폰트가 제대로 등록되었는지 확인)
  try {
    doc.font('NotoSansKR-Regular');
    console.log('✓ NotoSansKR-Regular 폰트 적용 성공');
  } catch (error) {
    console.error('✗ NotoSansKR-Regular 폰트 적용 실패:', error);
    // 폴백: 기본 폰트 사용
    doc.font(defaultFontPath);
  }

  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  // memberPages 매핑 정보 생성
  const memberPages: MemberPage[] = [];

  // 개인 조합원만 필터링
  const individualMembers = context.lpMembers.filter(
    member => member.birthDate // birthDate가 있으면 개인 조합원
  );

  // 각 개인 조합원별로 2페이지씩 생성
  let pageNumber = 0;
  for (const member of individualMembers) {
    // 멤버 페이지 정보 기록
    memberPages.push({
      member_id: member.id,
      member_name: member.name,
      page_number: pageNumber + 1, // 1-based (첫 페이지)
    });

    // 페이지 1: 수집·이용 동의
    const page1 = template.pages[0];
    if (page1) {
      doc.addPage();
      pageNumber++;

      // 헤더
      if (page1.header) {
        renderHeader(doc, page1.header);
      }

      // 타이틀
      if (page1.title) {
        renderTitle(doc, page1.title);
      }

      // 설명 문단
      renderDescriptionParagraphs(doc, page1.description.paragraphs);

      // 동의 항목 박스
      renderConsentBox(doc, page1.consent_box);

      // Footer
      renderFooter(doc, page1.footer, member, context);
    }

    // 페이지 2: 제3자 제공 동의
    const page2 = template.pages[1];
    if (page2) {
      doc.addPage();
      pageNumber++;

      // 설명 문단
      doc.y = MARGIN_TOP;
      renderDescriptionParagraphs(doc, page2.description.paragraphs);

      // 동의 항목 박스
      renderConsentBox(doc, page2.consent_box);

      // Footer
      renderFooter(doc, page2.footer, member, context);
    }
  }

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      console.log(
        `개인정보 동의서 PDF 생성 완료: ${pdfBuffer.length} bytes, ${individualMembers.length}명, ${pageNumber}페이지`
      );
      resolve({ pdfBuffer, memberPages });
    });
    doc.on('error', reject);
  });
}

/**
 * 헤더 렌더링 (페이지 1만)
 */
function renderHeader(doc: PDFKit.PDFDocument, headerText: string) {
  doc
    .fontSize(10)
    .font('NotoSansKR-Regular')
    .text(headerText, MARGIN_LEFT, MARGIN_TOP, {
      width: CONTENT_WIDTH,
      align: 'left',
    });
  doc.moveDown(1);
}

/**
 * 타이틀 렌더링 (페이지 1만)
 */
function renderTitle(doc: PDFKit.PDFDocument, titleText: string) {
  doc.fontSize(16).font('NotoSansKR-Bold').text(titleText, MARGIN_LEFT, doc.y, {
    width: CONTENT_WIDTH,
    align: 'center',
  });
}

/**
 * 설명 문단 렌더링 (들여쓰기 처리)
 */
function renderDescriptionParagraphs(
  doc: PDFKit.PDFDocument,
  paragraphs: Array<{ text: string; indent: number }>
) {
  doc.fontSize(10).font('NotoSansKR-Regular');

  for (const paragraph of paragraphs) {
    // 문단 간 간격
    doc.moveDown(INDENT_MAP_MARGIN[paragraph.indent]);

    const leftMargin = MARGIN_LEFT + INDENT_MAP[paragraph.indent];

    doc.text(paragraph.text, leftMargin, doc.y, {
      width: CONTENT_WIDTH - INDENT_MAP[paragraph.indent],
      align: 'left',
      lineGap: 2,
    });
  }

  doc.moveDown(1);
}

/**
 * 동의 항목 박스 렌더링
 */
function renderConsentBox(
  doc: PDFKit.PDFDocument,
  consentBox: {
    title: string;
    items: Array<{ label: string; options: string[] }>;
  }
) {
  const boxX = MARGIN_LEFT + 20;
  const boxWidth = CONTENT_WIDTH - 40;
  const boxStartY = doc.y;

  // 박스 내용을 먼저 렌더링하여 높이 계산
  const contentStartY = boxStartY + 5;
  doc.fontSize(10).font('NotoSansKR-Regular');

  // 제목
  doc.text(consentBox.title, boxX + 10, contentStartY, {
    width: boxWidth - 20,
    align: 'left',
  });
  doc.moveDown(0.8);

  // 각 항목
  for (const item of consentBox.items) {
    const itemY = doc.y;

    // 레이블 (왼쪽)
    doc.text(item.label, boxX + 10, itemY, {
      width: boxWidth - 200,
      align: 'left',
      continued: false,
    });

    // 선택지 (오른쪽)
    const optionsText = item.options.join(' ');
    doc.text(optionsText, boxX + boxWidth - 190, itemY, {
      width: 180,
      align: 'right',
    });

    doc.moveDown(0.3);
  }

  const boxEndY = doc.y + 5;
  const boxHeight = boxEndY - boxStartY;

  // 박스 테두리 그리기
  doc.rect(boxX, boxStartY, boxWidth, boxHeight).lineWidth(1).stroke();

  doc.y = boxEndY;
  doc.moveDown(1);
}

/**
 * Footer 렌더링
 */
function renderFooter(
  doc: PDFKit.PDFDocument,
  footer: {
    lines: Array<{
      text: string;
      align?: 'left' | 'right' | 'center';
      spacer?: boolean;
    }>;
  },
  member: { name: string; birthDate: string },
  context: PersonalInfoConsentFormContext
) {
  // Footer는 페이지 하단에 위치
  const footerY = PAGE_HEIGHT - MARGIN_BOTTOM - 60;
  doc.y = footerY;

  doc.fontSize(10).font('NotoSansKR-Regular');

  for (const line of footer.lines) {
    if (line.spacer) {
      // 빈 줄
      doc.moveDown(1);
      continue;
    }

    // 변수 치환
    let text = line.text;
    text = text.replace('${date}', formatDate(context.fund.closedAt));
    text = text.replace('${birthDateMasked}', maskBirthDate(member.birthDate));
    text = text.replace('${name}', member.name);

    // 정렬에 따라 렌더링
    doc.text(text, MARGIN_LEFT, doc.y, {
      width: CONTENT_WIDTH,
      align: line.align || 'left',
    });
    doc.moveDown(0.3);
  }
}

/**
 * 주민등록번호 마스킹
 * @param birthDate - YYMMDD 또는 YYYY-MM-DD 형식
 * @returns YYMMDD- 형식
 */
function maskBirthDate(birthDate: string): string {
  if (!birthDate) {
    return '______-';
  }

  // YYYY-MM-DD 형식인 경우 (예: 1984-01-15)
  if (birthDate.includes('-') && birthDate.length === 10) {
    const parts = birthDate.split('-');
    if (parts.length === 3) {
      const year = parts[0].substring(2); // 1984 -> 84
      const month = parts[1].padStart(2, '0'); // 1 -> 01
      const day = parts[2].padStart(2, '0'); // 5 -> 05
      return `${year}${month}${day} - ________`;
    }
  }

  // YYMMDD 형식인 경우 (예: 840115)
  if (birthDate.length >= 6 && /^\d+$/.test(birthDate)) {
    return birthDate.substring(0, 6) + ' - ________';
  }

  // 형식을 알 수 없는 경우
  console.warn('알 수 없는 생년월일 형식:', birthDate);
  return '________ - ________';
}

/**
 * 날짜 형식 변환
 * @param dateString - ISO 날짜 문자열 (YYYY-MM-DD)
 * @returns "YYYY년 MM월 DD일" 형식
 */
function formatDate(dateString?: string): string {
  if (!dateString) {
    return '____년 __월 __일';
  }

  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    return `${year}년 ${month}월 ${day}일`;
  } catch (e) {
    return '____년 __월 __일';
  }
}
