'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DOCUMENT_CATEGORY_NAMES, DocumentCategory } from '@/types/documents';
import { AlertCircle, CheckCircle, FileText, Upload, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface DocumentUploadProps {
  fundId: string;
  category: DocumentCategory;
  onUploadComplete: () => void;
  onUploadError: (error: string) => void;
  disabled?: boolean;
}

interface UploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
}

export default function DocumentUpload({
  fundId,
  category,
  onUploadComplete,
  onUploadError,
  disabled = false,
}: DocumentUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
    success: false,
  });

  const handleUpload = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const file = files[0]; // 한 번에 하나의 파일만 업로드

      // 파일 검증
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
      ];

      if (file.size > maxSize) {
        const errorMsg = `파일 크기가 너무 큽니다. 최대 ${Math.round(
          maxSize / 1024 / 1024
        )}MB까지 업로드 가능합니다.`;
        setUploadState(prev => ({ ...prev, error: errorMsg }));
        onUploadError(errorMsg);
        return;
      }

      if (!allowedTypes.includes(file.type)) {
        const errorMsg = `지원하지 않는 파일 형식입니다. 지원 형식: PDF, JPEG, PNG, WebP`;
        setUploadState(prev => ({ ...prev, error: errorMsg }));
        onUploadError(errorMsg);
        return;
      }

      setUploadState({
        uploading: true,
        progress: 0,
        error: null,
        success: false,
      });

      try {
        const formData = new FormData();
        formData.append('file', file);

        // XMLHttpRequest를 사용하여 업로드 진행률 추적
        const xhr = new XMLHttpRequest();

        // 업로드 진행률 추적
        xhr.upload.onprogress = event => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadState(prev => ({ ...prev, progress }));
          }
        };

        // 업로드 완료 처리
        xhr.onload = () => {
          if (xhr.status === 200) {
            setUploadState(prev => ({
              ...prev,
              uploading: false,
              success: true,
              progress: 100,
            }));
            onUploadComplete();
          } else {
            const errorMsg = '업로드에 실패했습니다';
            setUploadState(prev => ({
              ...prev,
              uploading: false,
              error: errorMsg,
            }));
            onUploadError(errorMsg);
          }
        };

        // 업로드 에러 처리
        xhr.onerror = () => {
          const errorMsg = '네트워크 오류가 발생했습니다';
          setUploadState(prev => ({
            ...prev,
            uploading: false,
            error: errorMsg,
          }));
          onUploadError(errorMsg);
        };

        // 요청 전송
        xhr.open('POST', `/api/admin/funds/${fundId}/documents/${category}`);
        xhr.send(formData);
      } catch (error) {
        const errorMsg =
          error instanceof Error
            ? error.message
            : '업로드 중 오류가 발생했습니다';
        setUploadState(prev => ({
          ...prev,
          uploading: false,
          error: errorMsg,
        }));
        onUploadError(errorMsg);
      }
    },
    [fundId, category, onUploadComplete, onUploadError]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleUpload,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxFiles: 1,
    disabled: disabled || uploadState.uploading,
  });

  const resetState = () => {
    setUploadState({
      uploading: false,
      progress: 0,
      error: null,
      success: false,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          {DOCUMENT_CATEGORY_NAMES[category]} 업로드
        </h3>
        {uploadState.success && (
          <Button variant="outline" size="sm" onClick={resetState}>
            <X className="h-4 w-4 mr-1" />
            초기화
          </Button>
        )}
      </div>

      <Card className="border-2 border-dashed">
        <CardContent className="p-6">
          {!uploadState.success ? (
            <div
              {...getRootProps()}
              className={`
                flex flex-col items-center justify-center min-h-[200px] cursor-pointer
                transition-colors rounded-lg p-6
                ${
                  isDragActive
                    ? 'bg-blue-50 border-blue-300'
                    : 'hover:bg-gray-50'
                }
                ${
                  disabled || uploadState.uploading
                    ? 'cursor-not-allowed opacity-50'
                    : ''
                }
              `}
            >
              <input {...getInputProps()} />

              {uploadState.uploading ? (
                <div className="text-center space-y-4 w-full">
                  <Upload className="h-12 w-12 mx-auto text-blue-500 animate-pulse" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      업로드 중...
                    </p>
                    <Progress value={uploadState.progress} className="w-full" />
                    <p className="text-xs text-gray-500">
                      {uploadState.progress}% 완료
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <Upload className="h-12 w-12 mx-auto text-gray-400" />
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-gray-700">
                      {isDragActive
                        ? '파일을 여기에 놓으세요'
                        : '파일을 드래그하거나 클릭하여 선택'}
                    </p>
                    <p className="text-sm text-gray-500">
                      지원 형식: PDF, JPEG, PNG, WebP (최대 10MB)
                    </p>
                  </div>
                  <Button variant="outline" className="mt-4">
                    <FileText className="h-4 w-4 mr-2" />
                    파일 선택
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center space-y-4 py-8">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <div className="space-y-2">
                <p className="text-lg font-medium text-green-700">
                  업로드가 완료되었습니다!
                </p>
                <p className="text-sm text-gray-500">
                  문서가 성공적으로 업로드되었습니다.
                </p>
              </div>
            </div>
          )}

          {uploadState.error && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <p className="text-sm text-red-700">{uploadState.error}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-gray-500">
        <p>
          • 업로드된 파일은 히스토리에 추가되며, 기존 파일을 덮어쓰지 않습니다.
        </p>
        <p>• 관리자만 파일을 업로드하고 삭제할 수 있습니다.</p>
      </div>
    </div>
  );
}
