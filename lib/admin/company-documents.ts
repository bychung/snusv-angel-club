import { deleteFile, uploadFile } from '@/lib/storage/server';
import { createBrandServerClient } from '@/lib/supabase/server';
import {
  CompanyDocumentCategory,
  type CompanyDocumentFilters,
  type CompanyDocumentsResponse,
  type CompanyDocumentStatus,
  type CompanyDocumentWithDetails,
} from '@/types/company-documents';

/**
 * 회사 문서 목록 조회 (필터링 및 페이징 지원)
 */
export async function getCompanyDocuments(
  filters: CompanyDocumentFilters = {},
  page: number = 1,
  limit: number = 20
): Promise<CompanyDocumentsResponse> {
  const brandClient = await createBrandServerClient();
  const offset = (page - 1) * limit;

  // company_document_details 뷰를 사용하여 조인된 데이터 조회
  let query = brandClient.companyDocumentDetails
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  // 회사 ID 필터링
  if (filters.company_ids && filters.company_ids.length > 0) {
    query = query.in('company_id', filters.company_ids);
  }

  // 카테고리 필터링
  if (filters.categories && filters.categories.length > 0) {
    query = query.in('category', filters.categories);
  }

  // 업로드 날짜 필터링
  if (filters.uploaded_after) {
    query = query.gte('created_at', filters.uploaded_after);
  }
  if (filters.uploaded_before) {
    query = query.lte('created_at', filters.uploaded_before);
  }

  // 파일명 검색
  if (filters.search) {
    query = query.ilike('file_name', `%${filters.search}%`);
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`회사 문서 목록 조회 실패: ${error.message}`);
  }

  const total = count || 0;
  const hasMore = total > offset + limit;

  return {
    documents: data || [],
    total,
    page,
    limit,
    hasMore,
  };
}

/**
 * 회사 문서 상세 조회
 */
export async function getCompanyDocumentById(
  documentId: string
): Promise<CompanyDocumentWithDetails | null> {
  const brandClient = await createBrandServerClient();

  const { data, error } = await brandClient.companyDocumentDetails
    .select('*')
    .eq('id', documentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // 데이터 없음
    }
    throw new Error(`회사 문서 조회 실패: ${error.message}`);
  }

  return data;
}

/**
 * 특정 회사의 문서 목록 조회
 */
export async function getDocumentsByCompany(
  companyId: string
): Promise<CompanyDocumentStatus | null> {
  const brandClient = await createBrandServerClient();

  // 회사 정보 조회 (브랜드별)
  const { data: company, error: companyError } = await brandClient.companies
    .select('*')
    .eq('id', companyId)
    .single();

  if (companyError) {
    if (companyError.code === 'PGRST116') {
      return null;
    }
    throw new Error(`회사 조회 실패: ${companyError.message}`);
  }

  // 해당 회사의 문서 목록 조회
  const { data: documents, error: documentError } =
    await brandClient.companyDocumentDetails
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

  if (documentError) {
    throw new Error(`회사 문서 목록 조회 실패: ${documentError.message}`);
  }

  // 카테고리별 문서 분류
  const documentsByCategory: Record<
    CompanyDocumentCategory,
    CompanyDocumentWithDetails[]
  > = {} as any;

  Object.values(CompanyDocumentCategory).forEach(category => {
    documentsByCategory[category] = [];
  });

  documents?.forEach((doc: any) => {
    if (documentsByCategory[doc.category as CompanyDocumentCategory]) {
      documentsByCategory[doc.category as CompanyDocumentCategory].push(doc);
    }
  });

  // 최신 업로드 날짜
  const latestUpload =
    documents && documents.length > 0 ? documents[0].created_at : null;

  return {
    company,
    documents: documents || [],
    documents_by_category: documentsByCategory,
    total_documents: documents?.length || 0,
    latest_upload: latestUpload,
  };
}

/**
 * 회사 문서 업로드
 */
