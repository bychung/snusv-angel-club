'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Eye, FileText, Loader2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import PDFPreviewModal from '../PDFPreviewModal';

/**
 * Base64 문자열을 Blob으로 변환하는 헬퍼 함수
 */
function base64ToBlob(base64: string, contentType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}

interface MemberListDocument {
  id: string;
  fund_id: string;
  type: string;
  version: string;
  generated_at: string;
  pdf_url: string | null;
  assembly_date: string | null;
}

interface MemberListSectionProps {
  fundId: string;
}

export default function MemberListSection({ fundId }: MemberListSectionProps) {
  const [latestDocument, setLatestDocument] =
    useState<MemberListDocument | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [assemblyDate, setAssemblyDate] = useState<string>('');

  // 오늘 날짜를 YYYY-MM-DD 형식으로
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 최신 문서 조회
  const fetchLatestDocument = async () => {
    try {
      const response = await fetch(
        `/api/admin/funds/${fundId}/generated-documents/member-list`
      );

      if (response.status === 404) {
        setLatestDocument(null);
        return;
      }

      if (!response.ok) {
        throw new Error('문서 조회 실패');
      }

      const data = await response.json();
      setLatestDocument(data.document);
    } catch (error) {
      console.error('문서 조회 오류:', error);
      setLatestDocument(null);
    }
  };

  // 초기 로드
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchLatestDocument();
      setIsLoading(false);
    };

    loadData();

    // 기본값으로 오늘 날짜 설정
    setAssemblyDate(getTodayString());
  }, [fundId]);

  // 생성 핸들러
  const handleGenerate = async () => {
    if (!assemblyDate) {
      alert('기준일을 입력해주세요.');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(
        `/api/admin/funds/${fundId}/generated-documents/member-list/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assembly_date: assemblyDate,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '생성 실패');
      }

      const data = await response.json();
      alert('조합원 명부가 생성되었습니다.');

      // 문서 목록 새로고침
      await fetchLatestDocument();

      // 생성 완료 후 자동 다운로드
      if (data.document?.id) {
        const downloadUrl = `/api/admin/funds/${fundId}/generated-documents/member-list/${data.document.id}/download`;
        window.open(downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('생성 오류:', error);
      alert(
        error instanceof Error
          ? error.message
          : '조합원 명부 생성 중 오류가 발생했습니다.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // 다운로드 핸들러
  const handleDownload = () => {
    if (!latestDocument?.id) {
      alert('다운로드할 문서가 없습니다.');
      return;
    }

    // 다운로드 API 호출
    const downloadUrl = `/api/admin/funds/${fundId}/generated-documents/member-list/${latestDocument.id}/download`;
    window.open(downloadUrl, '_blank');
  };

  // 미리보기 핸들러
  const handlePreview = async () => {
    if (!assemblyDate && !latestDocument?.id) {
      alert('기준일을 입력하거나 기존 문서를 선택해주세요.');
      return;
    }

    setIsPreviewing(true);
    try {
      // 기존 문서가 있으면 documentId 전달, 없으면 assembly_date 전달
      const requestBody = latestDocument?.id
        ? { documentId: latestDocument.id }
        : { assembly_date: assemblyDate };

      console.log(
        latestDocument?.id
          ? '기존 문서 미리보기 (storage에서 가져오기)'
          : '새 문서 미리보기 (새로 생성)'
      );

      const response = await fetch(
        `/api/admin/funds/${fundId}/generated-documents/member-list/preview`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '미리보기 생성 실패');
      }

      const data = await response.json();

      // Base64 PDF를 Blob으로 변환하여 미리보기 URL 생성
      const pdfBlob = base64ToBlob(data.pdf_base64, 'application/pdf');
      const blobUrl = URL.createObjectURL(pdfBlob);
      setPreviewUrl(blobUrl);
    } catch (error) {
      console.error('미리보기 오류:', error);
      alert(
        error instanceof Error
          ? error.message
          : '미리보기 생성 중 오류가 발생했습니다.'
      );
      setIsPreviewing(false);
    }
  };

  // 미리보기 닫기 핸들러
  const handleClosePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setIsPreviewing(false);
  };

  // 미리보기에서 생성 버튼 클릭 시
  const handleGenerateFromPreview = () => {
    handleClosePreview();
    handleGenerate();
  };

  // 삭제 핸들러
  const handleDelete = async () => {
    if (!latestDocument?.id) {
      alert('삭제할 문서가 없습니다.');
      return;
    }

    if (
      !confirm('조합원 명부를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/admin/funds/${fundId}/generated-documents/member-list/${latestDocument.id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '삭제 실패');
      }

      alert('조합원 명부가 삭제되었습니다.');

      // 문서 목록 새로고침
      await fetchLatestDocument();
    } catch (error) {
      console.error('삭제 오류:', error);
      alert(
        error instanceof Error
          ? error.message
          : '조합원 명부 삭제 중 오류가 발생했습니다.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">조합원 명부</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">조합원 명부</CardTitle>
            <p className="text-sm text-gray-500">
              현재 조합원 정보를 바탕으로 조합원 명부를 생성합니다.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 최신 문서 정보 */}
        {latestDocument && (
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-500" />
                <span className="font-medium">최신 문서</span>
              </div>
              <Badge variant="secondary">v{latestDocument.version}</Badge>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                생성일:{' '}
                {new Date(latestDocument.generated_at).toLocaleString('ko-KR')}
              </div>
              {latestDocument.assembly_date && (
                <div>기준일: {latestDocument.assembly_date}</div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!latestDocument.id}
              >
                <Download className="mr-2 h-4 w-4" />
                다운로드
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreview}
                disabled={isPreviewing}
              >
                {isPreviewing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    미리보기
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting || !latestDocument.id}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    삭제 중...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    삭제
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* 기준일 입력 */}
        <div className="space-y-2">
          <Label htmlFor="assembly_date">기준일</Label>
          <Input
            id="assembly_date"
            type="date"
            value={assemblyDate}
            onChange={e => setAssemblyDate(e.target.value)}
            placeholder="기준일을 선택하세요"
          />
          <p className="text-xs text-gray-500">
            조합원 명부에 표시될 기준일입니다. 기본값은 오늘 날짜입니다.
          </p>
        </div>

        {/* 생성 버튼 */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              onClick={handlePreview}
              disabled={isPreviewing || !assemblyDate}
              variant="outline"
              className="flex-1"
            >
              {isPreviewing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  미리보기 생성 중...
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  미리보기
                </>
              )}
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !assemblyDate}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  {latestDocument ? '재생성' : '생성'}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 최초 생성 안내 */}
        {!latestDocument && (
          <Alert>
            <AlertDescription>
              아직 조합원 명부가 생성되지 않았습니다. 기준일을 입력하고 생성
              버튼을 눌러 문서를 생성하세요.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      {/* PDF 미리보기 모달 */}
      {previewUrl && (
        <PDFPreviewModal
          isOpen={!!previewUrl}
          onClose={handleClosePreview}
          previewUrl={previewUrl}
          title="조합원 명부 미리보기"
          description={
            latestDocument?.id && !assemblyDate
              ? '현재 저장된 조합원 명부입니다.'
              : '실제 저장되지 않는 미리보기입니다. 조합원 정보가 자동으로 채워집니다.'
          }
          onDownload={
            latestDocument?.id && !assemblyDate
              ? undefined
              : handleGenerateFromPreview
          }
        />
      )}
    </Card>
  );
}
