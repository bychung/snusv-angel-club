// Storage 파일 업로드 유틸리티 (Buffer 지원)

import { createStorageClient } from '../supabase/server';

interface UploadFileToStorageParams {
  bucket: string;
  path: string;
  file: Buffer | Blob | File;
  contentType?: string;
  brand: string;
}

/**
 * Supabase Storage에 Buffer 또는 File 업로드
 */
export async function uploadFileToStorage(
  params: UploadFileToStorageParams
): Promise<string> {
  const { bucket, path, file, contentType = 'application/pdf' } = params;

  try {
    const supabase = createStorageClient();

    // 파일 업로드
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error('파일 업로드 실패:', error);
      throw new Error(`파일 업로드 실패: ${error.message}`);
    }

    if (!data) {
      throw new Error('파일 업로드 결과가 없습니다.');
    }

    console.log('파일 업로드 성공:', data.path);
    return data.path;
  } catch (error) {
    console.error('uploadFileToStorage 오류:', error);
    throw error;
  }
}

/**
 * Storage에서 파일 삭제
 */
export async function deleteFileFromStorage(
  bucket: string,
  path: string
): Promise<void> {
  try {
    const supabase = createStorageClient();

    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      console.error('파일 삭제 실패:', error);
      throw new Error(`파일 삭제 실패: ${error.message}`);
    }

    console.log('파일 삭제 성공:', path);
  } catch (error) {
    console.error('deleteFileFromStorage 오류:', error);
    throw error;
  }
}
