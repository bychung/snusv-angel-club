// 결성총회 의안 PDF 생성기

import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import type { FormationAgendaContent } from '../../types/assemblies';
import { FORMATION_AGENDA_CONFIG } from './formation-agenda-config';
import { getFontPath } from './utils';

interface FormationAgendaData {
  fund_name: string;
  assembly_date: string; // YYYY-MM-DD
  content: FormationAgendaContent;
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
 * 템플릿 변수 치환
 */
function replaceTemplateVariables(
  template: string,
  variables: Record<string, any>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), String(value));
  }
  return result;
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

      // 템플릿에서 레이블 가져오기 (없으면 기본값)
      const templateContent = data.template?.content || {};
      const defaultTemplate = getDefaultFormationAgendaTemplate();

      const labels = templateContent.labels || defaultTemplate.labels;
      const titleTemplate =
        templateContent.title_template || defaultTemplate.title_template;
      const footerMessage =
        templateContent.footer_message || defaultTemplate.footer_message;

      // 제목 생성 (템플릿 변수 치환)
      const title = replaceTemplateVariables(titleTemplate, {
        fund_name: data.fund_name,
      });

      // 제목
      const config = FORMATION_AGENDA_CONFIG;
      doc
        .font(config.fonts.title.family)
        .fontSize(config.fonts.title.size)
        .text(title, { align: config.alignment.title });
      doc.moveDown(config.spacing.title_bottom);

      // 일시
      doc
        .font(config.fonts.date_chairman.family)
        .fontSize(config.fonts.date_chairman.size);
      doc.text(`* ${labels.date} ${formatDate(data.assembly_date)}`, {
        align: config.alignment.section,
      });
      doc.moveDown(0.5);

      // 의장
      doc.text(`* ${labels.chairman} ${data.content.chairman}`, {
        align: config.alignment.section,
      });
      doc.moveDown(config.spacing.section_spacing);

      // 부의안건
      doc
        .font(config.fonts.section_header.family)
        .fontSize(config.fonts.section_header.size);
      doc.text(`* ${labels.agendas_section}`, {
        align: config.alignment.section,
      });
      doc.moveDown(1.5);

      // 의안 목록
      doc
        .font(config.fonts.agenda_title.family)
        .fontSize(config.fonts.agenda_title.size);

      data.content.agendas.forEach((agenda, index) => {
        // 페이지 넘김 체크
        if (doc.y > config.page.maxY) {
          doc.addPage();
        }

        // 의안 제목 (템플릿 변수 치환)
        const agendaTitle = replaceTemplateVariables(
          labels.agenda_title_template,
          {
            index: agenda.index,
            title: agenda.title,
          }
        );

        doc
          .font(config.fonts.agenda_title.family)
          .fontSize(config.fonts.agenda_title.size)
          .text(agendaTitle, {
            align: config.alignment.content,
            underline: false,
          });
        doc.moveDown(config.spacing.agenda_title_bottom);

        // 의안 내용
        doc
          .font(config.fonts.agenda_content.family)
          .fontSize(config.fonts.agenda_content.size);

        // 내용을 줄바꿈 처리
        const lines = agenda.content.split('\n');
        lines.forEach((line, lineIndex) => {
          if (line.trim()) {
            doc.text(line, { align: config.alignment.content, indent: 0 });
            if (lineIndex < lines.length - 1) {
              doc.moveDown(config.spacing.content_line_spacing);
            }
          } else {
            doc.moveDown(config.spacing.content_line_spacing);
          }
        });

        // 의안 사이 간격
        if (index < data.content.agendas.length - 1) {
          doc.moveDown(config.spacing.agenda_spacing);
        }
      });

      // 하단 정보
      doc.moveDown(config.spacing.footer_top);
      doc.font(config.fonts.footer.family).fontSize(config.fonts.footer.size);
      doc.moveDown(config.spacing.footer_spacing);
      doc.text(footerMessage);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 결성총회 의안 기본 템플릿 설정
 */
export function getDefaultFormationAgendaTemplate() {
  console.log('getDefaultFormationAgendaTemplate');
  return {
    title_template: '${fund_name} 결성총회',
    labels: {
      date: '일시:',
      chairman: '의장:',
      agendas_section: '부의안건',
      agenda_title_template: '(제${index}호 의안) ${title}',
    },
    chairman: '',
    agendas: [
      {
        title: '규약(안) 승인의 건',
        content: '첨부한 규약 참조 부탁드립니다.',
      },
      {
        title: '사업계획 승인의 건',
        content:
          '당 조합은 유망한 중소벤처기업에 투자하여 투자수익을 실현하고, 벤처생태계 활성화에 기여하고자 합니다.\n\n주요 투자 분야: IT, 바이오, 제조, 서비스 등 성장 가능성이 높은 중소벤처기업\n투자 방식: 직접 투자 및 간접 투자 병행',
      },
    ],
    footer_message: '위 의안에 대하여 조합원 여러분들의 승인을 부탁드립니다.',
  };
}
