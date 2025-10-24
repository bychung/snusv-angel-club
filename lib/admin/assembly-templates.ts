/**
 * 조합원 총회 문서 템플릿 관리 함수
 * document-templates.ts의 범용 함수를 조합원 총회에 특화하여 사용
 */

import { createBrandServerClient } from '@/lib/supabase/server';
import type { DocumentTemplate } from '@/types/database';
import { getActiveTemplate, getTemplatesByType } from './document-templates';

/**
 * 조합원 총회 문서 템플릿 타입 목록
 */
export const ASSEMBLY_TEMPLATE_TYPES = [
  'formation_agenda',
  'formation_official_letter',
  'formation_minutes',
  'fund_registration_application',
  'investment_certificate',
  'seal_registration',
  'member_consent',
  'personal_info_consent',
  'special_agenda',
  'special_minutes',
  'regular_agenda',
  'regular_minutes',
  'dissolution_agenda',
  'dissolution_minutes',
] as const;

export type AssemblyTemplateType = (typeof ASSEMBLY_TEMPLATE_TYPES)[number];

/**
 * 조합원 총회 템플릿 목록 조회 (글로벌만)
 */
export async function getAssemblyTemplates(): Promise<DocumentTemplate[]> {
  const supabase = await createBrandServerClient();

  const { data, error } = await supabase.documentTemplates
    .select('*, created_by_profile:created_by(id, name, email)')
    .in('type', ASSEMBLY_TEMPLATE_TYPES)
    .is('fund_id', null)
    .eq('is_active', true)
    .order('type', { ascending: true });

  if (error) {
    throw new Error(`조합원 총회 템플릿 목록 조회 실패: ${error.message}`);
  }

  return data || [];
}

/**
 * 조합원 총회 템플릿 버전 히스토리 조회
 */
export async function getAssemblyTemplateVersions(
  type: string
): Promise<DocumentTemplate[]> {
  // 글로벌 템플릿만 조회 (fund_id = null)
  return getTemplatesByType(type, null);
}

/**
 * 활성 조합원 총회 템플릿 조회
 */
export async function getActiveAssemblyTemplate(
  type: string
): Promise<DocumentTemplate> {
  // 조합원 총회 템플릿은 글로벌만 존재 (fund_id = null)
  return getActiveTemplate(type, null);
}

/**
 * 템플릿 내용 검증
 * @param type - 템플릿 타입
 * @param content - 템플릿 내용
 * @returns 검증 결과 (null이면 정상)
 */
export function validateAssemblyTemplateContent(
  type: string,
  content: any
): string | null {
  if (!content || typeof content !== 'object') {
    return '템플릿 내용이 올바르지 않습니다.';
  }

  switch (type) {
    case 'formation_agenda':
      return validateFormationAgendaContent(content);
    default:
      // 다른 타입은 향후 추가
      return null;
  }
}

/**
 * 결성총회 의안 템플릿 검증
 */
function validateFormationAgendaContent(content: any): string | null {
  if (!content.title_template) {
    return '제목 템플릿이 필요합니다.';
  }

  if (!content.labels || typeof content.labels !== 'object') {
    return '레이블 정의가 필요합니다.';
  }

  if (!content.agendas || !Array.isArray(content.agendas)) {
    return '의안 목록이 필요합니다.';
  }

  // 의안 검증
  for (let i = 0; i < content.agendas.length; i++) {
    const agenda = content.agendas[i];
    if (!agenda.title) {
      return `의안 ${i + 1}번의 제목이 필요합니다.`;
    }
  }

  return null;
}

/**
 * 템플릿 타입별 기본 에디터 설정 조회
 */
export function getAssemblyEditorConfig(type: string) {
  switch (type) {
    case 'formation_agenda':
      return {
        fields: {
          chairman: {
            label: '의장',
            type: 'text',
            placeholder: '예: 업무집행조합원 프로펠벤처스 대표이사 곽준영',
            required: true,
          },
          agendas: {
            label: '부의안건',
            type: 'array',
            min_items: 1,
            item_fields: {
              title: {
                label: '의안 제목',
                placeholder: '의안 제목',
                required: true,
              },
              content: {
                label: '의안 내용',
                placeholder: '의안 내용',
                required: false,
              },
            },
          },
          footer_message: {
            label: '하단 메시지',
            type: 'textarea',
            placeholder: '하단 메시지',
          },
        },
      };

    default:
      return null;
  }
}

/**
 * 템플릿 미리보기용 샘플 데이터 생성
 */
export function generateSampleData(type: string) {
  switch (type) {
    case 'formation_agenda':
      return {
        // fund_name: '테스트 투자조합',
        assembly_date: '2024-12-31', // YYYY-MM-DD 형식으로 수정
      };
    default:
      return {};
  }
}
