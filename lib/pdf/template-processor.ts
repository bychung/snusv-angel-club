// 템플릿 변수 치환 유틸리티

import type {
  LPAContext,
  LPATemplate,
  ProcessedLPAContent,
  TemplateSection,
} from './types';

/**
 * 숫자를 한글로 변환
 * 예: 123456 -> "일십이만삼천사백오십육"
 */
export function convertNumberToKorean(num: number): string {
  if (num === 0) return '영';

  const units = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  const groups: number[] = [];
  let tempNum = num;

  while (tempNum > 0) {
    groups.unshift(tempNum % 10000);
    tempNum = Math.floor(tempNum / 10000);
  }

  const groupNames = ['', '만', '억', '조'];
  let result = '';

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const groupIndex = groups.length - 1 - i;

    if (group === 0) continue;

    const groupText = convertFourDigitsToKorean(group);
    result += groupText;

    if (groupIndex > 0) {
      result += groupNames[groupIndex];
    }
  }

  return result;
}

function convertFourDigitsToKorean(num: number): string {
  if (num === 0) return '';

  const units = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  let result = '';

  const thousands = Math.floor(num / 1000);
  const hundreds = Math.floor((num % 1000) / 100);
  const tens = Math.floor((num % 100) / 10);
  const ones = num % 10;

  if (thousands > 0) {
    result += units[thousands] + '천';
  }

  if (hundreds > 0) {
    result += units[hundreds] + '백';
  }

  if (tens > 0) {
    if (tens === 1) {
      result += '십';
    } else {
      result += units[tens] + '십';
    }
  }

  if (ones > 0) {
    result += units[ones];
  }

  return result;
}

/**
 * 미리보기 모드에서 동적 데이터를 마킹
 * PREVIEW 스타일은 lpa-generator.ts의 STYLE_MARKERS에서 일괄 변경 가능
 */
function markPreview(text: string, isPreview: boolean): string {
  if (!isPreview) return text;
  return `<<PREVIEW>>${text}<<PREVIEW_END>>`;
}

/**
 * 템플릿 변수를 실제 값으로 치환
 */
