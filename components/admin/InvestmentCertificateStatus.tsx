'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DocumentWithUploader } from '@/lib/admin/documents';
import { Download, FileText, History, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';

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

interface InvestmentCertificateStatusProps {
  fundId: string;
  onRefresh?: () => void;
}

export default function InvestmentCertificateStatus({
  fundId,
  onRefresh,
}: InvestmentCertificateStatusProps) {
  const [memberStatuses, setMemberStatuses] = useState<
    MemberCertificateStatus[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] =
    useState<MemberCertificateStatus | null>(null);
  const [memberHistory, setMemberHistory] = useState<DocumentWithUploader[]>(
    []
  );
  const [historyLoading, setHistoryLoading] = useState(false);

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

      // 파일 다운로드
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

      // 목록 새로고침
      handleRefresh();
    } catch (err) {
      console.error('삭제 실패:', err);
      alert(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    }
  };

  const handleMemberClick = (member: MemberCertificateStatus) => {
    setSelectedMember(member);
    fetchMemberHistory(member.member.id);
  };

  useEffect(() => {
    fetchStatus();
  }, [fundId]);

  const handleRefresh = () => {
    fetchStatus();
    onRefresh?.();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>투자확인서 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">로딩 중...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>투자확인서 현황</CardTitle>
        </CardHeader>
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>투자확인서 현황</CardTitle>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          새로고침
        </Button>
      </CardHeader>
      <CardContent>
        {memberStatuses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            등록된 조합원이 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {memberStatuses.map(memberStatus => (
              <Card key={memberStatus.member.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <User className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900">
                            {memberStatus.member.name}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {memberStatus.member.email}
                        </p>
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {memberStatus.certificates.length === 0 ? (
                              <Badge
                                variant="outline"
                                className="text-gray-500"
                              >
                                투자확인서 없음
                              </Badge>
                            ) : (
                              memberStatus.certificates.map(cert => (
                                <div
                                  key={cert.year || 'no-year'}
                                  className="flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded border border-blue-200"
                                >
                                  {/* 다운로드 부분 */}
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      if (cert.latest_document) {
                                        handleDownload(
                                          memberStatus.member.id,
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
                                      {cert.year || '연도 미지정'} (
                                      {cert.document_count})
                                    </span>
                                  </button>

                                  {/* 삭제 버튼 */}
                                  {cert.latest_document && (
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        handleDelete(
                                          cert.latest_document!.id,
                                          memberStatus.member.name,
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
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMemberClick(memberStatus)}
                            title="히스토리 보기"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>
                              {selectedMember?.member.name}님의 투자확인서
                              히스토리
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
                                              <span>
                                                연도:{' '}
                                                {doc.document_year || '미지정'}
                                              </span>
                                              <span>
                                                업로드:{' '}
                                                {new Date(
                                                  doc.created_at
                                                ).toLocaleDateString('ko-KR')}
                                              </span>
                                              <span>
                                                업로더:{' '}
                                                {doc.uploader?.name ||
                                                  '알 수 없음'}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleDownload(
                                              selectedMember!.member.id,
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
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
