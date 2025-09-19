/**
 * 파일 크기를 읽기 쉬운 형태로 변환
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * 파일 정보 검증
 */
export function validateFile(
  file: File,
  maxSize: number = 10 * 1024 * 1024, // 10MB
  allowedTypes: string[] = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ]
): { valid: boolean; error?: string } {
  // 파일 크기 검증
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `파일 크기가 너무 큽니다. 최대 ${Math.round(
        maxSize / 1024 / 1024
      )}MB까지 업로드 가능합니다.`,
    };
  }

  // 파일 타입 검증
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `지원하지 않는 파일 형식입니다. 지원 형식: ${allowedTypes
        .map(type => type.split('/')[1])
        .join(', ')}`,
    };
  }

  return { valid: true };
}

export interface FileInfo {
  name: string;
  size: number;
  type: string;
}
