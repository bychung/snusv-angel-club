/**
 * 결성총회 의안 동의서 PDF 생성기
 *
 * 기존 LPA PDF 생성 로직(renderRepeatingPageAppendix)을 재사용하여
 * 독립적인 의안 동의서 PDF를 생성합니다.
 *
 * 각 LP 조합원에 대해 1페이지씩 생성하며, 페이지 정보를 반환합니다.
 */

import type { MemberPage } from '@/types/assemblies';
import PDFDocument from 'pdfkit';
import { getFontPath } from './template-font';

// 기존 LPA generator에서 필요한 함수들 import
import { registerKoreanFonts } from './template-font';
import {
  renderAppendixContentElement,
  renderAppendixHeader,
  renderAppendixTitle,
} from './template-render';
import type { AppendixTemplate, LPAContext } from './types';

/**
 * 결성총회 의안 동의서 컨텍스트
 */
export interface FormationConsentFormContext {
  fund: {
    name: string;
    nameEn?: string;
    closedAt?: string; // 결성 예정일
  };
  gpList: string; // GP 조합원 리스트 (쉼표로 구분)
  lpMembers: Array<{
    id: string; // profile ID 추가
    name: string;
    address: string;
    birthDateOrBusinessNumber: string;
    contact: string;
    shares: number;
  }>;
  generatedAt: string;
  startDate: string; // 총회 개최일
}

/**
 * 결성총회 의안 동의서 템플릿
 */
export interface FormationConsentFormTemplate {
  header: {
    text: string;
  };
  title: string;
  content: Array<{
    type:
      | 'paragraph'
      | 'spacer'
      | 'date-field'
      | 'form-fields'
      | 'table'
      | 'signature-field';
    text?: string;
    align?: 'left' | 'center' | 'right';
    lines?: number;
    format?: string;
    fields?: Array<{
      label: string;
      variable: string;
      seal?: boolean;
    }>;
    columns?: Array<{
      key: string;
      label: string;
      width?: number;
    }>;
    rows?: any[];
  }>;
}

/**
 * FormationConsentFormContext를 LPAContext 형식으로 변환
 */
function buildLPAContextFromConsentFormContext(
  context: FormationConsentFormContext
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
  const lpMembers = context.lpMembers.map(member => ({
    id: member.id,
    name: member.name,
    member_type: 'LP' as const,
    total_units: member.shares,
    total_amount: 0, // 의안 동의서에서는 사용하지 않음
    initial_amount: 0, // 의안 동의서에서는 사용하지 않음
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
    // 추가 변수들 (템플릿에서 사용)
    startDate: context.startDate,
    gpList: context.gpList,
  } as any;
}

/**
 * 결성총회 의안 동의서 PDF 생성
 *
 * @param template - 의안 동의서 템플릿 (기존 appendix 구조와 동일)
 * @param context - 조합원 정보 컨텍스트
 * @returns PDF Buffer와 조합원별 페이지 정보
 */
export async function generateFormationConsentFormPDF(
  template: FormationConsentFormTemplate,
  context: FormationConsentFormContext
): Promise<{
  pdfBuffer: Buffer;
  memberPages: MemberPage[];
}> {
  const defaultFontPath = getFontPath();

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 30, left: 50, right: 50 },
    font: defaultFontPath,
    autoFirstPage: false, // 첫 페이지 자동 생성 비활성화
    info: {
      Title: `${context.fund.name} 결성총회 의안 동의서`,
      Subject: `${context.fund.name} 결성총회 의안 동의서`,
      Creator: 'SNUSV Angel Club Document System',
    },
  });

  // 한글 폰트 등록
  registerKoreanFonts(doc);

  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  // LPAContext 형식으로 변환
  const lpaContext = buildLPAContextFromConsentFormContext(context);

  // LP 멤버만 추출 (실제로 페이지를 생성할 대상)
  const lpMembersOnly = lpaContext.members.filter(
    (m: any) => m.member_type === 'LP'
  );

  // appendix 정의 생성
  const appendixDef = {
    template: {
      header: template.header,
      title: template.title,
      content: template.content,
    },
  };

  // 페이지 정보 수집
  const memberPages: MemberPage[] = [];

  // 각 조합원별로 페이지 생성
  for (let i = 0; i < lpMembersOnly.length; i++) {
    const member = lpMembersOnly[i];

    // 새 페이지 시작
    doc.addPage();

    // 페이지 정보 저장
    memberPages.push({
      member_id: member.id,
      member_name: member.name,
      page_number: i + 1, // 1-based
    });

    // currentMember 설정
    const memberContext: LPAContext = {
      ...lpaContext,
      currentMember: member,
    };

    // 헤더 (비어있지 않을 경우만 렌더링)
    const headerText = (appendixDef.template as AppendixTemplate).header?.text;
    if (headerText && headerText.trim()) {
      renderAppendixHeader(doc, headerText);
    }

    // 타이틀
    if ((appendixDef.template as AppendixTemplate).title) {
      renderAppendixTitle(
        doc,
        (appendixDef.template as AppendixTemplate).title!
      );
    }

    // 컨텐츠 요소들 렌더링
    const contentElements =
      (appendixDef.template as AppendixTemplate).content || [];
    for (const element of contentElements) {
      await renderAppendixContentElement(doc, element, memberContext);
    }
  }

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      console.log(
        `결성총회 의안 동의서 PDF 생성 완료: ${pdfBuffer.length} bytes, ${memberPages.length} 페이지`
      );
      resolve({ pdfBuffer, memberPages });
    });
    doc.on('error', reject);
  });
}
