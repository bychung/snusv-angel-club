// 조합원 명부 PDF 생성기

import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { getNameForSorting } from '../format-utils';
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

      // 제목
      doc
        .font('맑은고딕-Bold')
        .fontSize(18)
        .text('조합원 명부', { align: 'center' });
      doc.moveDown(2);

      // 조합원 정렬 (가나다순)
      const sortedMembers = [...data.members].sort((a, b) => {
        const nameA = getNameForSorting(a.name);
        const nameB = getNameForSorting(b.name);
        return nameA.localeCompare(nameB, 'ko');
      });

      // 테이블 그리기
      const tableLeft = 50;
      const tableWidth = 495; // A4 width - margins

      // 컬럼 너비 정의
      const colWidths = {
        no: 30,
        name: 80,
        identifier: 85, // 생년월일/사업자번호
        address: 165,
        phone: 75,
        units: 60,
      };

      const rowHeight = 30;
      let currentY = doc.y;
      let pageTableTop = currentY; // 현재 페이지의 테이블 시작 위치

      // 헤더 그리기 함수
      const drawHeader = () => {
        doc.font('맑은고딕-Bold').fontSize(9);

        // 헤더 배경
        doc.rect(tableLeft, currentY, tableWidth, rowHeight).fill('#f0f0f0');

        // 헤더 텍스트
        doc.fillColor('#000000');
        let headerX = tableLeft;

        doc.text('번호', headerX, currentY + 10, {
          width: colWidths.no,
          align: 'center',
        });
        headerX += colWidths.no;

        doc.text('조합원명', headerX, currentY + 10, {
          width: colWidths.name,
          align: 'center',
        });
        headerX += colWidths.name;

        doc.text('생년월일\n(사업자등록번호)', headerX, currentY + 5, {
          width: colWidths.identifier,
          align: 'center',
          lineGap: -2,
        });
        headerX += colWidths.identifier;

        doc.text('주소', headerX, currentY + 10, {
          width: colWidths.address,
          align: 'center',
        });
        headerX += colWidths.address;

        doc.text('연락처', headerX, currentY + 10, {
          width: colWidths.phone,
          align: 'center',
        });
        headerX += colWidths.phone;

        doc.text('출자좌수', headerX, currentY + 10, {
          width: colWidths.units,
          align: 'center',
        });

        currentY += rowHeight;
      };

      // 테이블 테두리 그리기 함수
      const drawTableBorders = (startY: number, endY: number) => {
        doc.strokeColor('#cccccc').lineWidth(0.5);

        // 외곽선
        doc.rect(tableLeft, startY, tableWidth, endY - startY).stroke();

        // 수직선
        let lineX = tableLeft + colWidths.no;
        doc.moveTo(lineX, startY).lineTo(lineX, endY).stroke();
        lineX += colWidths.name;
        doc.moveTo(lineX, startY).lineTo(lineX, endY).stroke();
        lineX += colWidths.identifier;
        doc.moveTo(lineX, startY).lineTo(lineX, endY).stroke();
        lineX += colWidths.address;
        doc.moveTo(lineX, startY).lineTo(lineX, endY).stroke();
        lineX += colWidths.phone;
        doc.moveTo(lineX, startY).lineTo(lineX, endY).stroke();

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
      doc.font('맑은고딕').fontSize(8);

      sortedMembers.forEach((member, index) => {
        // 페이지 넘김 체크
        if (currentY > 700) {
          // 현재 페이지의 테이블 테두리 그리기
          drawTableBorders(pageTableTop, currentY);

          // 새 페이지 추가
          doc.addPage();
          currentY = 50;
          pageTableTop = currentY;

          // 새 페이지 헤더 그리기
          drawHeader();
          doc.font('맑은고딕').fontSize(8);
        }

        // 행 배경 (zebra striping)
        if (index % 2 === 0) {
          doc.rect(tableLeft, currentY, tableWidth, rowHeight).fill('#fafafa');
          doc.fillColor('#000000');
        }

        let currentX = tableLeft;
        const textY = currentY + 10;

        // 번호
        doc.text(`${index + 1}`, currentX, textY, {
          width: colWidths.no,
          align: 'center',
        });
        currentX += colWidths.no;

        // 조합원명 (가운데 정렬)
        doc.text(member.name, currentX, textY, {
          width: colWidths.name,
          align: 'center',
        });
        currentX += colWidths.name;

        // 생년월일/사업자번호 (가운데 정렬)
        doc.text(formatIdentifier(member), currentX, textY, {
          width: colWidths.identifier,
          align: 'center',
        });
        currentX += colWidths.identifier;

        // 주소 (다중 라인 대응 - 수직 가운데 정렬)
        const addressHeight = doc.heightOfString(member.address, {
          width: colWidths.address - 10,
          lineGap: -1,
        });
        const addressY = currentY + (rowHeight - addressHeight) / 2;
        doc.text(member.address, currentX + 5, addressY, {
          width: colWidths.address - 10,
          align: 'left',
          lineGap: -1,
        });
        currentX += colWidths.address;

        // 연락처 (가운데 정렬)
        doc.text(member.phone, currentX, textY, {
          width: colWidths.phone,
          align: 'center',
        });
        currentX += colWidths.phone;

        // 출자좌수
        doc.text(member.units.toLocaleString(), currentX, textY, {
          width: colWidths.units,
          align: 'center',
        });

        currentY += rowHeight;
      });

      // 마지막 페이지의 테이블 테두리 그리기
      drawTableBorders(pageTableTop, currentY);

      // 하단 정보
      doc.moveDown(3);
      doc.font('맑은고딕').fontSize(12);
      doc.fillColor('#000000');

      const bottomY = doc.y;

      // 날짜 (가운데 정렬)
      doc.text(formatDate(data.assembly_date), 0, bottomY, {
        width: doc.page.width,
        align: 'center',
      });
      doc.moveDown(2);

      // 조합명 (크게, 가운데 정렬)
      doc.fontSize(16).font('맑은고딕-Bold');
      doc.text(data.fund_name, 0, doc.y, {
        width: doc.page.width,
        align: 'center',
      });
      doc.moveDown(1);

      // 업무집행조합원 (한 줄, 가운데 정렬)
      doc.fontSize(12).font('맑은고딕');
      const gpNames = data.gps
        .map(gp => {
          return gp.entity_type === 'corporate' && gp.representative
            ? `${gp.name} 대표 ${gp.representative}`
            : gp.name;
        })
        .join(', ');

      // 업무집행조합원 텍스트를 가운데 정렬하기 위해 전체 텍스트 너비 계산
      const gpMainText = `업무집행조합원 ${gpNames} `;
      const gpSealText = '(조합인감)';
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
