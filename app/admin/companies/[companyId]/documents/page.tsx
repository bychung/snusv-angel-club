'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import CompanyDocumentUploadModal from '@/components/admin/CompanyDocumentUploadModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Company } from '@/types/companies';
import type {
  CompanyDocument,
  CompanyDocumentStatus,
} from '@/types/company-documents';
import { formatFileSize, getCategoryName } from '@/types/company-documents';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Download,
  FileText,
  Trash2,
  Upload,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CompanyDocumentsPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.companyId as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [documentsData, setDocumentsData] =
    useState<CompanyDocumentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] =
    useState<CompanyDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 데이터 로드
  const loadData = async () => {
    try {
      setLoading(true);

      const [companyRes, documentsRes] = await Promise.all([
        fetch(`/api/admin/companies/${companyId}`),
        fetch(`/api/admin/companies/${companyId}/documents`),
      ]);

      if (companyRes.ok) {
        const companyData = await companyRes.json();
        setCompany(companyData.company);
      }

      if (documentsRes.ok) {
        const documentsData = await documentsRes.json();
        setDocumentsData(documentsData);
      } else {
        const error = await documentsRes.json();
        setError(error.error || '문서를 불러오는데 실패했습니다');
      }
    } catch (err) {
      console.error('데이터 로드 실패:', err);
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const handleDownload = (document: any) => {
    window.open(document.file_url, '_blank');
  };

  const handleUploadComplete = () => {
    loadData(); // 데이터 새로고침
    setIsUploadModalOpen(false);
  };

  const handleDeleteClick = (document: CompanyDocument) => {
    setDocumentToDelete(document);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/admin/companies/${companyId}/documents/${documentToDelete.id}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        await loadData(); // 목록 새로고침
        setDeleteDialogOpen(false);
        setDocumentToDelete(null);
      } else {
        const error = await response.json();
        setError(error.error || '문서 삭제에 실패했습니다');
      }
    } catch (err) {
      console.error('문서 삭제 실패:', err);
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-8">
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
          <Button variant="outline" onClick={loadData} className="mt-4">
            다시 시도
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/companies')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            뒤로가기
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              {company?.name || '알 수 없음'} 문서 관리
            </h1>
            <p className="text-muted-foreground">이 회사의 문서를 관리합니다</p>
          </div>
          <Button onClick={() => setIsUploadModalOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            문서 업로드
          </Button>
        </div>

        {/* 회사 정보 카드 */}
        {company && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                회사 정보
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="font-medium text-gray-600">회사명</h3>
                  <p>{company.name}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-600">산업 분야</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {company.category.map(cat => (
                      <Badge key={cat} variant="secondary" className="text-xs">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-600">웹사이트</h3>
                  {company.website ? (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {company.website.replace(/^https?:\/\//, '')}
                    </a>
                  ) : (
                    <p className="text-muted-foreground">-</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 문서 통계 */}
        {documentsData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {documentsData.total_documents}
                </div>
                <div className="text-sm text-muted-foreground">총 문서</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {
                    Object.values(documentsData.documents_by_category).filter(
                      docs => docs.length > 0
                    ).length
                  }
                </div>
                <div className="text-sm text-muted-foreground">카테고리</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {documentsData.latest_upload
                    ? formatDate(documentsData.latest_upload)
                    : '-'}
                </div>
                <div className="text-sm text-muted-foreground">최근 업로드</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 문서 목록 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              등록된 문서
            </CardTitle>
            <CardDescription>
              {documentsData?.total_documents || 0}개의 문서가 등록되어 있습니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            {documentsData && documentsData.documents.length > 0 ? (
              <div className="space-y-3">
                {documentsData.documents.map(doc => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="flex-shrink-0">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {doc.file_name}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {getCategoryName(doc.category)}
                          </Badge>
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(doc.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                        className="gap-1"
                      >
                        <Download className="h-3 w-3" />
                        다운로드
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(doc)}
                        className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                        삭제
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4" />
                <p>등록된 문서가 없습니다</p>
                <p className="text-sm">
                  상단의 "문서 업로드" 버튼을 클릭하여 문서를 추가하세요
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 문서 업로드 모달 */}
        {company && (
          <CompanyDocumentUploadModal
            isOpen={isUploadModalOpen}
            companyId={companyId}
            companyName={company.name}
            onClose={() => setIsUploadModalOpen(false)}
            onUploadComplete={handleUploadComplete}
          />
        )}

        {/* 문서 삭제 확인 다이얼로그 */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent aria-describedby="delete-company-doc-description">
            <AlertDialogHeader>
              <AlertDialogTitle>문서 삭제 확인</AlertDialogTitle>
              <div
                id="delete-company-doc-description"
                className="text-sm text-muted-foreground"
              >
                <div>
                  &quot;{documentToDelete?.file_name}&quot; 문서를 정말로
                  삭제하시겠습니까?
                </div>
                <div className="text-red-600 font-medium mt-2">
                  삭제된 문서는 복구할 수 없습니다.
                </div>
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={handleDeleteCancel}
                disabled={isDeleting}
              >
                취소
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
