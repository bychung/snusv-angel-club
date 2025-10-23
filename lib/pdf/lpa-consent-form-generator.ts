/**
 * LPA 규약 동의서 PDF 생성기
 *
 * 기존 LPA PDF 생성 로직(renderRepeatingPageAppendix)을 재사용하여
 * 독립적인 규약 동의서 PDF를 생성합니다.
 */

import type {
  LpaConsentFormContext,
  LpaConsentFormTemplate,
} from '@/types/assemblies';
import PDFDocument from 'pdfkit';
import { getFontPath } from './utils';

// 기존 LPA generator에서 필요한 함수들 import
import { renderRepeatingPageAppendix } from './lpa-generator';
import type { LPAContext } from './types';

/**
 * LpaConsentFormContext를 LPAContext 형식으로 변환
 */
function buildLPAContextFromConsentFormContext(
  context: LpaConsentFormContext
): LPAContext {
  // GP 조합원 정보를 LPAContext.members 형식으로 변환
  // gpList는 쉼표로 구분된 이름 문자열 (예: "홍길동, 김철수")
  const gpNames = context.gpList
    .split(',')
    .map(name => name.trim())
    .filter(name => name);

  const gpMembers = gpNames.map((name, index) => ({
    id: `gp-${index}`,
    name,
    member_type: 'GP' as const,
    total_units: 0,
    total_amount: 0,
    initial_amount: 0,
    email: null,
    address: null,
    birth_date: null,
    business_number: null,
    phone: null,
    entity_type: 'individual' as const,
  }));

  // LP 조합원 정보를 LPAContext.members 형식으로 변환
  const lpMembers = context.lpMembers.map((member, index) => ({
    id: `lp-${index}`, // 임시 ID
    name: member.name,
    member_type: 'LP' as const,
    total_units: member.shares,
    total_amount: 0, // 규약 동의서에서는 사용하지 않음
    initial_amount: 0, // 규약 동의서에서는 사용하지 않음
    email: member.contact, // contact를 email로 사용
    address: member.address,
    birth_date:
      member.birthDateOrBusinessNumber.length <= 6
        ? member.birthDateOrBusinessNumber
        : null,
    business_number:
      member.birthDateOrBusinessNumber.length > 6
        ? member.birthDateOrBusinessNumber
        : null,
    phone: member.contact,
    entity_type:
      member.birthDateOrBusinessNumber.length > 6
        ? ('corporate' as const)
        : ('individual' as const),
  }));

  // GP 멤버와 LP 멤버를 합침
  const members = [...gpMembers, ...lpMembers];

  return {
    fund: {
      id: 'temp-id', // 임시 ID
      name: context.fund.name,
      nameShort: context.fund.name,
      address: null,
      par_value: 0,
      total_cap: 0,
      initial_cap: 0,
      payment_schedule: 'lump_sum',
      duration: 0,
      closed_at: null,
    },
    user: {
      id: 'temp-user-id',
      name: context.gpList.split(',')[0]?.trim() || '',
      email: '',
      phone: '',
    },
    members,
    generatedAt: new Date(),
  } as LPAContext;
}

// 한글 폰트 등록 함수 (기존 코드에서 복사)
function registerKoreanFonts(doc: any) {
  const fontPath = getFontPath();

  doc.registerFont('NanumGothic', fontPath);
  doc.registerFont('NanumGothicBold', fontPath); // 같은 폰트 사용

  // 맑은고딕 폰트도 동일하게 등록 (호환성)
  doc.registerFont('맑은고딕', fontPath);
  doc.registerFont('맑은고딕-Bold', fontPath);
}

/**
 * LPA 규약 동의서 PDF 생성
 *
 * @param template - 규약 동의서 템플릿 (기존 appendix2 구조와 동일)
 * @param context - 조합원 정보 컨텍스트
 * @returns PDF Buffer
 */
export async function generateLpaConsentFormPDF(
  template: LpaConsentFormTemplate,
  context: LpaConsentFormContext
): Promise<Buffer> {
  const defaultFontPath = getFontPath();

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 30, left: 50, right: 50 },
    font: defaultFontPath,
    autoFirstPage: false, // 첫 페이지 자동 생성 비활성화 (renderRepeatingPageAppendix가 페이지 생성)
    info: {
      Title: `${context.fund.name} 규약 동의서`,
      Subject: `${context.fund.name} 규약 동의서`,
      Creator: 'SNUSV Angel Club Document System',
    },
  });

  // 한글 폰트 등록
  registerKoreanFonts(doc);

  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  // 페이지 번호 추적 (0부터 시작)
  const currentPageNumber = { value: 0 };

  // LPAContext 형식으로 변환 (members 변환도 포함)
  const lpaContext = buildLPAContextFromConsentFormContext(context);

  // renderRepeatingPageAppendix에는 LP 멤버만 전달 (실제로 페이지를 생성할 대상)
  // lpaContext.members에는 GP + LP가 모두 포함되어 있어 gpList 변수가 렌더링됨
  const lpMembersOnly = lpaContext.members.filter(m => m.member_type === 'LP');

  // appendix 정의 생성 (기존 구조와 동일)
  const appendixDef = {
    id: template.id,
    title: template.title,
    type: template.type,
    filter: template.filter,
    template: template.template,
  } as any; // 타입 호환성을 위해 any 사용

  // 별지 렌더링 (기존 함수 재사용, generateAllConsents: true로 모든 조합원 생성)
  await renderRepeatingPageAppendix(
    doc,
    appendixDef,
    lpMembersOnly,
    lpaContext,
    currentPageNumber,
    { generateAllConsents: true }
  );

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      console.log(`규약 동의서 PDF 생성 완료: ${pdfBuffer.length} bytes`);
      resolve(pdfBuffer);
    });
    doc.on('error', reject);
  });
}
