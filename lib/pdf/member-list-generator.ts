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
      const tableTop = doc.y;
      const tableLeft = 50;
      const tableWidth = 495; // A4 width - margins

      // 컬럼 너비 정의
      const colWidths = {
        no: 30,
        name: 80,
        identifier: 90, // 생년월일/사업자번호
        address: 150,
        phone: 80,
        units: 65,
      };

      const rowHeight = 30;
      let currentY = tableTop;

      // 헤더 그리기
      doc.font('맑은고딕-Bold').fontSize(9);

      let currentX = tableLeft;

      // 헤더 배경
      doc.rect(tableLeft, currentY, tableWidth, rowHeight).fill('#f0f0f0');

      // 헤더 텍스트
      doc.fillColor('#000000');
      doc.text('번호', currentX, currentY + 10, {
        width: colWidths.no,
        align: 'center',
      });
      currentX += colWidths.no;

      doc.text('조합원명', currentX, currentY + 10, {
        width: colWidths.name,
        align: 'center',
      });
      currentX += colWidths.name;

      doc.text('생년월일\n(사업자등록번호)', currentX, currentY + 5, {
        width: colWidths.identifier,
        align: 'center',
        lineGap: -2,
      });
      currentX += colWidths.identifier;

      doc.text('주소', currentX, currentY + 10, {
        width: colWidths.address,
        align: 'center',
      });
      currentX += colWidths.address;

      doc.text('연락처', currentX, currentY + 10, {
        width: colWidths.phone,
        align: 'center',
      });
      currentX += colWidths.phone;

      doc.text('출자좌수', currentX, currentY + 10, {
        width: colWidths.units,
        align: 'center',
      });

      currentY += rowHeight;

      // 데이터 행 그리기
      doc.font('맑은고딕').fontSize(8);

      sortedMembers.forEach((member, index) => {
        // 페이지 넘김 체크
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;

          // 헤더 다시 그리기
          doc.font('맑은고딕-Bold').fontSize(9);
          doc.rect(tableLeft, currentY, tableWidth, rowHeight).fill('#f0f0f0');
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
          doc.font('맑은고딕').fontSize(8);
        }

        // 행 배경 (zebra striping)
        if (index % 2 === 0) {
          doc.rect(tableLeft, currentY, tableWidth, rowHeight).fill('#fafafa');
          doc.fillColor('#000000');
        }

        currentX = tableLeft;
        const textY = currentY + 10;

        // 번호
        doc.text(`${index + 1}`, currentX, textY, {
          width: colWidths.no,
          align: 'center',
        });
        currentX += colWidths.no;

        // 조합원명
        doc.text(member.name, currentX + 5, textY, {
          width: colWidths.name - 10,
          align: 'left',
        });
        currentX += colWidths.name;

        // 생년월일/사업자번호
        doc.text(formatIdentifier(member), currentX + 5, textY, {
          width: colWidths.identifier - 10,
          align: 'left',
        });
        currentX += colWidths.identifier;

        // 주소
        doc.text(member.address, currentX + 5, textY, {
          width: colWidths.address - 10,
          align: 'left',
          lineGap: -1,
        });
        currentX += colWidths.address;

        // 연락처
        doc.text(member.phone, currentX + 5, textY, {
          width: colWidths.phone - 10,
          align: 'left',
        });
        currentX += colWidths.phone;

        // 출자좌수
        doc.text(member.units.toLocaleString(), currentX, textY, {
          width: colWidths.units,
          align: 'center',
        });

        currentY += rowHeight;
      });

      // 테이블 테두리 그리기
      doc.strokeColor('#cccccc').lineWidth(0.5);

      // 외곽선
      const tableHeight = currentY - tableTop;
      doc.rect(tableLeft, tableTop, tableWidth, tableHeight).stroke();

      // 수직선
      currentX = tableLeft + colWidths.no;
      doc.moveTo(currentX, tableTop).lineTo(currentX, currentY).stroke();
      currentX += colWidths.name;
      doc.moveTo(currentX, tableTop).lineTo(currentX, currentY).stroke();
      currentX += colWidths.identifier;
      doc.moveTo(currentX, tableTop).lineTo(currentX, currentY).stroke();
      currentX += colWidths.address;
      doc.moveTo(currentX, tableTop).lineTo(currentX, currentY).stroke();
      currentX += colWidths.phone;
      doc.moveTo(currentX, tableTop).lineTo(currentX, currentY).stroke();

      // 수평선
      for (let y = tableTop; y <= currentY; y += rowHeight) {
        doc
          .moveTo(tableLeft, y)
          .lineTo(tableLeft + tableWidth, y)
          .stroke();
      }

      // 하단 정보
      doc.moveDown(3);
      doc.font('맑은고딕').fontSize(10);
      doc.fillColor('#000000');

      const bottomY = doc.y;

      doc.text(formatDate(data.assembly_date), tableLeft, bottomY, {
        align: 'right',
      });
      doc.moveDown(1);
      doc.text(data.fund_name, tableLeft, doc.y, { align: 'right' });
      doc.moveDown(1);

      // 업무집행조합원 명단
      doc.text('업무집행조합원:', tableLeft, doc.y, { align: 'right' });
      data.gps.forEach(gp => {
        doc.moveDown(0.5);
        const gpText =
          gp.entity_type === 'corporate' && gp.representative
            ? `${gp.name} 대표 ${gp.representative}`
            : gp.name;
        doc.text(gpText, tableLeft, doc.y, { align: 'right' });
      });

      doc.moveDown(2);
      doc.text('(서명)', tableLeft, doc.y, { align: 'right' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
