'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { CompanyDocumentWithDetails } from '@/types/company-documents';
import {
  CompanyDocumentCategory,
  formatFileSize,
  getCategoryDescription,
  getCategoryName,
} from '@/types/company-documents';
import {
  Building2,
  Calendar,
  Download,
  ExternalLink,
  FileText,
  Folder,
  Globe,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface CompanyDocumentsData {
  company: {
    id: string;
    name: string;
    description?: string;
    website?: string;
    category: string[];
    established_at?: string;
  };
  documents: CompanyDocumentWithDetails[];
  documents_by_category: Record<
    CompanyDocumentCategory,
    CompanyDocumentWithDetails[]
  >;
  total_documents: number;
  latest_upload?: string;
}

interface CompanyDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fundId: string;
  companyId: string;
  companyName: string;
}

export function CompanyDocumentsModal({
  isOpen,
  onClose,
  fundId,
  companyId,
  companyName,
}: CompanyDocumentsModalProps) {
  const [documentsData, setDocumentsData] =
    useState<CompanyDocumentsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 문서 데이터 로드
  const loadDocuments = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/funds/${fundId}/companies/${companyId}/documents`
      );
      const data = await response.json();

      if (response.ok) {
        setDocumentsData(data);
      } else {
        setError(data.error || '문서를 불러오는데 실패했습니다');
      }
    } catch (err) {
      console.error('문서 로드 실패:', err);
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && fundId && companyId) {
      loadDocuments();
    }
  }, [isOpen, fundId, companyId]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const getDisplayWebsite = (website?: string) => {
    if (!website) return '';
    return website.replace(/^https?:\/\//, '');
  };

  const handleDownload = (document: CompanyDocumentWithDetails) => {
    // 파일 다운로드 로직 (새 창에서 열기)
    window.open(document.file_url, '_blank');
  };

  const getAvailableCategories = () => {
    if (!documentsData) return [];
    return Object.values(CompanyDocumentCategory).filter(
      category => documentsData.documents_by_category[category]?.length > 0
    );
  };

  const DocumentList = ({
    documents,
  }: {
    documents: CompanyDocumentWithDetails[];
  }) => {
    if (documents.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Folder className="h-12 w-12 mx-auto mb-4" />
          <p>해당 카테고리의 문서가 없습니다</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {documents.map(doc => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div className="flex items-center space-x-3 flex-1">
              <div className="flex-shrink-0">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.file_name}</p>
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <span>{formatFileSize(doc.file_size)}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(doc.created_at)}
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload(doc)}
              className="gap-1"
            >
              <Download className="h-3 w-3" />
              다운로드
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {companyName} 문서
          </DialogTitle>
          <DialogDescription>
            투자한 회사의 문서를 확인하고 다운로드할 수 있습니다
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">로딩 중...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button variant="outline" onClick={loadDocuments}>
              다시 시도
            </Button>
          </div>
        ) : !documentsData ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">데이터를 불러올 수 없습니다</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 회사 정보 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {documentsData.company.name}
                    </CardTitle>
                    {documentsData.company.description && (
                      <CardDescription className="mt-1">
                        {documentsData.company.description}
                      </CardDescription>
                    )}
                  </div>
                  {documentsData.company.website && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="gap-1"
                    >
                      <a
                        href={documentsData.company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Globe className="h-3 w-3" />
                        {getDisplayWebsite(documentsData.company.website)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex flex-wrap gap-1">
                    {documentsData.company.category.map(cat => (
                      <Badge key={cat} variant="secondary" className="text-xs">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-muted-foreground">
                    설립: {formatDate(documentsData.company.established_at)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 문서 통계 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                    {getAvailableCategories().length}
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
                  <div className="text-sm text-muted-foreground">
                    최근 업로드
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 문서 탭 */}
            {documentsData.total_documents > 0 ? (
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-auto">
                  <TabsTrigger value="all">
                    전체 ({documentsData.total_documents})
                  </TabsTrigger>
                  {getAvailableCategories().map(category => (
                    <TabsTrigger key={category} value={category}>
                      {getCategoryName(category)} (
                      {documentsData.documents_by_category[category].length})
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="all" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">전체 문서</CardTitle>
                      <CardDescription>
                        등록된 모든 문서를 시간순으로 표시합니다
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DocumentList documents={documentsData.documents} />
                    </CardContent>
                  </Card>
                </TabsContent>

                {getAvailableCategories().map(category => (
                  <TabsContent key={category} value={category} className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          {getCategoryName(category)}
                        </CardTitle>
                        <CardDescription>
                          {getCategoryDescription(category)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <DocumentList
                          documents={
                            documentsData.documents_by_category[category]
                          }
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    등록된 문서가 없습니다
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
