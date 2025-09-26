// addBrandToData는 brandClient 내부에서 처리되므로 불필요
import { deleteFile, uploadFile } from '@/lib/storage/server';
import { createBrandServerClient } from '@/lib/supabase/server';
import type { Document } from '@/types/database';
import { DocumentCategory } from '@/types/documents';

export interface DocumentWithUploader extends Document {
  uploader?: {
    name: string;
    email: string;
  };
}

/**
 * 특정 펀드의 특정 카테고리 문서 히스토리 조회
 */
export async function getDocumentHistory(
  fundId: string,
  category: DocumentCategory
): Promise<DocumentWithUploader[]> {
  const brandClient = await createBrandServerClient();

  const { data, error } = await brandClient.documents
    .select(
      `
      *,
      uploader:profiles!documents_uploaded_by_fkey (
        name,
        email
      )
    `
    )
    .eq('fund_id', fundId)
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('문서 히스토리 조회 실패:', error);
    throw error;
  }

  return data.map((doc: any) => ({
    ...doc,
    uploader: doc.uploader
      ? {
          name: doc.uploader.name,
          email: doc.uploader.email,
        }
      : undefined,
  }));
}

/**
 * 문서 업로드 및 DB 저장
 */
export async function uploadDocument(
  file: File,
  fundId: string,
  category: DocumentCategory,
  uploadedBy: string, // profile ID
  memberId?: string, // 조합원별 문서용 (투자확인서)
  documentYear?: number // 연도별 구분용
): Promise<Document> {
  try {
    // 1. 파일을 Supabase Storage에 업로드
    // 조합원별 문서는 다른 경로 구조 사용
    let storagePath: string;
    if (memberId) {
      const yearPath = documentYear ? `${documentYear}` : 'default';
      storagePath = `${fundId}/${category}/${memberId}/${yearPath}`;
    } else {
      storagePath = `${fundId}/${category}`;
    }

    const uploadResult = await uploadFile(file, 'fund-documents', storagePath);

    if (!uploadResult.success || !uploadResult.file_url) {
      throw new Error(uploadResult.error || '파일 업로드에 실패했습니다');
    }

    // 2. DB에 문서 정보 저장
    const brandClient = await createBrandServerClient();
    const { data, error } = await brandClient.documents
      .insert({
        fund_id: fundId,
        category,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_url: uploadResult.file_url,
        uploaded_by: uploadedBy,
        member_id: memberId || null,
        document_year: documentYear || null,
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

    return data;
  } catch (error) {
    console.error('문서 업로드 실패:', error);
    throw error;
  }
}

/**
 * 문서 삭제 (Storage + DB)
 */
export async function deleteDocument(documentId: string): Promise<void> {
  const brandClient = await createBrandServerClient();

  // 1. 문서 정보 조회
  const { data: document, error: fetchError } = await brandClient.documents
    .select('file_url')
    .eq('id', documentId)
    .single();

  if (fetchError || !document) {
    throw new Error('삭제할 문서를 찾을 수 없습니다');
  }

  try {
    // 2. Storage에서 파일 삭제
    // file_url에서 파일 경로 추출
    const url = new URL(document.file_url);
    const pathSegments = url.pathname.split('/');
    const bucketIndex = pathSegments.findIndex(
      segment => segment === 'fund-documents'
    );

    if (bucketIndex !== -1 && bucketIndex < pathSegments.length - 1) {
      const filePath = pathSegments.slice(bucketIndex + 1).join('/');
      await deleteFile(filePath);
    }

    // 3. DB에서 문서 정보 삭제
    const { error: deleteError } = await brandClient.documents
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      throw deleteError;
    }
  } catch (error) {
    console.error('문서 삭제 실패:', error);
    throw error;
  }
}

/**
 * 특정 펀드의 모든 카테고리별 최신 문서 상태 조회
 */
export async function getFundDocumentStatus(fundId: string): Promise<{
  [key in DocumentCategory]: {
    exists: boolean;
    latest_document?: DocumentWithUploader;
    document_count: number;
  };
}> {
  const categories = [
    DocumentCategory.AGREEMENT,
    DocumentCategory.TAX,
    DocumentCategory.ACCOUNT,
    DocumentCategory.REGISTRATION,
  ] as const;
  const result = {} as any;

  for (const category of categories) {
    const documents = await getDocumentHistory(fundId, category);

    result[category] = {
      exists: documents.length > 0,
      latest_document: documents.length > 0 ? documents[0] : undefined,
      document_count: documents.length,
    };
  }

  return result;
}

/**
 * 문서 다운로드 권한 확인
 * 투자확인서의 경우 별도의 canDownloadInvestmentCertificate 함수 사용 권장
 */
export function canDownloadDocument(
  category: DocumentCategory,
  userRole: string,
  isParticipant: boolean
): boolean {
  // 관리자는 모든 문서 다운로드 가능
  if (userRole === 'ADMIN') return true;

  // 투자확인서는 별도 권한 확인 로직 필요
  if (category === DocumentCategory.INVESTMENT_CERTIFICATE) {
    // 이 함수로는 정확한 권한 확인이 어려우므로 false 반환
    // canDownloadInvestmentCertificate 함수 사용 권장
    return false;
  }

  // 일반 유저는 참여 펀드의 특정 카테고리만
  if (
    isParticipant &&
    [DocumentCategory.ACCOUNT, DocumentCategory.AGREEMENT].includes(category)
  ) {
    return true;
  }

  return false;
}

/**
 * 문서 업로드 권한 확인
 */
export function canUploadDocument(userRole: string): boolean {
  return userRole === 'ADMIN';
}

/**
 * 문서 삭제 권한 확인
 */
export function canDeleteDocument(userRole: string): boolean {
  return userRole === 'ADMIN';
}

/**
 * 투자확인서 업로드 (조합원별, 연도별)
 */
export async function uploadInvestmentCertificate(
  file: File,
  fundId: string,
  memberId: string,
  uploadedBy: string,
  documentYear?: number
): Promise<Document> {
  return uploadDocument(
    file,
    fundId,
    DocumentCategory.INVESTMENT_CERTIFICATE,
    uploadedBy,
    memberId,
    documentYear
  );
}

/**
 * 특정 조합원의 투자확인서 히스토리 조회
 */
export async function getMemberInvestmentCertificates(
  fundId: string,
  memberId: string,
  documentYear?: number
): Promise<DocumentWithUploader[]> {
  const brandClient = await createBrandServerClient();

  let query = brandClient.documents
    .select(
      `
      *,
      uploader:profiles!documents_uploaded_by_fkey (
        name,
        email
      )
    `
    )
    .eq('fund_id', fundId)
    .eq('member_id', memberId)
    .eq('category', DocumentCategory.INVESTMENT_CERTIFICATE)
    .order('created_at', { ascending: false });

  if (documentYear !== undefined) {
    query = query.eq('document_year', documentYear);
  }

  const { data, error } = await query;

  if (error) {
    console.error('조합원 투자확인서 조회 실패:', error);
    throw error;
  }

  return data.map((doc: any) => ({
    ...doc,
    uploader: doc.uploader
      ? {
          name: doc.uploader.name,
          email: doc.uploader.email,
        }
      : undefined,
  }));
}

/**
 * 펀드 내 모든 조합원의 투자확인서 현황 조회
 */
export async function getFundInvestmentCertificateStatus(
  fundId: string
): Promise<{
  memberStatuses: Array<{
    member: {
      id: string;
      name: string;
      email: string;
    };
    certificates: Array<{
      year?: number;
      document_count: number;
      latest_document?: DocumentWithUploader;
    }>;
  }>;
}> {
  const brandClient = await createBrandServerClient();

  // 1. 펀드의 모든 조합원 조회 (브랜드별)
  const { data: fundMembers, error: membersError } =
    await brandClient.fundMembers
      .select(
        `
      profile:profiles (
        id, name, email
      )
    `
      )
      .eq('fund_id', fundId);

  if (membersError || !fundMembers) {
    console.error('펀드 조합원 조회 실패:', membersError);
    throw membersError || new Error('펀드 조합원을 조회할 수 없습니다');
  }

  // 2. 각 조합원별 투자확인서 현황 조회
  const memberStatuses = await Promise.all(
    fundMembers
      .filter((member: any) => member.profile)
      .map(async (member: any) => {
        const memberId = member.profile.id;

        // 해당 조합원의 모든 투자확인서 조회 (브랜드별)
        const { data: certificates, error: certError } =
          await brandClient.documents
            .select(
              `
            *,
            uploader:profiles!documents_uploaded_by_fkey (
              name,
              email
            )
          `
            )
            .eq('fund_id', fundId)
            .eq('member_id', memberId)
            .eq('category', DocumentCategory.INVESTMENT_CERTIFICATE)
            .order('document_year', { ascending: false })
            .order('created_at', { ascending: false });

        if (certError) {
          console.error(`조합원 ${memberId} 투자확인서 조회 실패:`, certError);
          throw certError;
        }

        // 연도별로 그룹화
        const yearGroups = (certificates || []).reduce(
          (acc: any, cert: any) => {
            const year = cert.document_year;
            if (!acc[year]) {
              acc[year] = [];
            }
            acc[year].push({
              ...cert,
              uploader: cert.uploader
                ? {
                    name: cert.uploader.name,
                    email: cert.uploader.email,
                  }
                : undefined,
            });
            return acc;
          },
          {} as Record<number | 'null', DocumentWithUploader[]>
        );

        const certificatesByYear = Object.entries(yearGroups).map(
          ([yearStr, docs]: [string, any]) => ({
            year: yearStr === 'null' ? undefined : Number(yearStr),
            document_count: docs.length,
            latest_document: docs[0], // 이미 created_at DESC로 정렬됨
          })
        );

        return {
          member: {
            id: member.profile.id,
            name: member.profile.name,
            email: member.profile.email,
          },
          certificates: certificatesByYear,
        };
      })
  );

  return { memberStatuses };
}

/**
 * 투자확인서 다운로드 권한 확인
 */
export function canDownloadInvestmentCertificate(
  userRole: string,
  isParticipant: boolean,
  requestedMemberId: string,
  userProfileId?: string
): boolean {
  // 관리자는 모든 투자확인서 다운로드 가능
  if (userRole === 'ADMIN') return true;

  // 일반 유저는 본인의 투자확인서만 다운로드 가능
  return isParticipant && userProfileId === requestedMemberId;
}
