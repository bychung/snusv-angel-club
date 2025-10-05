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
 * 템플릿 변수를 실제 값으로 치환
 */
export function processTemplateVariables(
  text: string | undefined,
  context: LPAContext
): string {
  // text가 없으면 빈 문자열 반환
  if (!text) return '';

  let processedText = text;

  // 펀드 관련 변수
  processedText = processedText.replace(
    /\$\{fundName\}/g,
    context.fund.name || ''
  );
  processedText = processedText.replace(
    /\$\{fundAddress\}/g,
    context.fund.address || ''
  );
  processedText = processedText.replace(
    /\$\{totalCapKor\}/g,
    context.fund.total_cap ? convertNumberToKorean(context.fund.total_cap) : ''
  );
  processedText = processedText.replace(
    /\$\{totalCapComma\}/g,
    context.fund.total_cap ? context.fund.total_cap.toLocaleString('ko-KR') : ''
  );
  processedText = processedText.replace(
    /\$\{duration\}/g,
    context.fund.duration ? context.fund.duration.toString() : '5'
  );

  // 결성일 (closed_at) - 'YYYY년 MM월 DD일' 형식
  if (context.fund.closed_at) {
    const closedDate = new Date(context.fund.closed_at);
    const year = closedDate.getFullYear();
    const month = String(closedDate.getMonth() + 1).padStart(2, '0');
    const day = String(closedDate.getDate()).padStart(2, '0');
    processedText = processedText.replace(
      /\$\{startDate\}/g,
      `${year}년 ${month}월 ${day}일`
    );
  } else {
    processedText = processedText.replace(/\$\{startDate\}/g, '');
  }

  // 사용자 관련 변수
  processedText = processedText.replace(
    /\$\{userName\}/g,
    context.user.name || ''
  );
  processedText = processedText.replace(
    /\$\{userEmail\}/g,
    context.user.email || ''
  );
  processedText = processedText.replace(
    /\$\{userAddress\}/g,
    context.fund.address || ''
  );
  processedText = processedText.replace(
    /\$\{userPhone\}/g,
    context.user.phone || ''
  );

  // 조합원 관련 변수
  const gpMembers = context.members.filter(m => m.member_type === 'GP');
  const lpMembers = context.members.filter(m => m.member_type === 'LP');

  processedText = processedText.replace(
    /\$\{coGP\}/g,
    gpMembers.length > 1 ? '공동' : ''
  );
  processedText = processedText.replace(
    /\$\{gpList\}/g,
    gpMembers.map(m => m.name).join(', ')
  );
  processedText = processedText.replace(
    /\$\{lpList\}/g,
    lpMembers.map(m => m.name).join(', ')
  );

  // 날짜 관련 변수
  const today = new Date();
  processedText = processedText.replace(
    /\$\{today\}/g,
    today.toLocaleDateString('ko-KR')
  );
  processedText = processedText.replace(
    /\$\{year\}/g,
    today.getFullYear().toString()
  );
  processedText = processedText.replace(
    /\$\{month\}/g,
    (today.getMonth() + 1).toString()
  );
  processedText = processedText.replace(
    /\$\{day\}/g,
    today.getDate().toString()
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