export async function uploadCompanyDocument(
  file: File,
  companyId: string,
  category: CompanyDocumentCategory,
  uploadedBy: string
): Promise<CompanyDocumentWithDetails> {
  try {
    // 회사 존재 확인 (브랜드별)
    const brandClient = await createBrandServerClient();
    const { count: companyCount } = await brandClient.companies
      .select('*', { count: 'exact', head: true })
      .eq('id', companyId);

    if (!companyCount || companyCount === 0) {
      throw new Error('존재하지 않는 회사입니다.');
    }

    // 1. 파일을 Supabase Storage에 업로드
    const storagePath = `${companyId}/${category}`;
    const uploadResult = await uploadFile(
      file,
      'company-documents',
      storagePath
    );

    if (!uploadResult.success || !uploadResult.file_url) {
      throw new Error(uploadResult.error || '파일 업로드에 실패했습니다');
    }

    // 2. DB에 문서 정보 저장
    const { data, error } = await brandClient.companyDocuments
      .insert({
        company_id: companyId,
        category,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_url: uploadResult.file_url,
        uploaded_by: uploadedBy,
      })
      .select()
      .single();

    if (error) {
      // 업로드된 파일 삭제 (rollback)
      if (uploadResult.file_path) {
        await deleteFile(uploadResult.file_path);
      }
      throw error;
    }

    // 상세 정보 반환
    const detailedDocument = await getCompanyDocumentById(data.id);
    if (!detailedDocument) {
      throw new Error('업로드된 문서 정보를 조회할 수 없습니다.');
    }

    return detailedDocument;
  } catch (error) {
    console.error('회사 문서 업로드 실패:', error);
    throw error;
  }
}

/**
 * 회사 문서 삭제
 */
export async function deleteCompanyDocument(documentId: string): Promise<void> {
  const brandClient = await createBrandServerClient();

  // 문서 정보 조회 (파일 경로 확인용, 브랜드별)
  const { data: document, error: fetchError } =
    await brandClient.companyDocuments
      .select('file_url')
      .eq('id', documentId)
      .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      throw new Error('존재하지 않는 문서입니다.');
    }
    throw new Error(`문서 조회 실패: ${fetchError.message}`);
  }

  // 파일 URL에서 스토리지 경로 추출
  const fileUrl = document.file_url;
  let filePath = '';

  try {
    // Supabase storage URL에서 파일 경로 추출
    const urlParts = fileUrl.split('/object/public/company-documents/');
    if (urlParts.length === 2) {
      filePath = urlParts[1];
    }
  } catch (e) {
    console.warn('파일 경로 추출 실패:', e);
  }

  // DB에서 문서 정보 삭제
  const { error: deleteError } = await brandClient.companyDocuments
    .delete()
    .eq('id', documentId);

  if (deleteError) {
    throw new Error(`문서 삭제 실패: ${deleteError.message}`);
  }

  // 스토리지에서 파일 삭제 (실패해도 DB는 이미 삭제됨)
  if (filePath) {
    try {
      await deleteFile(filePath, 'company-documents');
    } catch (storageError) {
      console.warn('스토리지 파일 삭제 실패:', storageError);
      // 스토리지 삭제 실패는 치명적이지 않으므로 에러를 throw하지 않음
    }
  }
}

/**
 * 특정 회사의 특정 카테고리 문서 목록 조회
 */
export async function getCompanyDocumentsByCategory(
  companyId: string,
  category: CompanyDocumentCategory
): Promise<CompanyDocumentWithDetails[]> {
  const brandClient = await createBrandServerClient();

  const { data, error } = await brandClient.companyDocumentDetails
    .select('*')
    .eq('company_id', companyId)
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`회사 문서 조회 실패: ${error.message}`);
  }

  return data || [];
}

/**
 * 카테고리별 문서 통계
 */
export async function getDocumentStatsByCategory(): Promise<
  Record<CompanyDocumentCategory, number>
> {
  const brandClient = await createBrandServerClient();

  const { data, error } = await brandClient.companyDocuments.select('category');

  if (error) {
    throw new Error(`문서 통계 조회 실패: ${error.message}`);
  }

  const stats: Record<CompanyDocumentCategory, number> = {} as any;

  Object.values(CompanyDocumentCategory).forEach(category => {
    stats[category] = 0;
  });

  data?.forEach((doc: any) => {
    if (stats[doc.category as CompanyDocumentCategory] !== undefined) {
      stats[doc.category as CompanyDocumentCategory]++;
    }
  });

  return stats;
}
