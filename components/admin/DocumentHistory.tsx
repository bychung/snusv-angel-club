'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatFileSize } from '@/lib/storage/utils';
import { AlertTriangle, Calendar, Download, FileText, RefreshCw, Trash2, User } from 'lucide-react';
import { useEffect, useState } from 'react';

interface DocumentWithUploader {
  id: string;
  fund_id: string;
  category: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  uploader?: {
    name: string;
    email: string;
  };
}

interface DocumentHistoryProps {
  fundId: string;
  category: 'account' | 'tax' | 'registration' | 'agreement';
  onDocumentDeleted: () => void;
}

const categoryNames = {
  account: '계좌사본',
  tax: '고유번호증',
  registration: '등록원부',
  agreement: '계약서',
};

const getFileTypeColor = (fileType: string) => {
  if (fileType.includes('pdf')) return 'text-red-600 bg-red-50';
  if (fileType.includes('image')) return 'text-blue-600 bg-blue-50';
  return 'text-gray-600 bg-gray-50';
};

const getFileTypeIcon = (fileType: string) => {
  return <FileText className="h-4 w-4" />;
};

export default function DocumentHistory({
  fundId,
  category,
  onDocumentDeleted,
}: DocumentHistoryProps) {
  const [documents, setDocuments] = useState<DocumentWithUploader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/funds/${fundId}/documents/${category}`);

      if (!response.ok) {
        throw new Error('문서 히스토리를 불러올 수 없습니다');
      }

      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [fundId, category]);

  const handleDownload = async (doc: DocumentWithUploader) => {
    try {
      const response = await fetch(`/api/funds/${fundId}/documents/${category}/download`);

      if (!response.ok) {
        const errorData = await response.json();
        alert(`다운로드 실패: ${errorData.error}`);
        return;
      }

      // 일반 유저 대시보드와 동일한 방식으로 파일 다운로드 처리
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Content-Disposition 헤더에서 파일명 추출, 없으면 문서의 파일명 사용
      const contentDisposition = response.headers.get('content-disposition');
      let fileName = doc.file_name; // 기본값으로 문서의 원본 파일명 사용
      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*?=['"]?([^;'"\n]*)/);
        if (match) {
          fileName = decodeURIComponent(match[1]);
        }
      }

      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log(`문서 다운로드 완료: ${fileName}`);
    } catch (error) {
      console.error('다운로드 실패:', error);
      alert('다운로드 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      setDeletingId(documentId);

      const response = await fetch(`/api/admin/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('문서 삭제에 실패했습니다');
      }

      // 성공 시 문서 목록에서 제거
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      onDocumentDeleted();
    } catch (error) {
      console.error('문서 삭제 실패:', error);
      // TODO: 사용자에게 에러 알림
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {categoryNames[category]} 히스토리
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">로딩 중...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {categoryNames[category]} 히스토리
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <span className="ml-2 text-red-600">{error}</span>
            <Button variant="outline" size="sm" onClick={fetchDocuments} className="ml-4">
              <RefreshCw className="h-4 w-4 mr-1" />
              다시 시도
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {categoryNames[category]} 히스토리
            </CardTitle>
            <CardDescription>
              {documents.length > 0
                ? `총 ${documents.length}개의 문서가 업로드되었습니다`
                : '업로드된 문서가 없습니다'}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDocuments}>
            <RefreshCw className="h-4 w-4 mr-1" />
            새로고침
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>아직 업로드된 문서가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((document, index) => (
              <div
                key={document.id}
                className={`
                  p-4 rounded-lg border transition-colors
                  ${
                    index === 0
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {getFileTypeIcon(document.file_type)}
                      <span className="font-medium text-gray-900 truncate">
                        {document.file_name}
                      </span>
                      {index === 0 && (
                        <Badge variant="default" className="text-xs">
                          최신
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={`text-xs ${getFileTypeColor(document.file_type)}`}
                      >
                        {document.file_type.split('/')[1]?.toUpperCase() || 'FILE'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(document.created_at)}
                      </div>
                      {document.uploader && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {document.uploader.name}
                        </div>
                      )}
                      <div className="text-xs text-gray-400">
                        {formatFileSize(document.file_size)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="outline" size="sm" onClick={() => handleDownload(document)}>
                      <Download className="h-4 w-4 mr-1" />
                      다운로드
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={deletingId === document.id}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {deletingId === document.id ? '삭제중...' : '삭제'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>문서를 삭제하시겠습니까?</AlertDialogTitle>
                          <AlertDialogDescription>
                            <span className="font-medium">{document.file_name}</span>을(를)
                            삭제하시겠습니까?
                            <br />
                            삭제된 문서는 복구할 수 없습니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(document.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            삭제
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
