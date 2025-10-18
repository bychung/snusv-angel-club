// 조합원 명부 PDF 생성기

import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { getNameForSorting } from '../format-utils';
import { MEMBER_LIST_CONFIG } from './member-list-config';
import { getFontPath } from './utils';

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
 * 조합원 명부 기본 템플릿 설정
 */
export function getDefaultMemberListTemplate() {
  console.log('getDefaultMemberListTemplate');
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

      // 템플릿에서 설정 가져오기 (없으면 기본값)
      const config = MEMBER_LIST_CONFIG;
      const templateContent = data.template?.content || {};
      const defaultTemplate = getDefaultMemberListTemplate();

      const title = templateContent.title || defaultTemplate.title;
      const tableConfig =
        templateContent.table_config || defaultTemplate.table_config;
      const footerLabels =
        templateContent.footer_labels || defaultTemplate.footer_labels;

      // 제목
      doc
        .font(config.fonts.title.family)
        .fontSize(config.fonts.title.size)
        .text(title, { align: 'center' });
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

          doc.text(col.label, headerX, yOffset, options);
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
              // 주소는 특별 처리 (다중 라인 대응)
              const addressHeight = doc.heightOfString(member.address, {
                width: col.width - 10,
                lineGap: -1,
              });
              const addressY = currentY + (rowHeight - addressHeight) / 2;
              doc.text(member.address, currentX + 5, addressY, {
                width: col.width - 10,
                align: align,
                lineGap: -1,
              });
              currentX += col.width;
              return; // 다음 컬럼으로
            case 'phone':
              value = member.phone;
              break;
            case 'units':
              value = member.units.toLocaleString();
              break;
          }

          doc.text(value, currentX, textY, {
            width: col.width,
            align: align,
          });
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

      // 날짜 (가운데 정렬)
      doc.text(formatDate(data.assembly_date), 0, bottomY, {
        width: doc.page.width,
        align: 'center',
      });
      doc.moveDown(2);

      // 조합명 (크게, 가운데 정렬)
      doc
        .fontSize(config.fonts.fund_name.size)
        .font(config.fonts.fund_name.family);
      doc.text(data.fund_name, 0, doc.y, {
        width: doc.page.width,
        align: 'center',
      });
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

      // 업무집행조합원 텍스트를 가운데 정렬하기 위해 전체 텍스트 너비 계산
      const gpMainText = `${footerLabels.gp_prefix} ${gpNames} `;
      const gpSealText = footerLabels.seal_text;
      const pageWidth = doc.page.width;
      const totalTextWidth =
        doc.widthOfString(gpMainText) + doc.widthOfString(gpSealText);
      const startX = (pageWidth - totalTextWidth) / 2;

      const gpY = doc.y;

      // 일반 텍스트
      doc.fillColor('#000000');
      doc.text(gpMainText, startX, gpY, {
        continued: true,
      });

      // 흐린 텍스트
      doc.fillColor('#999999');
      doc.text(gpSealText);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
