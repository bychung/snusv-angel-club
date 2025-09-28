import { EmailAttachment } from '@/types/email';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * 피치덱을 Supabase Storage에서 첨부파일로 다운로드합니다.
 */
export async function downloadPitchDeckAsAttachment(
  pitchDeckPath: string,
  originalFilename?: string
): Promise<EmailAttachment | null> {
  try {
    console.log(`Supabase Storage에서 피치덱 다운로드 시도: ${pitchDeckPath}`);

    // Service Role 클라이언트 생성
    const serviceClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ir-decks 버킷에서 파일 다운로드
    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from('ir-decks')
      .download(pitchDeckPath);

    if (downloadError) {
      console.error('피치덱 다운로드 오류:', downloadError);
      return null;
    }

    if (!fileData) {
      console.error('피치덱 파일을 찾을 수 없습니다:', pitchDeckPath);
      return null;
    }

    // 파일을 Buffer로 변환
    const buffer = await fileData.arrayBuffer();
    const content = Buffer.from(buffer);

    // 파일 크기 체크 (10MB 제한)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (content.length > maxSize) {
      console.error(
        `파일 크기가 너무 큽니다: ${content.length} bytes (최대: ${maxSize} bytes)`
      );
      return null;
    }

    // 파일명 결정 - 원본 파일명이 있으면 사용, 없으면 경로에서 추출
    const filename =
      originalFilename ||
      (pitchDeckPath.includes('/')
        ? pitchDeckPath.substring(pitchDeckPath.lastIndexOf('/') + 1)
        : pitchDeckPath);

    // Content Type 결정 (확장자 기반)
    const extension = filename.includes('.')
      ? filename.substring(filename.lastIndexOf('.'))
      : '.pdf';

    let contentType = 'application/octet-stream';
    switch (extension.toLowerCase()) {
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.pptx':
        contentType =
          'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        break;
      case '.ppt':
        contentType = 'application/vnd.ms-powerpoint';
        break;
      case '.docx':
        contentType =
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case '.doc':
        contentType = 'application/msword';
        break;
      default:
        // fileData의 type 속성이 있다면 사용
        contentType = fileData.type || 'application/octet-stream';
    }

    console.log(
      `피치덱 다운로드 성공: ${filename} (${content.length} bytes, ${contentType})`
    );

    return {
      filename,
      content,
      contentType,
    };
  } catch (error) {
    console.error('피치덱 다운로드 중 오류 발생:', error);
    return null;
  }
}

/**
 * 지원되는 피치덱 파일 형식인지 확인합니다.
 */
export function isSupportedPitchDeckFormat(contentType: string): boolean {
  const supportedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'application/vnd.ms-powerpoint', // .ppt
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'image/jpeg',
    'image/png',
    'image/gif',
  ];

  return supportedTypes.includes(contentType);
}