export function processTemplateVariables(
  text: string | undefined,
  context: LPAContext
): string {
  // text가 없으면 빈 문자열 반환
  if (!text) return '';

  const isPreview = context.isPreview || false;
  let processedText = text;

  // 펀드 관련 변수
  processedText = processedText.replace(
    /\$\{fundName\}/g,
    markPreview(context.fund.name || '', isPreview)
  );
  processedText = processedText.replace(
    /\$\{fundNameShort\}/g,
    markPreview(context.fund.nameShort || context.fund.name || '', isPreview)
  );
  processedText = processedText.replace(
    /\$\{fundAddress\}/g,
    markPreview(context.fund.address || '', isPreview)
  );
  // 출자 1좌 금액 관련 변수
  processedText = processedText.replace(
    /\$\{parValueKor\}/g,
    markPreview(
      context.fund.par_value
        ? convertNumberToKorean(context.fund.par_value)
        : '',
      isPreview
    )
  );
  processedText = processedText.replace(
    /\$\{parValueComma\}/g,
    markPreview(
      context.fund.par_value
        ? context.fund.par_value.toLocaleString('ko-KR')
        : '',
      isPreview
    )
  );
  // 하위 호환: ${parValue}가 있으면 한글 표기로 대체
  processedText = processedText.replace(
    /\$\{parValue\}/g,
    markPreview(
      context.fund.par_value
        ? convertNumberToKorean(context.fund.par_value)
        : '',
      isPreview
    )
  );
  processedText = processedText.replace(
    /\$\{totalCapKor\}/g,
    markPreview(
      context.fund.total_cap
        ? convertNumberToKorean(context.fund.total_cap)
        : '',
      isPreview
    )
  );
  processedText = processedText.replace(
    /\$\{totalCapComma\}/g,
    markPreview(
      context.fund.total_cap
        ? context.fund.total_cap.toLocaleString('ko-KR')
        : '',
      isPreview
    )
  );
  processedText = processedText.replace(
    /\$\{duration\}/g,
    markPreview(
      context.fund.duration ? context.fund.duration.toString() : '5',
      isPreview
    )
  );

  // 결성일 (closed_at) - 'YYYY년 M월 D일' 형식 (앞의 0 없음)
  if (context.fund.closed_at) {
    const closedDate = new Date(context.fund.closed_at);
    const year = closedDate.getFullYear();
    const month = closedDate.getMonth() + 1;
    const day = closedDate.getDate();
    processedText = processedText.replace(
      /\$\{startDate\}/g,
      markPreview(`${year}년 ${month}월 ${day}일`, isPreview)
    );
  } else {
    processedText = processedText.replace(/\$\{startDate\}/g, '');
  }

  // 사용자 관련 변수 (실제 GP 멤버 정보 사용)
  const gpMembers = context.members.filter(m => m.member_type === 'GP');
  const lpMembers = context.members.filter(m => m.member_type === 'LP');
  const firstGP = gpMembers[0];

  processedText = processedText.replace(
    /\$\{userName\}/g,
    markPreview(gpMembers.map(gp => gp.name).join(', ') || '', isPreview)
  );
  processedText = processedText.replace(
    /\$\{userEmail\}/g,
    markPreview(firstGP?.email || '', isPreview)
  );
  processedText = processedText.replace(
    /\$\{userAddress\}/g,
    markPreview(context.fund.address || '', isPreview)
  );
  processedText = processedText.replace(
    /\$\{userPhone\}/g,
    markPreview(firstGP?.phone || '', isPreview)
  );

  // 조합원 관련 변수

  processedText = processedText.replace(
    /\$\{coGP\}/g,
    markPreview(gpMembers.length > 1 ? '공동' : '', isPreview)
  );
  processedText = processedText.replace(
    /\$\{gpList\}/g,
    markPreview(gpMembers.map(m => m.name).join(', '), isPreview)
  );
  processedText = processedText.replace(
    /\$\{lpList\}/g,
    markPreview(lpMembers.map(m => m.name).join(', '), isPreview)
  );

  // currentMember 컨텍스트 변수 (별지 렌더링용)
  if (context.currentMember) {
    const member = context.currentMember;

    processedText = processedText.replace(
      /\$\{name\}/g,
      markPreview(member.name || '', isPreview)
    );
    processedText = processedText.replace(
      /\$\{address\}/g,
      markPreview(member.address || '', isPreview)
    );
    processedText = processedText.replace(
      /\$\{shares\}/g,
      markPreview(
        member.total_units ? member.total_units.toString() : '0',
        isPreview
      )
    );
    processedText = processedText.replace(
      /\$\{contact\}/g,
      markPreview(member.phone || '', isPreview)
    );

    // 생년월일 또는 사업자번호 (개인은 생년월일, 법인은 사업자번호)
    const birthDateOrBusinessNumber =
      member.entity_type === 'corporate'
        ? member.business_number || ''
        : member.birth_date || '';
    processedText = processedText.replace(
      /\$\{birthDateOrBusinessNumber\}/g,
      markPreview(birthDateOrBusinessNumber, isPreview)
    );
    processedText = processedText.replace(
      /\$\{birthDate\}/g,
      markPreview(member.birth_date || '', isPreview)
    );
    processedText = processedText.replace(
      /\$\{businessNumber\}/g,
      markPreview(member.business_number || '', isPreview)
    );
  }

  // 날짜 관련 변수
  const today = new Date();
  processedText = processedText.replace(
    /\$\{today\}/g,
    markPreview(today.toLocaleDateString('ko-KR'), isPreview)
  );
  processedText = processedText.replace(
    /\$\{year\}/g,
    markPreview(today.getFullYear().toString(), isPreview)
  );
  processedText = processedText.replace(
    /\$\{month\}/g,
    markPreview((today.getMonth() + 1).toString(), isPreview)
  );
  processedText = processedText.replace(
    /\$\{day\}/g,
    markPreview(today.getDate().toString(), isPreview)
  );

  return processedText;
}

/**
 * 섹션 재귀적으로 처리
 */
function processSection(
  section: TemplateSection,
  context: LPAContext
): TemplateSection {
  return {
    ...section,
    text: processTemplateVariables(section.text, context),
    sub: section.sub.map(subSection => processSection(subSection, context)),
  };
}

/**
 * LPA 템플릿 전체 처리
 */
export function processLPATemplate(
  template: LPATemplate,
  context: LPAContext
): ProcessedLPAContent {
  const processedSections = template.content.sections.map(section =>
    processSection(section, context)
  );

  return {
    type: template.content.type,
    sections: processedSections,
    processedAt: new Date(),
  };
}
