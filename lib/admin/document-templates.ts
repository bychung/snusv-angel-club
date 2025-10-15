// 문서 템플릿 버전 관리 관련 헬퍼 함수

import { createBrandServerClient } from '@/lib/supabase/server';
import type { DocumentTemplate } from '@/types/database';

/**
 * 활성 템플릿 조회 (펀드별 우선, 없으면 글로벌)
 * @param type - 템플릿 타입 ('lpa', 'plan' 등)
 * @param fundId - 펀드 ID (없으면 글로벌 템플릿만 조회)
 */
export async function getActiveTemplate(
  type: string,
  fundId?: string | null
): Promise<DocumentTemplate | null> {
  const supabase = await createBrandServerClient();

  // 1. 펀드별 템플릿 조회 (fundId가 있는 경우)
  if (fundId) {
    const { data: fundTemplate } = await supabase.documentTemplates
      .select('*')
      .eq('type', type)
      .eq('fund_id', fundId)
      .eq('is_active', true)
      .maybeSingle();

    if (fundTemplate) {
      return fundTemplate;
    }
  }

  // 2. 글로벌 템플릿 조회 (fallback 또는 fundId가 없는 경우)
  const { data: globalTemplate, error } = await supabase.documentTemplates
    .select('*')
    .eq('type', type)
    .is('fund_id', null)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw new Error(`템플릿 조회 실패: ${error.message}`);
  }

  return globalTemplate;
}

/**
 * 특정 타입의 모든 템플릿 버전 조회
 * @param type - 템플릿 타입
 * @param fundId - 펀드 ID (있으면 펀드별 템플릿만, 없으면 글로벌만)
 */
export async function getTemplatesByType(
  type: string,
  fundId?: string | null
): Promise<DocumentTemplate[]> {
  const supabase = await createBrandServerClient();

  let query = supabase.documentTemplates.select('*').eq('type', type);

  // fundId 필터링
  if (fundId !== undefined) {
    if (fundId === null) {
      query = query.is('fund_id', null);
    } else {
      query = query.eq('fund_id', fundId);
    }
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw new Error(`템플릿 목록 조회 실패: ${error.message}`);
  }

  return data || [];
}

/**
 * 템플릿 ID로 조회
 */
export async function getTemplateById(
  templateId: string
): Promise<DocumentTemplate | null> {
  const supabase = await createBrandServerClient();

  const { data, error } = await supabase.documentTemplates
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`템플릿 조회 실패: ${error.message}`);
  }

  return data;
}

/**
 * 템플릿 활성화 (같은 type + 같은 scope의 다른 템플릿은 자동 비활성화)
 */
export async function activateTemplate(
  templateId: string
): Promise<DocumentTemplate> {
  const supabase = await createBrandServerClient();

  // 1. 활성화할 템플릿 조회
  const template = await getTemplateById(templateId);
  if (!template) {
    throw new Error('템플릿을 찾을 수 없습니다');
  }

  // 2. 같은 타입 + 같은 scope의 다른 템플릿들 비활성화
  let deactivateQuery = supabase.documentTemplates
    .update({ is_active: false })
    .eq('type', template.type)
    .eq('is_active', true);

  // 글로벌 템플릿이면 글로벌만, 펀드별 템플릿이면 같은 펀드만 비활성화
  if (template.fund_id) {
    deactivateQuery = deactivateQuery.eq('fund_id', template.fund_id);
  } else {
    deactivateQuery = deactivateQuery.is('fund_id', null);
  }

  const { error: deactivateError } = await deactivateQuery;

  if (deactivateError) {
    throw new Error(`템플릿 비활성화 실패: ${deactivateError.message}`);
  }

  // 3. 선택한 템플릿 활성화
  const { data, error: activateError } = await supabase.documentTemplates
    .update({ is_active: true })
    .eq('id', templateId)
    .select()
    .single();

  if (activateError) {
    throw new Error(`템플릿 활성화 실패: ${activateError.message}`);
  }

  return data;
}

/**
 * 새 템플릿 생성
 */
export async function createTemplate(params: {
  type: string;
  version: string;
  content: any;
  appendix?: any;
  description?: string;
  isActive?: boolean;
  fundId?: string | null;
  createdBy?: string;
}): Promise<DocumentTemplate> {
  const supabase = await createBrandServerClient();

  const {
    type,
    version,
    content,
    appendix,
    description,
    isActive = false,
    fundId = null,
    createdBy,
  } = params;

  // 같은 type & version & fund_id가 이미 존재하는지 확인
  let checkQuery = supabase.documentTemplates
    .select('id')
    .eq('type', type)
    .eq('version', version);

  if (fundId) {
    checkQuery = checkQuery.eq('fund_id', fundId);
  } else {
    checkQuery = checkQuery.is('fund_id', null);
  }

  const { data: existing } = await checkQuery.maybeSingle();

  if (existing) {
    const scope = fundId ? '펀드별' : '글로벌';
    throw new Error(`${scope} 템플릿 버전 ${version}이(가) 이미 존재합니다`);
  }

  // 활성화할 경우 기존 활성 템플릿 비활성화
  if (isActive) {
    let deactivateQuery = supabase.documentTemplates
      .update({ is_active: false })
      .eq('type', type)
      .eq('is_active', true);

    if (fundId) {
      deactivateQuery = deactivateQuery.eq('fund_id', fundId);
    } else {
      deactivateQuery = deactivateQuery.is('fund_id', null);
    }

    await deactivateQuery;
  }

  // 새 템플릿 생성
  const { data, error } = await supabase.documentTemplates
    .insert({
      type,
      version,
      content,
      appendix,
      description,
      is_active: isActive,
      fund_id: fundId,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`템플릿 생성 실패: ${error.message}`);
  }

  return data;
}

