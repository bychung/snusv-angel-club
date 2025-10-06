'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { FundDocument } from '@/types/database';
import { Download, Eye, FileText, FileX, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface GeneratedDocumentsListProps {
  fundId: string;
  fundName: string;
  documentType: string;
  refreshTrigger?: number; // 외부에서 새로고침 트리거용
}

export default function GeneratedDocumentsList({
  fundId,
  fundName,
  documentType,
  refreshTrigger = 0,
}: GeneratedDocumentsListProps) {
  const [documents, setDocuments] = useState<FundDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/admin/funds/${fundId}/documents?type=${documentType}`
      );

      if (response.ok) {
        const data = await response.json();
        // 단일 문서인 경우 배열로 변환
        const docs = data.document ? [data.document] : data.documents || [];
        setDocuments(docs);
      } else if (response.status === 404) {
        setDocuments([]);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || '문서 목록 조회 실패');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [fundId, documentType, refreshTrigger]);

  const handleDownload = async (
    documentId: string,
    templateVersion: string
  ) => {
    try {
      // 기존 LPA 생성 엔드포인트 재사용해서 다운로드
      const response = await fetch(
        `/api/admin/funds/${fundId}/documents/${documentType}/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('문서 다운로드 실패');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fundName}_${documentType.toUpperCase()}_v${templateVersion}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('문서 다운로드 오류:', err);
      alert('문서 다운로드 중 오류가 발생했습니다.');
    }
  };

  const handleViewDetails = (document: FundDocument) => {
    // TODO: 문서 상세보기 모달 구현
    console.log('문서 상세보기:', document);
    alert('문서 상세보기는 아직 구현되지 않았습니다.');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDocumentDisplayName = (type: string) => {
    switch (type) {
      case 'lpa':
        return '조합 규약(안)';
      case 'plan':
        return '결성계획서';
      default:
        return type.toUpperCase() + ' 문서';
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-700">생성된 문서</h4>
        </div>

        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 text-gray-400 animate-spin mr-2" />
          <span className="text-sm text-gray-500">문서 목록 조회 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-700">생성된 문서</h4>
        </div>

        <div className="text-center py-8 border border-dashed rounded-lg border-red-200 bg-red-50">
          <div className="text-red-600 text-sm">
            문서 목록을 불러올 수 없습니다: {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">생성된 문서</h4>
        <Badge variant="secondary">{documents.length}개</Badge>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <FileX className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">생성된 문서가 없습니다</p>
          <p className="text-xs text-gray-400 mt-1">
            위의 생성 버튼을 사용해서 문서를 생성해보세요
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => {
            const isLatest =
              documents.length === 1 || documents.indexOf(doc) === 0;

            return (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded">
                        <FileText className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {fundName} {getDocumentDisplayName(doc.type)}
                          </span>
                          <Badge variant="outline">
                            v{doc.template_version}
                          </Badge>
                          {isLatest && (
                            <Badge className="bg-green-100 text-green-800">
                              최신
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          생성일: {formatDate(doc.generated_at)}
                          {doc.generated_by && (
                            <span> · 생성자 ID: {doc.generated_by}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleDownload(doc.id, doc.template_version)
                        }
                      >
                        <Download className="h-4 w-4 mr-1" />
                        다운로드
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(doc)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
