// 조합원 총회 관리 헬퍼 함수

import { deleteFile } from '@/lib/storage/server';
import { createBrandServerClient } from '@/lib/supabase/server';
import type {
  Assembly,
  AssemblyDocument,
  AssemblyEmail,
  AssemblyType,
  AssemblyWithCounts,
} from '@/types/assemblies';

/**
 * 펀드의 총회 목록 조회
 */
export async function getAssembliesByFund(
  fundId: string
): Promise<AssemblyWithCounts[]> {
  const brandClient = await createBrandServerClient();

  // 총회 목록 조회
  const { data: assemblies, error } = await brandClient.assemblies
    .select('*')
    .eq('fund_id', fundId)
    .order('assembly_date', { ascending: false });

  if (error) {
    console.error('총회 목록 조회 실패:', error);
    throw new Error('총회 목록을 가져오는데 실패했습니다.');
  }

  if (!assemblies || assemblies.length === 0) {
    return [];
  }

  // 각 총회의 문서 개수 조회 (parent 문서만 카운트, children 제외)
  const assemblyIds = assemblies.map((a: { id: string }) => a.id);
  const { data: documents, error: docsError } =
    await brandClient.assemblyDocuments
      .select('assembly_id, parent_document_id')
      .in('assembly_id', assemblyIds)
      .is('parent_document_id', null); // parent 문서만 조회

  if (docsError) {
    console.error('문서 개수 조회 실패:', docsError);
  }

  // 문서 개수 집계
  const documentCounts = new Map<string, number>();
  documents?.forEach((doc: { assembly_id: string }) => {
    const count = documentCounts.get(doc.assembly_id) || 0;
    documentCounts.set(doc.assembly_id, count + 1);
  });

  // ASSEMBLY_DOCUMENT_TYPES를 동적으로 import
  const { ASSEMBLY_DOCUMENT_TYPES } = await import('@/types/assemblies');

  // 결과 조합
  return assemblies.map((assembly: Assembly) => ({
    ...assembly,
    document_count: documentCounts.get(assembly.id) || 0,
    total_document_count:
      ASSEMBLY_DOCUMENT_TYPES[assembly.type as AssemblyType]?.length || 0,
  }));
}

/**
 * 총회 상세 조회 (문서 포함)
 */
export async function getAssemblyDetail(
  assemblyId: string
): Promise<AssemblyWithCounts | null> {
  const brandClient = await createBrandServerClient();

  // 총회 조회
  const { data: assembly, error } = await brandClient.assemblies
    .select('*')
    .eq('id', assemblyId)
    .single();

  if (error) {
    console.error('총회 조회 실패:', error);
    throw new Error('총회 정보를 가져오는데 실패했습니다.');
  }

  if (!assembly) {
    return null;
  }

  // 문서 목록 조회
  const { data: documents, error: docsError } =
    await brandClient.assemblyDocuments
      .select('*')
      .eq('assembly_id', assemblyId)
      .order('created_at', { ascending: true });

  if (docsError) {
    console.error('문서 목록 조회 실패:', docsError);
  }

  const { ASSEMBLY_DOCUMENT_TYPES } = await import('@/types/assemblies');

  // parent 문서만 카운트 (children 제외)
  const parentDocuments =
    documents?.filter(
      doc => !doc.parent_document_id || doc.parent_document_id === null
    ) || [];

  return {
    ...assembly,
    document_count: parentDocuments.length,
    total_document_count:
      ASSEMBLY_DOCUMENT_TYPES[assembly.type as AssemblyType]?.length || 0,
    documents: documents || [],
  };
}

/**
 * 총회 생성
 */
export async function createAssembly(
  fundId: string,
  type: AssemblyType,
  assemblyDate: string,
  createdBy: string,
  brand: string
): Promise<Assembly> {
  const brandClient = await createBrandServerClient();

  const { data, error } = await brandClient.assemblies
    .insert({
      fund_id: fundId,
      type,
      assembly_date: assemblyDate,
      status: 'draft',
      created_by: createdBy,
      brand,
    })
    .select()
    .single();

  if (error) {
    console.error('총회 생성 실패:', error);
    throw new Error('총회 생성에 실패했습니다.');
  }

  return data;
}

/**
 * 총회 삭제
 */
export async function deleteAssembly(assemblyId: string): Promise<void> {
  const brandClient = await createBrandServerClient();

  // 1. 총회에 연결된 모든 문서 조회
  const { data: documents, error: docsError } =
    await brandClient.assemblyDocuments
      .select('id, pdf_storage_path')
      .eq('assembly_id', assemblyId);

  if (docsError) {
    console.error('총회 문서 조회 실패:', docsError);
    throw new Error('총회 문서를 조회하는데 실패했습니다.');
  }

  // 2. Storage에서 문서 파일들 삭제
  if (documents && documents.length > 0) {
    console.log(
      `총회 ID ${assemblyId}의 문서 ${documents.length}개를 삭제합니다.`
    );

    for (const doc of documents) {
      if (doc.pdf_storage_path) {
        try {
          const deleteResult = await deleteFile(
            doc.pdf_storage_path,
            'generated-documents'
          );

          if (!deleteResult.success) {
            console.error(
              `문서 파일 삭제 실패 (${doc.pdf_storage_path}):`,
              deleteResult.error
            );
            // 파일 삭제 실패해도 계속 진행 (파일이 이미 없을 수 있음)
          } else {
            console.log(`문서 파일 삭제 성공: ${doc.pdf_storage_path}`);
          }
        } catch (error) {
          console.error(
            `문서 파일 삭제 중 오류 (${doc.pdf_storage_path}):`,
            error
          );
          // 오류 발생해도 계속 진행
        }
      }
    }
  }

  // 3. DB에서 총회 삭제 (cascade로 문서들도 삭제됨)
  const { error } = await brandClient.assemblies.delete().eq('id', assemblyId);

  if (error) {
    console.error('총회 삭제 실패:', error);
    throw new Error('총회 삭제에 실패했습니다.');
  }

  console.log(`총회 ID ${assemblyId}가 성공적으로 삭제되었습니다.`);
}

