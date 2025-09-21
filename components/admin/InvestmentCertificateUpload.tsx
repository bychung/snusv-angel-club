'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DocumentCategory } from '@/types/documents';
import { AlertCircle, CheckCircle, FileText, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface FundMember {
  id: string;
  name: string;
  email: string;
}

interface CertificateInfo {
  year?: number;
  document_count: number;
}

interface MemberCertificateStatus {
  member: FundMember;
  certificates: CertificateInfo[];
}

interface InvestmentCertificateUploadProps {
  fundId: string;
  members: FundMember[];
  memberStatuses?: MemberCertificateStatus[]; // 기존 투자증명서 데이터
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

export default function InvestmentCertificateUpload({
  fundId,
  members,
  memberStatuses = [],
  onUploadComplete,
  onUploadError,
  disabled = false,
}: InvestmentCertificateUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
    success: false,
  });

  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [documentYear, setDocumentYear] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i);

  // 기본 연도 계산 함수
  const calculateDefaultYear = useCallback(
    (memberId: string): string => {
      if (!memberId) return '';

      const memberStatus = memberStatuses.find(
        status => status.member.id === memberId
      );
      if (!memberStatus) {
        // 해당 조합원의 데이터가 없으면 현재 연도 - 1을 기본값으로
        return (currentYear - 1).toString();
      }

      // 기존 투자증명서의 연도들을 수집 (undefined는 제외)
      const existingYears = memberStatus.certificates
        .map(cert => cert.year)
        .filter((year): year is number => year !== undefined)
        .sort((a, b) => b - a); // 내림차순 정렬

      // 현재 연도 - 1부터 시작해서 존재하지 않는 첫 번째 연도를 찾기
      let defaultYear = currentYear - 1;
      while (existingYears.includes(defaultYear)) {
        defaultYear++;
      }

      return defaultYear.toString();
    },
    [memberStatuses, currentYear]
  );

  // selectedMemberId나 memberStatuses가 변경될 때 기본 연도 계산
  useEffect(() => {
    if (selectedMemberId) {
      const newDefaultYear = calculateDefaultYear(selectedMemberId);
      setDocumentYear(newDefaultYear);
    }
  }, [selectedMemberId, calculateDefaultYear]);

  const handleUpload = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      if (!selectedMemberId) {
        onUploadError('조합원을 선택해주세요.');
        return;
      }

      const file = files[0]; // 한 번에 하나의 파일만 업로드

      // 파일 검증 (관리자용 - 30MB)
      const maxSize = 30 * 1024 * 1024; // 30MB
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
      ];

      if (file.size > maxSize) {
        onUploadError(
          `파일 크기가 너무 큽니다. 최대 ${Math.round(
            maxSize / 1024 / 1024
          )}MB까지 업로드 가능합니다.`
        );
        return;
      }

      if (!allowedTypes.includes(file.type)) {
        onUploadError(
          `지원하지 않는 파일 형식입니다. 지원 형식: ${allowedTypes
            .map(type => type.split('/')[1])
            .join(', ')}`
        );
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
        formData.append('memberId', selectedMemberId);
        if (documentYear) {
          formData.append('documentYear', documentYear);
        }

        // 업로드 진행 시뮬레이션
        const progressInterval = setInterval(() => {
          setUploadState(prev => ({
            ...prev,
            progress: Math.min(prev.progress + 10, 90),
          }));
        }, 100);

        const response = await fetch(
          `/api/admin/funds/${fundId}/documents/${DocumentCategory.INVESTMENT_CERTIFICATE}`,
          {
            method: 'POST',
            body: formData,
          }
        );

        clearInterval(progressInterval);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '업로드에 실패했습니다.');
        }

        setUploadState({
          uploading: false,
          progress: 100,
          error: null,
          success: true,
        });

        // 성공 상태를 잠시 표시한 후 리셋
        setTimeout(() => {
          setUploadState({
            uploading: false,
            progress: 0,
            error: null,
            success: false,
          });
          setSelectedFiles([]);
        }, 2000);

        onUploadComplete();
      } catch (error) {
        setUploadState({
          uploading: false,
          progress: 0,
          error: error instanceof Error ? error.message : '알 수 없는 오류',
          success: false,
        });

        onUploadError(
          error instanceof Error ? error.message : '업로드에 실패했습니다.'
        );
      }
    },
    [fundId, selectedMemberId, documentYear, onUploadComplete, onUploadError]
  );

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setSelectedFiles(acceptedFiles);
    setUploadState(prev => ({ ...prev, error: null, success: false }));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    disabled: disabled || uploadState.uploading,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
  });

  const handleRemoveFile = () => {
    setSelectedFiles([]);
    setUploadState(prev => ({ ...prev, error: null, success: false }));
  };

  const handleSubmit = () => {
    if (selectedFiles.length > 0) {
      handleUpload(selectedFiles);
    }
  };

  const selectedMember = members.find(m => m.id === selectedMemberId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>투자확인서 업로드</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 조합원 선택 */}
        <div className="space-y-2">
          <Label htmlFor="member-select">조합원 선택</Label>
          <Select
            value={selectedMemberId}
            onValueChange={setSelectedMemberId}
            disabled={disabled || uploadState.uploading}
          >
            <SelectTrigger>
              <SelectValue placeholder="조합원을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {members.map(member => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name} ({member.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 연도 선택 (선택사항) */}
        <div className="space-y-2">
          <Label htmlFor="year-select">연도 (선택사항)</Label>
          <div className="flex space-x-2">
            <Select
              value={documentYear}
              onValueChange={setDocumentYear}
              disabled={disabled || uploadState.uploading}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="연도" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {documentYear && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDocumentYear('')}
                disabled={disabled || uploadState.uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* 파일 드롭존 */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : uploadState.error
              ? 'border-red-300 bg-red-50'
              : uploadState.success
              ? 'border-green-300 bg-green-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${
            disabled || uploadState.uploading
              ? 'cursor-not-allowed opacity-50'
              : ''
          }`}
        >
          <input {...getInputProps()} />

          {selectedFiles.length > 0 ? (
            <div className="space-y-2">
              <FileText className="mx-auto h-8 w-8 text-blue-500" />
              <div className="text-sm font-medium text-gray-900">
                {selectedFiles[0].name}
              </div>
              <div className="text-xs text-gray-500">
                {(selectedFiles[0].size / (1024 * 1024)).toFixed(1)} MB
              </div>
              {!uploadState.uploading && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveFile}
                  className="mt-2"
                >
                  파일 제거
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="mx-auto h-8 w-8 text-gray-400" />
              <div className="text-sm font-medium text-gray-900">
                {isDragActive
                  ? '파일을 여기에 놓으세요'
                  : '파일을 드래그하거나 클릭하여 업로드'}
              </div>
              <div className="text-xs text-gray-500">
                PDF, JPG, PNG, WEBP (최대 30MB)
              </div>
            </div>
          )}
        </div>

        {/* 업로드 진행 상태 */}
        {uploadState.uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">업로드 중...</span>
              <span className="text-sm text-gray-500">
                {uploadState.progress}%
              </span>
            </div>
            <Progress value={uploadState.progress} className="w-full" />
          </div>
        )}

        {/* 에러 메시지 */}
        {uploadState.error && (
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{uploadState.error}</span>
          </div>
        )}

        {/* 성공 메시지 */}
        {uploadState.success && (
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">
              {selectedMember?.name}님의{' '}
              {documentYear ? `${documentYear}년 ` : ''}투자확인서가 성공적으로
              업로드되었습니다.
            </span>
          </div>
        )}

        {/* 업로드 버튼 */}
        <Button
          onClick={handleSubmit}
          disabled={
            !selectedMemberId ||
            selectedFiles.length === 0 ||
            uploadState.uploading ||
            disabled
          }
          className="w-full"
        >
          {uploadState.uploading ? '업로드 중...' : '투자확인서 업로드'}
        </Button>
      </CardContent>
    </Card>
  );
}