/**
 * 템플릿 업데이트 (content, description만 수정 가능)
 */
export async function updateTemplate(
  templateId: string,
  updates: {
    content?: any;
    description?: string;
  }
): Promise<DocumentTemplate> {
  const supabase = await createBrandServerClient();

  const { data, error } = await supabase.documentTemplates
    .update(updates)
    .eq('id', templateId)
    .select()
    .single();

  if (error) {
    throw new Error(`템플릿 업데이트 실패: ${error.message}`);
  }

  return data;
}

/**
 * 펀드 템플릿 저장 (새 버전 생성)
 * 현재 활성 템플릿을 기반으로 수정된 내용을 새 버전으로 저장
 */
export async function saveFundTemplate(params: {
  fundId: string;
  type: string;
  modifiedContent: any;
  modifiedAppendix?: any;
  changeDescription: string;
  nextVersion: string;
  userId?: string;
}): Promise<DocumentTemplate> {
  const {
    fundId,
    type,
    modifiedContent,
    modifiedAppendix,
    changeDescription,
    nextVersion,
    userId,
  } = params;

  const supabase = await createBrandServerClient();

  // 1. 현재 활성 템플릿 조회 (검증용)
  const currentTemplate = await getActiveTemplate(type, fundId);
  if (!currentTemplate) {
    throw new Error('현재 활성 템플릿을 찾을 수 없습니다');
  }

  // 2. 같은 펀드의 다른 템플릿 비활성화
  await supabase.documentTemplates
    .update({ is_active: false })
    .eq('type', type)
    .eq('fund_id', fundId)
    .eq('is_active', true);

  // 3. 새 템플릿 버전 생성 (자동 활성화)
  const { data: newTemplate, error } = await supabase.documentTemplates
    .insert({
      type,
      version: nextVersion,
      content: modifiedContent,
      appendix: modifiedAppendix ?? currentTemplate.appendix,
      fund_id: fundId,
      is_active: true,
      description: changeDescription,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`템플릿 저장 실패: ${error.message}`);
  }

  return newTemplate;
}

/**
 * 글로벌 템플릿 저장 (새 버전 생성)
 * SYSTEM_ADMIN이 글로벌 템플릿을 수정할 때 사용
 */
export async function saveGlobalTemplate(params: {
  type: string;
  modifiedContent: any;
  modifiedAppendix?: any;
  changeDescription: string;
  nextVersion: string;
  userId?: string;
}): Promise<DocumentTemplate> {
  const {
    type,
    modifiedContent,
    modifiedAppendix,
    changeDescription,
    nextVersion,
    userId,
  } = params;

  const supabase = await createBrandServerClient();

  // 1. 현재 글로벌 활성 템플릿 조회 (검증용)
  const currentTemplate = await getActiveTemplate(type, null);
  if (!currentTemplate) {
    throw new Error('현재 활성 글로벌 템플릿을 찾을 수 없습니다');
  }

  // 2. 같은 타입의 글로벌 템플릿 비활성화
  await supabase.documentTemplates
    .update({ is_active: false })
    .eq('type', type)
    .is('fund_id', null)
    .eq('is_active', true);

  // 3. 새 글로벌 템플릿 버전 생성 (자동 활성화)
  const { data: newTemplate, error } = await supabase.documentTemplates
    .insert({
      type,
      version: nextVersion,
      content: modifiedContent,
      appendix: modifiedAppendix ?? currentTemplate.appendix,
      fund_id: null, // 글로벌 템플릿
      is_active: true,
      description: changeDescription,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`글로벌 템플릿 저장 실패: ${error.message}`);
  }

  return newTemplate;
}

/**
 * 펀드 템플릿 초기화 (글로벌 템플릿 복사)
 * 펀드 생성시 호출되어 글로벌 템플릿을 펀드별 템플릿으로 복사
 */
export async function initializeFundTemplates(
  fundId: string
): Promise<DocumentTemplate[]> {
  const templateTypes = ['lpa', 'plan']; // 필요한 템플릿 타입들
  const createdTemplates: DocumentTemplate[] = [];

  for (const type of templateTypes) {
    try {
      // 글로벌 활성 템플릿 조회
      const globalTemplate = await getActiveTemplate(type, null);

      if (globalTemplate) {
        // 펀드별 템플릿 생성 (내용 복사)
        const fundTemplate = await createTemplate({
          type,
          version: '1.0.0', // 펀드별 템플릿은 항상 1.0.0부터 시작
          content: globalTemplate.content,
          appendix: globalTemplate.appendix,
          fundId: fundId,
          isActive: true,
          description: `글로벌 템플릿 v${globalTemplate.version}로부터 초기화`,
        });

        createdTemplates.push(fundTemplate);
      }
    } catch (error) {
      console.error(`펀드 템플릿 초기화 실패 (${type}):`, error);
      // 하나 실패해도 계속 진행
    }
  }

  return createdTemplates;
}
