'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  LpaConsentFormDiff,
  LpaConsentFormDocument,
} from '@/types/assemblies';
import { Download, Eye, FileText, Loader2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import PDFPreviewModal from '../PDFPreviewModal';
import LpaConsentFormDiffViewer from './LpaConsentFormDiffViewer';
import LpaConsentFormGenerateButton from './LpaConsentFormGenerateButton';

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

interface LpaConsentFormSectionProps {
  fundId: string;
}

export default function LpaConsentFormSection({
  fundId,
}: LpaConsentFormSectionProps) {
  const [latestDocument, setLatestDocument] =
    useState<LpaConsentFormDocument | null>(null);
  const [diff, setDiff] = useState<LpaConsentFormDiff | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 최신 문서 조회
  const fetchLatestDocument = async () => {
    try {
      const response = await fetch(
        `/api/admin/funds/${fundId}/generated-documents/lpa-consent-form`
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

  // Diff 조회
  const fetchDiff = async () => {
    try {
      const response = await fetch(
        `/api/admin/funds/${fundId}/generated-documents/lpa-consent-form/diff`
      );

      if (!response.ok) {
        throw new Error('Diff 조회 실패');
      }

      const data = await response.json();
      setDiff(data.diff);
    } catch (error) {
      console.error('Diff 조회 오류:', error);
      setDiff(null);
    }
  };

  // 초기 로드
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchLatestDocument(), fetchDiff()]);
      setIsLoading(false);
    };

    loadData();
  }, [fundId]);

  // 생성 핸들러
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(
        `/api/admin/funds/${fundId}/generated-documents/lpa-consent-form/generate`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '생성 실패');
      }

      const data = await response.json();
      alert('규약 동의서가 생성되었습니다.');

      // 문서 목록 새로고침
      await Promise.all([fetchLatestDocument(), fetchDiff()]);

      // 생성 완료 후 자동 다운로드
      if (data.document?.id) {
        const downloadUrl = `/api/admin/funds/${fundId}/generated-documents/lpa-consent-form/${data.document.id}/download`;
        window.open(downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('생성 오류:', error);
      alert(
        error instanceof Error
          ? error.message
          : '규약 동의서 생성 중 오류가 발생했습니다.'
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
    const downloadUrl = `/api/admin/funds/${fundId}/generated-documents/lpa-consent-form/${latestDocument.id}/download`;
    window.open(downloadUrl, '_blank');
  };

  // 미리보기 핸들러
  const handlePreview = async () => {
    setIsPreviewing(true);
    try {
      // 이미 생성된 문서가 있고 변경사항이 없으면 documentId를 전달
      const requestBody =
        latestDocument?.id && !diff?.hasChanges
          ? { documentId: latestDocument.id }
          : {};

      console.log(
        latestDocument?.id && !diff?.hasChanges
          ? '기존 문서 미리보기 (storage에서 가져오기)'
          : '새 문서 미리보기 (새로 생성)'
      );

      const response = await fetch(
        `/api/admin/funds/${fundId}/generated-documents/lpa-consent-form/preview`,
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
      !confirm('규약 동의서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/admin/funds/${fundId}/generated-documents/lpa-consent-form/${latestDocument.id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '삭제 실패');
      }

      alert('규약 동의서가 삭제되었습니다.');

      // 문서 목록 새로고침
      await Promise.all([fetchLatestDocument(), fetchDiff()]);
    } catch (error) {
      console.error('삭제 오류:', error);
      alert(
        error instanceof Error
          ? error.message
          : '규약 동의서 삭제 중 오류가 발생했습니다.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">규약 동의서</CardTitle>
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
            <CardTitle className="text-xl">규약 동의서</CardTitle>
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
            <div className="text-sm text-gray-600">
              생성일:{' '}
              {new Date(latestDocument.generated_at).toLocaleString('ko-KR')}
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

        {/* Diff 표시 */}
        {diff && <LpaConsentFormDiffViewer diff={diff} />}

        {/* 생성 버튼 */}
        <div className="space-y-2">
          <LpaConsentFormGenerateButton
            fundId={fundId}
            disabled={!diff?.hasChanges}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
          />

          {!diff?.hasChanges && latestDocument && (
            <p className="text-sm text-gray-500">
              조합원 정보에 변경사항이 없습니다.
            </p>
          )}
        </div>

        {/* 최초 생성 안내 */}
        {!latestDocument && (
          <Alert>
            <AlertDescription>
              아직 규약 동의서가 생성되지 않았습니다. 생성 버튼을 눌러 문서를
              생성하세요.
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
          title="규약 동의서 미리보기"
          description={
            latestDocument && !diff?.hasChanges
              ? '현재 저장된 규약 동의서입니다.'
              : '실제 저장되지 않는 미리보기입니다. 조합원 정보가 자동으로 채워집니다.'
          }
          onDownload={
            latestDocument && !diff?.hasChanges
              ? undefined
              : handleGenerateFromPreview
          }
        />
      )}
    </Card>
  );
}
