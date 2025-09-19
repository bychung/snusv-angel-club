import { deleteFile, uploadFile } from '@/lib/storage/server';
import { createClient } from '@/lib/supabase/server';
import type { Document } from '@/types/database';

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
  category: 'account' | 'tax' | 'registration' | 'agreement'
): Promise<DocumentWithUploader[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('documents')
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

  return data.map(doc => ({
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
  category: 'account' | 'tax' | 'registration' | 'agreement',
  uploadedBy: string // profile ID
): Promise<Document> {
  try {
    // 1. 파일을 Supabase Storage에 업로드
    const uploadResult = await uploadFile(
      file,
      'fund-documents',
      `${fundId}/${category}`
    );

    if (!uploadResult.success || !uploadResult.file_url) {
      throw new Error(uploadResult.error || '파일 업로드에 실패했습니다');
    }

    // 2. DB에 문서 정보 저장
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('documents')
      .insert({
        fund_id: fundId,
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
  const supabase = await createClient();

  // 1. 문서 정보 조회
  const { data: document, error: fetchError } = await supabase
    .from('documents')
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
    const { error: deleteError } = await supabase
      .from('documents')
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
  [key in 'account' | 'tax' | 'registration' | 'agreement']: {
    exists: boolean;
    latest_document?: DocumentWithUploader;
    document_count: number;
  };
}> {
  const categories = ['account', 'tax', 'registration', 'agreement'] as const;
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
 */
export function canDownloadDocument(
  category: 'account' | 'tax' | 'registration' | 'agreement',
  userRole: string,
  isParticipant: boolean
): boolean {
  // 관리자는 모든 문서 다운로드 가능
  if (userRole === 'ADMIN') return true;

  // 일반 유저는 참여 펀드의 특정 카테고리만
  if (isParticipant && ['account', 'agreement'].includes(category)) {
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
