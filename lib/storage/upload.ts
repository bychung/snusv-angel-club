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
 * Sleep 유틸리티
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Supabase Storage에 Buffer 또는 File 업로드 (재시도 포함)
 */
export async function uploadFileToStorage(
  params: UploadFileToStorageParams,
  maxRetries: number = 3
): Promise<string> {
  const { bucket, path, file, contentType = 'application/pdf' } = params;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
        throw new Error(`파일 업로드 실패: ${error.message}`);
      }

      if (!data) {
        throw new Error('파일 업로드 결과가 없습니다.');
      }

      console.log(
        `파일 업로드 성공 (시도 ${attempt}/${maxRetries}):`,
        data.path
      );
      return data.path;
    } catch (error) {
      lastError = error;
      console.error(`파일 업로드 실패 (시도 ${attempt}/${maxRetries}):`, error);

      // 마지막 시도가 아니면 재시도
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1초, 2초, 4초
        console.log(`${delay}ms 후 재시도...`);
        await sleep(delay);
      }
    }
  }

  // 모든 재시도 실패
  console.error('uploadFileToStorage 최종 실패:', lastError);
  throw lastError;
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
