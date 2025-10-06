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
 * 펀드 문서 생성 또는 업데이트
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

  // 기존 문서가 있는지 확인
  const existing = await getFundDocument(fundId, type);

  if (existing) {
    // 업데이트
    const { data, error } = await supabase.fundDocuments
      .update({
        template_id: templateId,
        template_version: templateVersion,
        processed_content: processedContent,
        generation_context: generationContext,
        pdf_storage_path: pdfStoragePath,
        generated_by: generatedBy,
        generated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      throw new Error(`펀드 문서 업데이트 실패: ${error.message}`);
    }

    return data;
  } else {
    // 신규 생성
    const { data, error } = await supabase.fundDocuments
      .insert({
        fund_id: fundId,
        type,
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
}

/**
 * 펀드 문서 삭제
 */
export async function deleteFundDocument(documentId: string): Promise<void> {
  const supabase = await createBrandServerClient();

  const { error } = await supabase.fundDocuments.delete().eq('id', documentId);

  if (error) {
    throw new Error(`펀드 문서 삭제 실패: ${error.message}`);
  }
}
