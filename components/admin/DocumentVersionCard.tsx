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
import { Card, CardContent } from '@/components/ui/card';
import type { FundDocument } from '@/types/database';
import { Download, FileText, GitCompare, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface DocumentVersionCardProps {
  document: FundDocument;
  fundName: string;
  documentType: string;
  isLatest: boolean;
  showCompareButton: boolean;
  onDelete: (id: string) => Promise<void>;
  onCompare: () => void;
  onDownload: (documentId: string, version: number) => Promise<void>;
}

export default function DocumentVersionCard({
  document,
  fundName,
  documentType,
  isLatest,
  showCompareButton,
  onDelete,
  onCompare,
  onDownload,
}: DocumentVersionCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete(document.id);
    } catch (error) {
      console.error('삭제 실패:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      await onDownload(document.id, document.version_number);
    } catch (error) {
      console.error('다운로드 실패:', error);
    } finally {
      setIsDownloading(false);
    }
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

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded">
              <FileText className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {fundName} {getDocumentDisplayName(documentType)}
                </span>
                <Badge variant="outline">v{document.version_number}</Badge>
                <Badge variant="outline" className="text-xs">
                  템플릿 {document.template_version}
                </Badge>
                {isLatest && (
                  <Badge className="bg-green-100 text-green-800">최신</Badge>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                생성일: {formatDate(document.generated_at)}
                {document.generated_by && (
                  <span> · 생성자 ID: {document.generated_by}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 다운로드 버튼 */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              <Download className="h-4 w-4 mr-1" />
              {isDownloading ? '다운로드 중...' : '다운로드'}
            </Button>

            {/* 비교 버튼 (가장 오래된 버전 제외) */}
            {showCompareButton && (
              <Button variant="outline" size="sm" onClick={onCompare}>
                <GitCompare className="h-4 w-4 mr-1" />
                이전과 비교
              </Button>
            )}

            {/* 삭제 버튼 (최신 버전이 아닐 때만 활성화) */}
            {!isLatest ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {isDeleting ? '삭제 중...' : '삭제'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      ⚠️ v{document.version_number} 문서를 영구
                      삭제하시겠습니까?
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="text-sm text-muted-foreground space-y-2">
                        <div>
                          <strong>삭제된 문서는 복구할 수 없습니다.</strong>
                        </div>
                        <ul className="list-disc list-inside text-sm">
                          <li>문서 내용</li>
                          <li>생성 기록</li>
                          <li>버전 히스토리</li>
                        </ul>
                        <div className="text-xs text-gray-500 mt-2">
                          이 작업은 되돌릴 수 없습니다.
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      영구 삭제
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled
                title="최신 버전은 삭제할 수 없습니다"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                삭제
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
