'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { FundDocument } from '@/types/database';
import { FileX, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import DocumentDiffModal from './DocumentDiffModal';
import DocumentVersionCard from './DocumentVersionCard';

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
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null
  );

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      // 버전 히스토리 API 호출
      const response = await fetch(
        `/api/admin/funds/${fundId}/generated-documents/${documentType}/versions`
      );

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.versions || []);
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

  const handleDownload = async (documentId: string, version: number) => {
    try {
      // 특정 버전 다운로드 API 호출
      const response = await fetch(
        `/api/admin/documents/${documentId}/download`
      );

      if (!response.ok) {
        throw new Error('문서 다운로드 실패');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Content-Disposition에서 파일명 추출
      const contentDisposition = response.headers.get('content-disposition');
      let fileName = `${fundName}_${documentType.toUpperCase()}_v${version}.pdf`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*?=['"]?([^;'"\n]*)/);
        if (match) {
          fileName = decodeURIComponent(match[1]);
        }
      }

      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('문서 다운로드 오류:', err);
      alert('문서 다운로드 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      const response = await fetch(`/api/admin/fund-documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '문서 삭제 실패');
      }

      // 성공 시 문서 목록 새로고침
      await fetchDocuments();
      alert('문서가 삭제되었습니다.');
    } catch (error) {
      console.error('문서 삭제 오류:', error);
      alert(
        error instanceof Error
          ? error.message
          : '문서 삭제 중 오류가 발생했습니다.'
      );
      throw error;
    }
  };

  const handleCompare = (documentId: string) => {
    setSelectedDocumentId(documentId);
    setDiffModalOpen(true);
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
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-700">생성된 문서</h4>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{documents.length}개</Badge>
            <Button variant="ghost" size="sm" onClick={fetchDocuments}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
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
            {documents.map((doc, index) => {
              const isLatest = doc.is_active || index === 0;

              return (
                <DocumentVersionCard
                  key={doc.id}
                  document={doc}
                  fundName={fundName}
                  documentType={documentType}
                  isLatest={isLatest}
                  onDelete={handleDelete}
                  onCompare={handleCompare}
                  onDownload={handleDownload}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Diff 모달 */}
      <DocumentDiffModal
        isOpen={diffModalOpen}
        onClose={() => {
          setDiffModalOpen(false);
          setSelectedDocumentId(null);
        }}
        fundId={fundId}
        documentType={documentType}
        versions={documents}
        defaultFromId={selectedDocumentId || undefined}
        defaultToId={documents.find(d => d.is_active)?.id}
      />
    </>
  );
}
