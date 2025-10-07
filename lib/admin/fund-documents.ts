// 펀드 문서 생성 기록 관련 헬퍼 함수

import { createBrandServerClient } from '@/lib/supabase/server';
import type { FundDocument } from '@/types/database';

/**
 * 특정 펀드의 특정 타입 문서 조회
 */
export async function getFundDocument(
  fundId: string,
  type: string
): Promise<FundDocument | null> {
  const supabase = await createBrandServerClient();

  const { data, error } = await supabase.fundDocuments
    .select('*')
    .eq('fund_id', fundId)
    .eq('type', type)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`펀드 문서 조회 실패: ${error.message}`);
  }

  return data;
}

/**
 * 특정 펀드의 모든 문서 조회
 */
export async function getFundDocuments(
  fundId: string
): Promise<FundDocument[]> {
  const supabase = await createBrandServerClient();

  const { data, error } = await supabase.fundDocuments
    .select('*')
    .eq('fund_id', fundId)
    .order('generated_at', { ascending: false });

  if (error) {
    throw new Error(`펀드 문서 목록 조회 실패: ${error.message}`);
  }

  return data || [];
}

/**
 * 문서 ID로 조회
 */
export async function getFundDocumentById(
  documentId: string
): Promise<FundDocument | null> {
  const supabase = await createBrandServerClient();

  const { data, error } = await supabase.fundDocuments
    .select('*')
    .eq('id', documentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`문서 조회 실패: ${error.message}`);
  }

  return data;
}

/**
 * 특정 펀드의 특정 타입 문서 버전들 조회
 */
export async function getFundDocumentVersions(
  fundId: string,
  type: string
): Promise<FundDocument[]> {
  const supabase = await createBrandServerClient();

  const { data, error } = await supabase.fundDocuments
    .select('*')
    .eq('fund_id', fundId)
    .eq('type', type)
    .order('version_number', { ascending: false });

  if (error) {
    throw new Error(`펀드 문서 버전 조회 실패: ${error.message}`);
  }

  return data || [];
}

/**
 * 활성 문서(최신 버전) 조회
 */
export async function getActiveFundDocument(
  fundId: string,
  type: string
): Promise<FundDocument | null> {
  const supabase = await createBrandServerClient();

  const { data, error } = await supabase.fundDocuments
    .select('*')
    .eq('fund_id', fundId)
    .eq('type', type)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`활성 문서 조회 실패: ${error.message}`);
  }

  return data;
}

/**
 * 펀드 문서 생성 (새 버전으로 항상 생성)
 */
export async function saveFundDocument(params: {
  fundId: string;
  type: string;
  templateId?: string;
  templateVersion: string;
  processedContent: any;
  generationContext?: any;
  pdfStoragePath?: string;
  generatedBy?: string;
}): Promise<FundDocument> {
  const supabase = await createBrandServerClient();

  const {
    fundId,
    type,
    templateId,
    templateVersion,
    processedContent,
    generationContext,
    pdfStoragePath,
    generatedBy,
  } = params;

  // 1. 기존 문서들의 최대 버전 번호 조회
  const { data: existingDocs } = await supabase.fundDocuments
    .select('version_number')
    .eq('fund_id', fundId)
    .eq('type', type)
    .order('version_number', { ascending: false })
    .limit(1);

  const nextVersion =
    existingDocs && existingDocs.length > 0
      ? existingDocs[0].version_number + 1
      : 1;

  // 2. 기존 활성 문서들 비활성화
  await supabase.fundDocuments
    .update({ is_active: false })
    .eq('fund_id', fundId)
    .eq('type', type)
    .eq('is_active', true);

  // 3. 새 버전 생성 (항상 insert)
  const { data, error } = await supabase.fundDocuments
    .insert({
      fund_id: fundId,
      type,
      version_number: nextVersion,
      is_active: true,
      template_id: templateId,
      template_version: templateVersion,
      processed_content: processedContent,
      generation_context: generationContext,
      pdf_storage_path: pdfStoragePath,
      generated_by: generatedBy,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`펀드 문서 생성 실패: ${error.message}`);
  }

  return data;
}

/**
 * 펀드 문서 삭제 (하드 삭제)
 * 최신 버전(is_active = true)은 삭제 불가
 */
export async function deleteFundDocument(documentId: string): Promise<void> {
  const supabase = await createBrandServerClient();

  // 1. 문서 조회
  const doc = await getFundDocumentById(documentId);
  if (!doc) {
    throw new Error('문서를 찾을 수 없습니다');
  }

  // 2. 최신 버전 삭제 방지
  if (doc.is_active) {
    throw new Error('최신 버전은 삭제할 수 없습니다');
  }

  // 3. 하드 삭제 실행
  const { error } = await supabase.fundDocuments.delete().eq('id', documentId);

  if (error) {
    throw new Error(`펀드 문서 삭제 실패: ${error.message}`);
  }
}

/**
 * 최신 문서와 새로 생성할 문서의 context, template_version을 비교하여 중복 여부 확인
 */
export async function isDocumentDuplicate(
  fundId: string,
  type: string,
  newGenerationContext: any,
  newTemplateVersion: string
): Promise<boolean> {
  const latestDoc = await getActiveFundDocument(fundId, type);

  if (!latestDoc) {
    // 최신 문서가 없으면 중복이 아님
    return false;
  }

  // 1. template_version 비교
  if (latestDoc.template_version !== newTemplateVersion) {
    return false;
  }

  // 2. generation_context 비교
  // generatedAt 필드는 제외하고 비교 (생성 시간은 당연히 다름)
  const oldContext = { ...latestDoc.generation_context };
  const newContext = { ...newGenerationContext };

  delete oldContext.generatedAt;
  delete newContext.generatedAt;

  // JSON 문자열로 변환하여 비교 (깊은 비교)
  const oldContextStr = JSON.stringify(
    oldContext,
    Object.keys(oldContext).sort()
  );
  const newContextStr = JSON.stringify(
    newContext,
    Object.keys(newContext).sort()
  );

  return oldContextStr === newContextStr;
}
