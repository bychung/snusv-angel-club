// 외부 템플릿 로더 (DB 우선, 파일 fallback)

import { createBrandServerClient } from '@/lib/supabase/server';
import fs from 'fs/promises';
import path from 'path';
import type { AppendixTemplateReference } from './types';

/**
 * 외부 템플릿 로드 (DB 우선, 파일 fallback)
 *
 * @param templateRef - 템플릿 참조 이름 (예: 'lpa-consent-form-template')
 * @param fundId - 펀드 ID (optional, 펀드별 템플릿이 있는 경우)
 * @returns 템플릿 content 부분
 */
export async function loadExternalTemplate(
  templateRef: string,
  fundId?: string
): Promise<any> {
  // 1. DB에서 템플릿 조회 시도
  try {
    const brandServerClient = await createBrandServerClient();

    // templateRef를 DB의 type으로 변환
    // 예: 'lpa-consent-form-template' -> 'lpa_consent_form'
    const templateType = templateRefToDbType(templateRef);

    // 펀드별 템플릿 우선 조회
    if (fundId) {
      const { data: fundTemplate } = await brandServerClient.documentTemplates
        .select('*')
        .eq('type', templateType)
        .eq('fund_id', fundId!)
        .eq('is_active', true)
        .maybeSingle();

      if (fundTemplate) {
        console.log(`외부 템플릿 로드 (펀드별): ${templateRef}`);
        return fundTemplate.content;
      }
    }

    // 글로벌 템플릿 조회
    const { data: globalTemplate } = await brandServerClient.documentTemplates
      .select('*')
      .eq('type', templateType)
      .is('fund_id', null)
      .eq('is_active', true)
      .maybeSingle();

    if (globalTemplate) {
      console.log(`외부 템플릿 로드 (글로벌 DB): ${templateRef}`);
      return globalTemplate.content;
    }
  } catch (error) {
    console.warn(`DB 템플릿 조회 실패, 파일로 fallback: ${templateRef}`, error);
  }

  // 2. DB에 없으면 파일에서 로드 (fallback)
  const templatePath = path.join(
    process.cwd(),
    'template',
    `${templateRef}.json`
  );

  try {
    const content = await fs.readFile(templatePath, 'utf-8');
    const parsed = JSON.parse(content);
    console.log(`외부 템플릿 로드 (파일): ${templateRef}`);
    return parsed.content || parsed; // content 필드가 있으면 그것을, 없으면 전체
  } catch (fileError) {
    throw new Error(
      `외부 템플릿을 찾을 수 없습니다: ${templateRef}. ` +
        `파일 경로: ${templatePath}`
    );
  }
}

/**
 * 템플릿 참조 이름을 DB 타입으로 변환
 *
 * @param templateRef - 템플릿 파일명 (예: 'lpa-consent-form-template')
 * @returns DB type (예: 'lpa_consent_form')
 */
function templateRefToDbType(templateRef: string): string {
  // 매핑 테이블
  const mapping: Record<string, string> = {
    'lpa-consent-form-template': 'lpa_consent_form',
    'lpa-template': 'lpa',
    'plan-template': 'plan',
    'member-list-template': 'member_list',
    // 필요시 추가
  };

  return mapping[templateRef] || templateRef;
}

/**
 * 템플릿이 외부 참조인지 확인
 */
export function isTemplateReference(
  template: any
): template is AppendixTemplateReference {
  return 'ref' in template && typeof template.ref === 'string';
}
