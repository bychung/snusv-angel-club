'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  downloadExcelTemplate,
  ExcelRowData,
  parseExcelFile,
  validateExcelData,
  ValidationResult,
} from '@/lib/excel-utils';
import {
  AlertTriangle,
  CheckCircle,
  Download,
  FileText,
  Loader2,
  Upload,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';

interface BulkUploadModalProps {
  isOpen: boolean;
  fundId: string;
  fundName: string;
  onClose: () => void;
  onUploadComplete: () => void;
}

interface UploadState {
  file: File | null;
  parsedData: ExcelRowData[];
  validationResults: ValidationResult[];
  isProcessing: boolean;
  isUploading: boolean;
  progress: number;
  showResults: boolean;
}

export default function BulkUploadModal({
  isOpen,
  fundId,
  fundName,
  onClose,
  onUploadComplete,
}: BulkUploadModalProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    parsedData: [],
    validationResults: [],
    isProcessing: false,
    isUploading: false,
    progress: 0,
    showResults: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // 템플릿 다운로드
  const handleDownloadTemplate = () => {
    try {
      downloadExcelTemplate(fundName);
    } catch (error) {
      setError('템플릿 다운로드 중 오류가 발생했습니다.');
    }
  };

  // 파일 드래그 앤 드롭 처리
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // 파일 선택/업로드 처리
  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // 파일 형식 검증
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];

    if (!validTypes.includes(file.type)) {
      setError('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.');
      return;
    }

    // 파일 크기 검증 (30MB)
    if (file.size > 30 * 1024 * 1024) {
      setError('파일 크기는 30MB 이하여야 합니다.');
      return;
    }

    setError(null);
    setUploadState(prev => ({ ...prev, file, isProcessing: true }));

    try {
      // 파일 파싱
      const parsedData = await parseExcelFile(file);

      if (parsedData.length === 0) {
        setError('파일에 데이터가 없습니다.');
        setUploadState(prev => ({ ...prev, isProcessing: false }));
        return;
      }

      if (parsedData.length > 1000) {
        setError('한 번에 최대 1,000개의 데이터까지 처리할 수 있습니다.');
        setUploadState(prev => ({ ...prev, isProcessing: false }));
        return;
      }

      // 데이터 검증
      const validationResults = validateExcelData(parsedData);

      setUploadState(prev => ({
        ...prev,
        parsedData,
        validationResults,
        isProcessing: false,
        showResults: true,
      }));
    } catch (error: any) {
      setError(error.message);
      setUploadState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  // 파일 입력 처리
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // 업로드 실행
  const handleUpload = async () => {
    const validData = uploadState.validationResults
      .filter(result => result.isValid && result.data)
      .map(result => result.data!);

    if (validData.length === 0) {
      setError('업로드할 유효한 데이터가 없습니다.');
      return;
    }

    setUploadState(prev => ({ ...prev, isUploading: true, progress: 0 }));
    setError(null);

    try {
      // API 호출로 데이터 업로드
      const response = await fetch(`/api/admin/funds/${fundId}/bulk-upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          members: validData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '업로드 중 오류가 발생했습니다.');
      }

      const result = await response.json();

      setUploadState(prev => ({ ...prev, progress: 100 }));

      // 성공 처리
      setTimeout(() => {
        onUploadComplete();
        handleClose();
      }, 1000);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setUploadState(prev => ({ ...prev, isUploading: false }));
    }
  };

  // 모달 닫기
  const handleClose = () => {
    setUploadState({
      file: null,
      parsedData: [],
      validationResults: [],
      isProcessing: false,
      isUploading: false,
      progress: 0,
      showResults: false,
    });
    setError(null);
    onClose();
  };

  // 검증 결과 요약
  const getValidationSummary = () => {
    const total = uploadState.validationResults.length;
    const valid = uploadState.validationResults.filter(r => r.isValid).length;
    const invalid = total - valid;

    return { total, valid, invalid };
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            조합원 일괄 업로드 - {fundName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 1. 템플릿 다운로드 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Download className="h-5 w-5" />
                1. 엑셀 템플릿 다운로드
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                아래 버튼을 클릭하여 조합원 정보 입력용 엑셀 템플릿을
                다운로드하세요. 템플릿에는 샘플 데이터와 입력 형식이 포함되어
                있습니다.
              </p>
              <Button onClick={handleDownloadTemplate} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                템플릿 다운로드
              </Button>
            </CardContent>
          </Card>

          {/* 2. 파일 업로드 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                2. 엑셀 파일 업로드
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {uploadState.isProcessing ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p className="text-sm text-gray-600">
                      파일을 처리하고 있습니다...
                    </p>
                  </div>
                ) : uploadState.file ? (
                  <div className="flex flex-col items-center gap-4">
                    <FileText className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="font-medium">{uploadState.file.name}</p>
                      <p className="text-sm text-gray-600">
                        {(uploadState.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setUploadState(prev => ({
                          ...prev,
                          file: null,
                          showResults: false,
                        }))
                      }
                    >
                      다른 파일 선택
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-medium">
                        파일을 드래그하여 놓거나
                      </p>
                      <label className="mt-2">
                        <Button variant="outline" asChild>
                          <span>
                            파일 선택
                            <input
                              type="file"
                              className="hidden"
                              accept=".xlsx,.xls"
                              onChange={handleFileInputChange}
                            />
                          </span>
                        </Button>
                      </label>
                    </div>
                    <p className="text-sm text-gray-500">
                      지원 형식: .xlsx, .xls (최대 30MB, 1,000행)
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 3. 검증 결과 */}
          {uploadState.showResults && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  3. 검증 결과
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 요약 */}
                  <div className="grid grid-cols-3 gap-4">
                    {(() => {
                      const { total, valid, invalid } = getValidationSummary();
                      return (
                        <>
                          <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-gray-700">
                              {total}
                            </div>
                            <div className="text-sm text-gray-600">전체</div>
                          </div>
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {valid}
                            </div>
                            <div className="text-sm text-green-600">성공</div>
                          </div>
                          <div className="text-center p-4 bg-red-50 rounded-lg">
                            <div className="text-2xl font-bold text-red-600">
                              {invalid}
                            </div>
                            <div className="text-sm text-red-600">오류</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* 오류 목록 */}
                  {uploadState.validationResults.some(r => !r.isValid) && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-600 flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        오류 목록
                      </h4>
                      <div className="max-h-60 overflow-y-auto border rounded-md">
                        {uploadState.validationResults
                          .filter(result => !result.isValid)
                          .map((result, index) => (
                            <div
                              key={index}
                              className="p-3 border-b last:border-b-0"
                            >
                              <div className="font-medium text-sm">
                                {result.rowIndex}행:
                              </div>
                              <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                                {result.errors.map((error, errorIndex) => (
                                  <li key={errorIndex}>{error}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 에러 메시지 */}
          {error && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 업로드 진행률 */}
          {uploadState.isUploading && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>업로드 진행중...</span>
                    <span>{uploadState.progress}%</span>
                  </div>
                  <Progress value={uploadState.progress} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={uploadState.isUploading}
          >
            취소
          </Button>
          {uploadState.showResults && getValidationSummary().valid > 0 && (
            <Button
              onClick={handleUpload}
              disabled={uploadState.isUploading}
              variant="default"
            >
              {uploadState.isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  업로드 중...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {getValidationSummary().valid}명 업로드
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
