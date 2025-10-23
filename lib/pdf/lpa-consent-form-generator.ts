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
import { getFontPath } from './template-font';

// 기존 LPA generator에서 필요한 함수들 import
import { registerKoreanFonts } from './template-font';
import {
  renderAppendixContentElement,
  renderAppendixHeader,
  renderAppendixTitle,
} from './template-render';
import type { AppendixDefinition, LPAContext } from './types';

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
      closed_at: context.fund.closedAt || null,
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

  // appendix 정의 생성 (template 구조만 전달)
  const appendixDef = {
    template: {
      header: template.header,
      title: template.title,
      content: template.sections,
    },
  } as any; // 타입 호환성을 위해 any 사용

  // 별지 렌더링 (기존 함수 재사용, generateAllConsents: true로 모든 조합원 생성)
  await renderRepeatingPageAppendix(
    doc,
    appendixDef,
    lpMembersOnly,
    lpaContext,
    currentPageNumber
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

/**
 * 페이지 반복 렌더링 (별지2 스타일)
 */
export async function renderRepeatingPageAppendix(
  doc: any,
  appendixDef: AppendixDefinition,
  members: any[],
  context: LPAContext,
  currentPageNumber: { value: number }
): Promise<void> {
  for (const member of members) {
    // 새 페이지 시작
    doc.addPage();
    currentPageNumber.value++;

    // currentMember 설정 (member가 null이면 빈 조합원)
    const memberContext: LPAContext = {
      ...context,
      currentMember: member || {
        // 빈 양식용 더미 데이터
        name: '',
        address: '',
        shares: '',
        contact: '',
        birthDateOrBusinessNumber: '',
      },
    };

    // 헤더
    if (appendixDef.template.header) {
      renderAppendixHeader(doc, appendixDef.template.header.text);
    }

    // 타이틀
    if (appendixDef.template.title) {
      renderAppendixTitle(doc, appendixDef.template.title);
    }

    // 컨텐츠 요소들 렌더링
    for (const element of appendixDef.template.content || []) {
      await renderAppendixContentElement(doc, element, memberContext);
    }
  }
}
