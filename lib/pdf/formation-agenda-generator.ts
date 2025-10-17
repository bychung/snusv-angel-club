// 결성총회 의안 PDF 생성기

import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import type { FormationAgendaContent } from '../../types/assemblies';
import { getFontPath } from './utils';

interface FormationAgendaData {
  fund_name: string;
  assembly_date: string; // YYYY-MM-DD
  content: FormationAgendaContent;
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

      // 제목
      doc
        .font('맑은고딕-Bold')
        .fontSize(18)
        .text(`${data.fund_name} 결성총회`, { align: 'center' });
      doc.moveDown(3);

      // 일시
      doc.font('맑은고딕').fontSize(14);
      doc.text(`* 일시: ${formatDate(data.assembly_date)}`, { align: 'left' });
      doc.moveDown(0.5);

      // 의장
      doc.text(`* 의장: ${data.content.chairman}`, { align: 'left' });
      doc.moveDown(2);

      // 부의안건
      doc.font('맑은고딕-Bold').fontSize(12);
      doc.text('* 부의안건', { align: 'left' });
      doc.moveDown(1.5);

      // 의안 목록
      doc.font('맑은고딕').fontSize(11);

      data.content.agendas.forEach((agenda, index) => {
        // 페이지 넘김 체크
        if (doc.y > 700) {
          doc.addPage();
        }

        // 의안 제목
        doc
          .font('맑은고딕-Bold')
          .fontSize(11)
          .text(`(제${agenda.index}호 의안) ${agenda.title}`, {
            align: 'left',
            underline: false,
          });
        doc.moveDown(0.5);

        // 의안 내용
        doc.font('맑은고딕').fontSize(10);

        // 내용을 줄바꿈 처리
        const lines = agenda.content.split('\n');
        lines.forEach((line, lineIndex) => {
          if (line.trim()) {
            doc.text(line, { align: 'left', indent: 0 });
            if (lineIndex < lines.length - 1) {
              doc.moveDown(0.3);
            }
          } else {
            doc.moveDown(0.3);
          }
        });

        // 의안 사이 간격
        if (index < data.content.agendas.length - 1) {
          doc.moveDown(2.5);
        }
      });

      // 하단 정보
      doc.moveDown(4);
      doc.font('맑은고딕').fontSize(12);
      doc.moveDown(0.5);
      doc.text('위 의안에 대하여 조합원 여러분들의 승인을 부탁드립니다.');

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 기본 결성총회 의안 내용 생성
 */
export function getDefaultFormationAgendaContent(
  fundName: string
): FormationAgendaContent {
  return {
    chairman: '', // 사용자가 입력해야 함
    agendas: [
      {
        index: 1,
        title: '규약(안) 승인의 건',
        content: '첨부한 규약 참조 부탁드립니다.',
      },
      {
        index: 2,
        title: '사업계획 승인의 건',
        content:
          '당 조합은 유망한 중소벤처기업에 투자하여 투자수익을 실현하고, 벤처생태계 활성화에 기여하고자 합니다.\n\n주요 투자 분야: IT, 바이오, 제조, 서비스 등 성장 가능성이 높은 중소벤처기업\n투자 방식: 직접 투자 및 간접 투자 병행',
      },
    ],
  };
}
