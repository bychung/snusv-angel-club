// 문서 템플릿 버전 관리 관련 헬퍼 함수

import { createBrandServerClient } from '@/lib/supabase/server';
import type { DocumentTemplate } from '@/types/database';

/**
 * 특정 타입의 활성 템플릿 조회
 */
export async function getActiveTemplate(
  type: string
): Promise<DocumentTemplate | null> {
  const supabase = await createBrandServerClient();

  const { data, error } = await supabase.documentTemplates
    .select('*')
    .eq('type', type)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found
      return null;
    }
    throw new Error(`템플릿 조회 실패: ${error.message}`);
  }

  return data;
}

/**
 * 특정 타입의 모든 템플릿 버전 조회
 */
export async function getTemplatesByType(
  type: string
): Promise<DocumentTemplate[]> {
  const supabase = await createBrandServerClient();

  const { data, error } = await supabase.documentTemplates
    .select('*')
    .eq('type', type)
    .order('created_at', { ascending: false });

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
 * 템플릿 활성화 (같은 type의 다른 템플릿은 자동 비활성화)
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

  // 2. 같은 타입의 다른 템플릿들 비활성화
  const { error: deactivateError } = await supabase.documentTemplates
    .update({ is_active: false })
    .eq('type', template.type)
    .eq('is_active', true);

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
  description?: string;
  isActive?: boolean;
  createdBy?: string;
}): Promise<DocumentTemplate> {
  const supabase = await createBrandServerClient();

  const {
    type,
    version,
    content,
    description,
    isActive = false,
    createdBy,
  } = params;

  // 같은 type & version이 이미 존재하는지 확인
  const { data: existing } = await supabase.documentTemplates
    .select('id')
    .eq('type', type)
    .eq('version', version)
    .single();

  if (existing) {
    throw new Error(`템플릿 버전 ${version}이(가) 이미 존재합니다`);
  }

  // 활성화할 경우 기존 활성 템플릿 비활성화
  if (isActive) {
    await supabase.documentTemplates
      .update({ is_active: false })
      .eq('type', type)
      .eq('is_active', true);
  }

  // 새 템플릿 생성
  const { data, error } = await supabase.documentTemplates
    .insert({
      type,
      version,
      content,
      description,
      is_active: isActive,
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
