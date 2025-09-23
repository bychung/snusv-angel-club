'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  COMPANY_DOCUMENT_CATEGORY_NAMES,
  CompanyDocumentCategory,
  formatFileSize,
  getMaxFileSize,
  isAllowedFileType,
} from '@/types/company-documents';
import { AlertCircle, CheckCircle, FileText, Upload, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface CompanyDocumentUploadModalProps {
  isOpen: boolean;
  companyId: string;
  companyName: string;
  onClose: () => void;
  onUploadComplete: () => void;
}

interface UploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
}

export default function CompanyDocumentUploadModal({
  isOpen,
  companyId,
  companyName,
  onClose,
  onUploadComplete,
}: CompanyDocumentUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<CompanyDocumentCategory | ''>('');
  const [uploadState, setUploadState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
    success: false,
  });

  const resetState = () => {
    setSelectedFile(null);
    setCategory('');
    setUploadState({
      uploading: false,
      progress: 0,
      error: null,
      success: false,
    });
  };

  const handleClose = () => {
    if (!uploadState.uploading) {
      resetState();
      onClose();
    }
  };

  const validateFile = (file: File): string | null => {
    const maxSize = getMaxFileSize();
    if (file.size > maxSize) {
      return `파일 크기가 너무 큽니다. 최대 ${Math.round(
        maxSize / 1024 / 1024
      )}MB까지 업로드 가능합니다.`;
    }

    if (!isAllowedFileType(file.type)) {
      return '지원하지 않는 파일 형식입니다. PDF, PPT, DOC, XLS, 이미지 파일만 업로드 가능합니다.';
    }

    // 파일명 검증 (특수문자 제한)
    const invalidChars = /[<>:"/\\|?*]/g;
    if (invalidChars.test(file.name)) {
      return '파일명에 특수문자가 포함되어 있습니다.';
    }

    return null;
  };

  const handleFileDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const error = validateFile(file);

      if (error) {
        setUploadState(prev => ({ ...prev, error }));
        return;
      }

      setSelectedFile(file);
      setUploadState(prev => ({ ...prev, error: null }));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        ['.pptx'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
        '.xlsx',
      ],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxFiles: 1,
    disabled: uploadState.uploading,
  });

  const handleUpload = async () => {
    if (!selectedFile || !category) {
      setUploadState(prev => ({
        ...prev,
        error: '파일과 카테고리를 모두 선택해주세요.',
      }));
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
      formData.append('file', selectedFile);
      formData.append('category', category);

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
        if (xhr.status === 201) {
          setUploadState(prev => ({
            ...prev,
            uploading: false,
            success: true,
            progress: 100,
          }));
          onUploadComplete();

          // 3초 후 자동으로 모달 닫기
          setTimeout(() => {
            handleClose();
          }, 2000);
        } else {
          const errorMsg = '업로드에 실패했습니다';
          setUploadState(prev => ({
            ...prev,
            uploading: false,
            error: errorMsg,
          }));
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
      };

      // 요청 전송
      xhr.open('POST', `/api/admin/companies/${companyId}/documents`);
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
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setUploadState(prev => ({ ...prev, error: null }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {companyName} 문서 업로드
          </DialogTitle>
          <DialogDescription>
            회사 문서를 업로드합니다. 파일 형식과 크기를 확인해 주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 카테고리 선택 */}
          <div className="space-y-2">
            <Label htmlFor="category">문서 카테고리 *</Label>
            <Select
              value={category}
              onValueChange={(value: CompanyDocumentCategory) =>
                setCategory(value)
              }
              disabled={uploadState.uploading}
            >
              <SelectTrigger>
                <SelectValue placeholder="카테고리를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(CompanyDocumentCategory).map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {COMPANY_DOCUMENT_CATEGORY_NAMES[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 파일 업로드 영역 */}
          <div className="space-y-2">
            <Label>파일 선택 *</Label>
            {!uploadState.success ? (
              <Card className="border-2 border-dashed">
                <CardContent className="p-4">
                  {!selectedFile ? (
                    <div
                      {...getRootProps()}
                      className={`
                        flex flex-col items-center justify-center min-h-[120px] cursor-pointer
                        transition-colors rounded-lg p-4
                        ${
                          isDragActive
                            ? 'bg-blue-50 border-blue-300'
                            : 'hover:bg-gray-50'
                        }
                        ${
                          uploadState.uploading
                            ? 'cursor-not-allowed opacity-50'
                            : ''
                        }
                      `}
                    >
                      <input {...getInputProps()} />
                      <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm font-medium text-gray-700 text-center">
                        {isDragActive
                          ? '파일을 여기에 놓으세요'
                          : '파일을 드래그하거나 클릭하여 선택'}
                      </p>
                      <p className="text-xs text-gray-500 text-center mt-1">
                        PDF, PPT, DOC, XLS, 이미지 파일 (최대 30MB)
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-2 flex-1">
                          <FileText className="h-4 w-4 text-blue-500" />
                          <div className="flex-1">
                            <p className="text-sm font-medium truncate">
                              {selectedFile.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(selectedFile.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={removeFile}
                          disabled={uploadState.uploading}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* 업로드 진행률 */}
                      {uploadState.uploading && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>업로드 중...</span>
                            <span>{uploadState.progress}%</span>
                          </div>
                          <Progress value={uploadState.progress} />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="text-center space-y-3 py-6">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
                <div className="space-y-1">
                  <p className="text-lg font-medium text-green-700">
                    업로드 완료!
                  </p>
                  <p className="text-sm text-gray-500">
                    문서가 성공적으로 업로드되었습니다.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 에러 메시지 */}
          {uploadState.error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <p className="text-sm text-red-700">{uploadState.error}</p>
              </div>
            </div>
          )}

          {/* 버튼들 */}
          {!uploadState.success && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={uploadState.uploading}
              >
                취소
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !category || uploadState.uploading}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {uploadState.uploading ? '업로드 중...' : '업로드'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
