'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DocumentWithUploader } from '@/lib/admin/documents';
import { DocumentCategory } from '@/types/documents';
import {
  AlertCircle,
  CheckCircle,
  Download,
  FileText,
  History,
  Upload,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface FundMember {
  id: string;
  name: string;
  email: string;
  entity_type: 'individual' | 'corporate';
}

interface MemberCertificateStatus {
  member: {
    id: string;
    name: string;
    email: string;
  };
  certificates: Array<{
    year?: number;
    document_count: number;
    latest_document?: DocumentWithUploader;
  }>;
}

interface InvestmentCertificateManagerProps {
  fundId: string;
  members: FundMember[];
  onRefresh?: () => void;
  refreshKey?: number;
}

interface UploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
}

export default function InvestmentCertificateManager({
  fundId,
  members,
  onRefresh,
  refreshKey,
}: InvestmentCertificateManagerProps) {
  const [memberStatuses, setMemberStatuses] = useState<
    MemberCertificateStatus[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 업로드 관련 상태
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FundMember | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
    success: false,
  });
  const [documentYear, setDocumentYear] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // 히스토리 관련 상태
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [memberHistory, setMemberHistory] = useState<DocumentWithUploader[]>(
    []
  );
  const [historyLoading, setHistoryLoading] = useState(false);

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

  // 현황 데이터 조회
  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/admin/funds/${fundId}/investment-certificates`
      );

      if (!response.ok) {
        throw new Error('투자확인서 현황을 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      setMemberStatuses(data.memberStatuses || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      );
    } finally {
      setLoading(false);
    }
  };

  // 조합원별 히스토리 조회
  const fetchMemberHistory = async (memberId: string) => {
    try {
      setHistoryLoading(true);
      const response = await fetch(
        `/api/admin/funds/${fundId}/investment-certificates/members/${memberId}`
      );

      if (!response.ok) {
        throw new Error(
          '조합원 투자확인서 히스토리를 불러오는데 실패했습니다.'
        );
      }

      const data = await response.json();
      setMemberHistory(data.certificates || []);
    } catch (err) {
      console.error('히스토리 조회 실패:', err);
      setMemberHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // 파일 다운로드
  const handleDownload = async (
    memberId: string,
    year?: number,
    documentId?: string
  ) => {
    try {
      const params = new URLSearchParams({
        memberId,
        ...(year && { year: year.toString() }),
        ...(documentId && { documentId }),
      });

      const response = await fetch(
        `/api/funds/${fundId}/investment-certificates/download?${params}`
      );

      if (!response.ok) {
        throw new Error('파일 다운로드에 실패했습니다.');
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') ||
          'investment-certificate.pdf'
        : 'investment-certificate.pdf';

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = decodeURIComponent(filename);
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('다운로드 실패:', err);
      alert(err instanceof Error ? err.message : '다운로드에 실패했습니다.');
    }
  };

  // 파일 삭제
  const handleDelete = async (
    documentId: string,
    memberName: string,
    year?: number
  ) => {
    const confirmMessage = `${memberName}님의 ${
      year ? `${year}년 ` : ''
    }투자확인서를 삭제하시겠습니까?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/funds/${fundId}/investment-certificates/documents/${documentId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '삭제에 실패했습니다.');
      }

      alert('투자확인서가 성공적으로 삭제되었습니다.');
      handleRefresh();
    } catch (err) {
      console.error('삭제 실패:', err);
      alert(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    }
  };

  // 업로드 처리
  const handleUpload = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || !selectedMember) return;

      const file = files[0];
      const maxSize = 30 * 1024 * 1024; // 30MB
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
      ];

      if (file.size > maxSize) {
        setUploadState(prev => ({
          ...prev,
          error: `파일 크기가 너무 큽니다. 최대 ${Math.round(
            maxSize / 1024 / 1024
          )}MB까지 업로드 가능합니다.`,
        }));
        return;
      }

      if (!allowedTypes.includes(file.type)) {
        setUploadState(prev => ({
          ...prev,
          error: `지원하지 않는 파일 형식입니다. 지원 형식: ${allowedTypes
            .map(type => type.split('/')[1])
            .join(', ')}`,
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
        formData.append('file', file);
        formData.append('memberId', selectedMember.id);
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

        // 성공 후 정리
        setTimeout(() => {
          setUploadState({
            uploading: false,
            progress: 0,
            error: null,
            success: false,
          });
          setSelectedFiles([]);
          setDocumentYear('');
          setIsUploadModalOpen(false);
          handleRefresh();
        }, 2000);
      } catch (error) {
        setUploadState({
          uploading: false,
          progress: 0,
          error: error instanceof Error ? error.message : '알 수 없는 오류',
          success: false,
        });
      }
    },
    [fundId, selectedMember, documentYear, onRefresh]
  );

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setSelectedFiles(acceptedFiles);
    setUploadState(prev => ({ ...prev, error: null, success: false }));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    disabled: uploadState.uploading,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
  });

  // 업로드 모달 열기
  const openUploadModal = (member: FundMember) => {
    setSelectedMember(member);
    setIsUploadModalOpen(true);
    setUploadState({
      uploading: false,
      progress: 0,
      error: null,
      success: false,
    });
    setSelectedFiles([]);
    // setDocumentYear는 useEffect에서 자동으로 계산됨
  };

  // 히스토리 모달 열기
  const openHistoryModal = (member: FundMember) => {
    setSelectedMember(member);
    setIsHistoryModalOpen(true);
    fetchMemberHistory(member.id);
  };

  const handleRefresh = () => {
    fetchStatus();
    onRefresh?.();
  };

  // 조합원 현황 매핑
  const getMemberStatus = (member: FundMember): MemberCertificateStatus => {
    return (
      memberStatuses.find(status => status.member.id === member.id) || {
        member,
        certificates: [],
      }
    );
  };

  useEffect(() => {
    fetchStatus();
  }, [fundId]);

  // 외부에서 새로고침 요청 시
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      fetchStatus();
    }
  }, [refreshKey]);

  // selectedMember나 memberStatuses가 변경될 때 기본 연도 계산
  useEffect(() => {
    if (selectedMember) {
      const newDefaultYear = calculateDefaultYear(selectedMember.id);
      setDocumentYear(newDefaultYear);
    }
  }, [selectedMember, memberStatuses, calculateDefaultYear]);

  if (loading) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-8">로딩 중...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-4 text-red-600">{error}</div>
          <Button onClick={handleRefresh} className="w-full">
            다시 시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              등록된 조합원이 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>조합원</TableHead>
                  <TableHead>현황</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members
                  .filter(member => member.entity_type === 'individual')
                  .map(member => {
                    const status = getMemberStatus(member);
                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {member.name}
                            </span>
                            <span className="text-sm text-gray-500">
                              {member.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {status.certificates.length === 0 ? (
                              <Badge
                                variant="outline"
                                className="text-gray-500"
                              >
                                없음
                              </Badge>
                            ) : (
                              status.certificates.map(cert => (
                                <div
                                  key={cert.year || 'no-year'}
                                  className="flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded border border-blue-200"
                                >
                                  <button
                                    onClick={() => {
                                      if (cert.latest_document) {
                                        handleDownload(
                                          member.id,
                                          cert.year,
                                          cert.latest_document.id
                                        );
                                      }
                                    }}
                                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                                    title="다운로드"
                                  >
                                    <Download className="h-3 w-3" />
                                    <span>
                                      {cert.year || '연도 미지정'} -{' '}
                                      {cert.latest_document?.file_name ||
                                        '파일명 없음'}
                                      {cert.document_count > 1 &&
                                        ` (${cert.document_count})`}
                                    </span>
                                  </button>
                                  {cert.latest_document && (
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        handleDelete(
                                          cert.latest_document!.id,
                                          member.name,
                                          cert.year
                                        );
                                      }}
                                      className="ml-2 text-red-500 hover:text-red-700 transition-colors"
                                      title="삭제"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openUploadModal(member)}
                              title="업로드"
                            >
                              <Upload className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openHistoryModal(member)}
                              title="히스토리"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 업로드 모달 */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedMember?.name}님 투자확인서 업로드
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* 연도 선택 */}
            <div className="space-y-2">
              <Label>연도 (선택사항)</Label>
              <div className="flex space-x-2">
                <Select
                  value={documentYear}
                  onValueChange={setDocumentYear}
                  disabled={uploadState.uploading}
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
                    disabled={uploadState.uploading}
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
                uploadState.uploading ? 'cursor-not-allowed opacity-50' : ''
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
                      onClick={() => setSelectedFiles([])}
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
                  {documentYear ? `${documentYear}년 ` : ''}투자확인서가
                  성공적으로 업로드되었습니다.
                </span>
              </div>
            )}

            {/* 업로드 버튼 */}
            <Button
              onClick={() => handleUpload(selectedFiles)}
              disabled={
                selectedFiles.length === 0 ||
                uploadState.uploading ||
                uploadState.success
              }
              className="w-full"
            >
              {uploadState.uploading
                ? '업로드 중...'
                : uploadState.success
                ? '업로드가 완료되어 곧 창이 닫힙니다.'
                : '투자확인서 업로드'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 히스토리 모달 */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedMember?.name}님의 투자확인서 히스토리
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {historyLoading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">로딩 중...</div>
              </div>
            ) : memberHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                투자확인서가 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {memberHistory.map(doc => (
                  <Card key={doc.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-blue-500" />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-900">
                              {doc.file_name}
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                              <span>연도: {doc.document_year || '미지정'}</span>
                              <span>
                                업로드:{' '}
                                {new Date(doc.created_at).toLocaleDateString(
                                  'ko-KR'
                                )}
                              </span>
                              <span>
                                업로더: {doc.uploader?.name || '알 수 없음'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleDownload(
                              selectedMember!.id,
                              doc.document_year || undefined,
                              doc.id
                            )
                          }
                          title="다운로드"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