/**
 * 총회 상태 업데이트
 */
export async function updateAssemblyStatus(
  assemblyId: string,
  status: 'draft' | 'completed' | 'sent'
): Promise<void> {
  const brandClient = await createBrandServerClient();

  const { error } = await brandClient.assemblies
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', assemblyId);

  if (error) {
    console.error('총회 상태 업데이트 실패:', error);
    throw new Error('총회 상태 업데이트에 실패했습니다.');
  }
}

/**
 * 총회 문서 생성
 */
export async function createAssemblyDocument(params: {
  assemblyId: string;
  type: string;
  content?: any;
  templateId?: string;
  templateVersion?: string;
  pdfStoragePath?: string;
  generatedBy: string;
}): Promise<AssemblyDocument> {
  const brandClient = await createBrandServerClient();

  const { data, error } = await brandClient.assemblyDocuments
    .insert({
      assembly_id: params.assemblyId,
      type: params.type,
      content: params.content || null,
      template_id: params.templateId || null,
      template_version: params.templateVersion || null,
      pdf_storage_path: params.pdfStoragePath || null,
      generated_by: params.generatedBy,
    })
    .select()
    .single();

  if (error) {
    console.error('문서 생성 실패:', error);
    throw new Error('문서 생성에 실패했습니다.');
  }

  return data;
}

/**
 * 총회 문서 조회
 */
export async function getAssemblyDocument(
  documentId: string
): Promise<AssemblyDocument | null> {
  const brandClient = await createBrandServerClient();

  const { data, error } = await brandClient.assemblyDocuments
    .select('*')
    .eq('id', documentId)
    .single();

  if (error) {
    console.error('문서 조회 실패:', error);
    return null;
  }

  return data;
}

/**
 * 총회의 모든 문서 조회
 */
export async function getAssemblyDocuments(
  assemblyId: string
): Promise<AssemblyDocument[]> {
  const brandClient = await createBrandServerClient();

  const { data, error } = await brandClient.assemblyDocuments
    .select('*')
    .eq('assembly_id', assemblyId)
    .or('is_split_parent.eq.true,is_split_parent.is.null') // parent 문서만 또는 분할되지 않은 문서
    .order('created_at', { ascending: true });

  if (error) {
    console.error('문서 목록 조회 실패:', error);
    throw new Error('문서 목록을 가져오는데 실패했습니다.');
  }

  return data || [];
}

/**
 * 이메일 발송 기록 생성
 */
export async function createAssemblyEmail(params: {
  assemblyId: string;
  recipientIds: string[];
  recipientEmails: string[];
  subject: string;
  body: string;
  attachedDocumentIds: string[];
  sentBy: string;
  brand: string;
}): Promise<AssemblyEmail> {
  const brandClient = await createBrandServerClient();

  const { data, error } = await brandClient.assemblyEmails
    .insert({
      assembly_id: params.assemblyId,
      recipient_ids: params.recipientIds,
      recipient_emails: params.recipientEmails,
      subject: params.subject,
      body: params.body,
      attached_document_ids: params.attachedDocumentIds,
      status: 'pending',
      sent_by: params.sentBy,
      brand: params.brand,
    })
    .select()
    .single();

  if (error) {
    console.error('이메일 기록 생성 실패:', error);
    throw new Error('이메일 기록 생성에 실패했습니다.');
  }

  return data;
}

/**
 * 이메일 발송 상태 업데이트
 */
export async function updateAssemblyEmailStatus(
  emailId: string,
  status: 'pending' | 'sending' | 'sent' | 'failed',
  errorMessage?: string
): Promise<void> {
  const brandClient = await createBrandServerClient();

  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'sent') {
    updateData.sent_at = new Date().toISOString();
  }

  if (errorMessage) {
    updateData.error_message = errorMessage;
  }

  const { error } = await brandClient.assemblyEmails
    .update(updateData)
    .eq('id', emailId);

  if (error) {
    console.error('이메일 상태 업데이트 실패:', error);
    throw new Error('이메일 상태 업데이트에 실패했습니다.');
  }
}

/**
 * 총회의 이메일 발송 기록 조회
 */
export async function getAssemblyEmails(
  assemblyId: string
): Promise<AssemblyEmail[]> {
  const brandClient = await createBrandServerClient();

  const { data, error } = await brandClient.assemblyEmails
    .select('*')
    .eq('assembly_id', assemblyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('이메일 기록 조회 실패:', error);
    throw new Error('이메일 기록을 가져오는데 실패했습니다.');
  }

  return data || [];
}
