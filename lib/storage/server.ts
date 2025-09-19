import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export interface UploadResult {
  success: boolean;
  file_url?: string;
  file_path?: string;
  error?: string;
}

/**
 * Storage 전용 클라이언트 (Service Role Key로 RLS 우회)
 */
function createStorageClient() {
  console.log('Storage 클라이언트 생성 중 (Service Role Key 사용)...');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('Supabase URL:', url ? 'OK' : 'Missing');
  console.log(
    'Service Role Key:',
    serviceKey ? `OK (${serviceKey.substring(0, 10)}...)` : 'Missing'
  );

  if (!url || !serviceKey) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  }

  const client = createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('Storage 클라이언트 생성 완료');
  return client;
}

/**
 * 파일명을 안전한 형태로 변환
 */
function sanitizeFileName(fileName: string): string {
  // 파일 확장자 분리
  const lastDotIndex = fileName.lastIndexOf('.');
  const name =
    lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
  const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : '';

  // 한글, 특수문자, 공백을 제거하고 영문, 숫자, 하이픈, 언더스코어만 허용
  const sanitizedName = name
    .replace(/[^\w\-_.]/g, '') // 영문, 숫자, 하이픈, 언더스코어, 점만 허용
    .replace(/\s+/g, '_') // 공백을 언더스코어로 변환
    .toLowerCase(); // 소문자로 변환

  // 빈 문자열인 경우 기본값 사용
  const finalName = sanitizedName || 'document';

  return `${finalName}${extension}`;
}

/**
 * Supabase Storage 버킷이 존재하는지 확인하고 없으면 생성
 */
async function ensureBucketExists(
  bucket: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createStorageClient();

    // 버킷 목록 조회해서 존재하는지 확인
    console.log(`버킷 '${bucket}' 존재 여부 확인 중...`);
    const { data: buckets, error: listError } =
      await supabase.storage.listBuckets();

    if (listError) {
      console.error('버킷 목록 조회 실패:', listError);
      return { success: false, error: listError.message };
    }

    console.log(
      '조회된 버킷 목록:',
      buckets?.map(b => ({ name: b.name, public: b.public })) || []
    );
    const bucketExists = buckets?.some(b => b.name === bucket);
    console.log(`버킷 '${bucket}' 존재 여부:`, bucketExists);

    if (bucketExists) {
      console.log(`버킷 '${bucket}'이 이미 존재합니다.`);
      return { success: true };
    }

    // 버킷이 없으면 직접 파일 목록 조회로 존재 여부 재확인
    console.log(`버킷 목록에서 찾을 수 없어 직접 확인 시도 중: '${bucket}'`);
    const { data: files, error: listFilesError } = await supabase.storage
      .from(bucket)
      .list('', { limit: 1 });

    if (!listFilesError) {
      console.log(`버킷 '${bucket}'이 존재합니다 (직접 확인으로 감지).`);
      return { success: true };
    }

    console.log(`버킷 '${bucket}' 직접 확인 결과:`, listFilesError.message);

    // 실제로 버킷이 없는 경우만 생성 시도
    if (listFilesError.message.includes('Bucket not found')) {
      console.log(`'${bucket}' 버킷을 생성합니다...`);
      const { error: createError } = await supabase.storage.createBucket(
        bucket,
        {
          public: false, // 비공개 버킷으로 생성
          allowedMimeTypes: [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
          ],
          fileSizeLimit: 10 * 1024 * 1024, // 10MB
        }
      );

      if (createError) {
        console.error('버킷 생성 실패:', createError);
        // 이미 존재한다는 에러인 경우 성공으로 처리
        if (
          createError.message.includes('already exists') ||
          createError.message.includes('Duplicate')
        ) {
          console.log(
            `버킷 '${bucket}'이 이미 존재합니다 (생성 시도 결과로 확인).`
          );
          return { success: true };
        }
        return {
          success: false,
          error: `버킷 생성에 실패했습니다: ${createError.message}`,
        };
      }

      console.log(`'${bucket}' 버킷이 성공적으로 생성되었습니다.`);
      return { success: true };
    } else {
      // 다른 에러인 경우 버킷은 존재하지만 접근에 문제가 있을 수 있음
      console.log(
        `버킷 '${bucket}' 접근 시 알 수 없는 에러:`,
        listFilesError.message
      );
      return { success: true }; // 버킷은 존재한다고 가정하고 진행
    }
  } catch (error) {
    console.error('버킷 확인/생성 중 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    };
  }
}

/**
 * Supabase Storage에 파일 업로드
 */
export async function uploadFile(
  file: File,
  bucket: string = 'fund-documents',
  folder?: string
): Promise<UploadResult> {
  try {
    const supabase = createStorageClient();

    // 버킷 존재 확인 및 생성
    const bucketResult = await ensureBucketExists(bucket);
    if (!bucketResult.success) {
      return {
        success: false,
        error: bucketResult.error || '버킷 확인/생성에 실패했습니다.',
      };
    }

    // 파일명 생성 (타임스탬프 + UUID 일부 + 안전한 파일명)
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const safeName = sanitizeFileName(file.name);
    const fileName = `${timestamp}-${randomId}-${safeName}`;

    // 폴더 경로 설정
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    // 파일 업로드 시도
    console.log(`파일 업로드 시도: ${filePath} (크기: ${file.size} bytes)`);
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('파일 업로드 실패:', error);
      console.error('에러 상세:', {
        message: error.message,
        name: error.name,
        statusCode: (error as any).statusCode,
        status: (error as any).status,
      });
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('파일 업로드 성공:', data);

    // 비공개 버킷이므로 공개 URL 대신 파일 경로를 저장하고 나중에 signed URL 사용
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      success: true,
      file_url: urlData.publicUrl, // 파일 경로 식별용으로만 사용
      file_path: data.path,
    };
  } catch (error) {
    console.error('파일 업로드 중 오류:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '알 수 없는 오류가 발생했습니다',
    };
  }
}

/**
 * Supabase Storage에서 파일 삭제
 */
export async function deleteFile(
  filePath: string,
  bucket: string = 'fund-documents'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createStorageClient();

    const { error } = await supabase.storage.from(bucket).remove([filePath]);

    if (error) {
      console.error('파일 삭제 실패:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('파일 삭제 중 오류:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '알 수 없는 오류가 발생했습니다',
    };
  }
}

/**
 * 서명된 다운로드 URL 생성 (비공개 파일용)
 */
export async function createSignedUrl(
  filePath: string,
  expiresIn: number = 3600, // 1시간
  bucket: string = 'fund-documents'
): Promise<{ success: boolean; signedUrl?: string; error?: string }> {
  try {
    const supabase = createStorageClient();

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('서명된 URL 생성 실패:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      signedUrl: data.signedUrl,
    };
  } catch (error) {
    console.error('서명된 URL 생성 중 오류:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '알 수 없는 오류가 발생했습니다',
    };
  }
}
