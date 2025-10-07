'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Eye,
  FileText,
  GitCompare,
  MoreVertical,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import PDFPreviewModal from './PDFPreviewModal';

interface DocumentGenerationActionsProps {
  fundId: string;
  fundName: string;
  documentType: string;
  onDocumentGenerated?: () => void;
  duplicateCheckTrigger?: number;
}

export default function DocumentGenerationActions({
  fundId,
  fundName,
  documentType,
  onDocumentGenerated,
  duplicateCheckTrigger = 0,
}: DocumentGenerationActionsProps) {
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [hasExistingDocument, setHasExistingDocument] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // 중복 체크
  const checkDuplicate = async () => {
    try {
      setCheckingDuplicate(true);
      const response = await fetch(
        `/api/admin/funds/${fundId}/generated-documents/${documentType}/check-duplicate`
      );

      if (response.ok) {
        const data = await response.json();
        setIsDuplicate(data.isDuplicate);
      } else {
        // 중복 체크 실패시에는 기본적으로 생성 가능하도록 설정
        setIsDuplicate(false);
      }
    } catch (err) {
      console.warn('중복 체크 실패:', err);
      setIsDuplicate(false);
    } finally {
      setCheckingDuplicate(false);
    }
  };

  // 기존 문서 존재 여부 확인
  useEffect(() => {
    const checkExistingDocument = async () => {
      try {
        const response = await fetch(
          `/api/admin/funds/${fundId}/generated-documents?type=${documentType}`
        );

        if (response.ok) {
          const data = await response.json();
          setHasExistingDocument(!!data.document);

          // 기존 문서가 있으면 중복 체크 수행
          if (data.document) {
            await checkDuplicate();
          }
        }
      } catch (err) {
        console.warn('기존 문서 확인 실패:', err);
      }
    };

    checkExistingDocument();
  }, [fundId, documentType, duplicateCheckTrigger]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);

      const response = await fetch(
        `/api/admin/funds/${fundId}/generated-documents/${documentType}/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();

        // 중복 문서 에러는 특별히 처리
        if (errorData.code === 'DUPLICATE_DOCUMENT') {
          alert(errorData.error);
          // 중복 상태 업데이트
          setIsDuplicate(true);
          return;
        }

        throw new Error(errorData.error || 'PDF 생성에 실패했습니다.');
      }

      // PDF 다운로드
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Content-Disposition 헤더에서 파일명 추출 시도
      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName = `${fundName}_${documentType.toUpperCase()}_${
        new Date().toISOString().split('T')[0]
      }.pdf`;

      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(
          /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
        );
        if (fileNameMatch && fileNameMatch[1]) {
          fileName = decodeURIComponent(fileNameMatch[1].replace(/['"]/g, ''));
        }
      }

      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // 성공 피드백
      if (onDocumentGenerated) {
        onDocumentGenerated();
      }

      // 기존 문서 상태 업데이트
      setHasExistingDocument(true);

      // 중복 체크 다시 수행 (새 문서가 생성되었으므로 이제 중복이 됨)
      await checkDuplicate();

      // 간단한 성공 알림 (향후 toast로 대체 가능)
      alert('문서가 생성되었습니다.');
    } catch (err) {
      console.error('문서 생성 오류:', err);
      alert(
        err instanceof Error ? err.message : '문서 생성 중 오류가 발생했습니다.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    try {
      setRegenerating(true);
      // 재생성은 기본적으로 동일한 엔드포인트 사용 (덮어쓰기)
      await handleGenerate();
    } catch (err) {
      console.error('문서 재생성 오류:', err);
      alert('문서 재생성 중 오류가 발생했습니다.');
    } finally {
      setRegenerating(false);
    }
  };

  const handlePreview = async () => {
    try {
      setPreviewing(true);

      // 미리보기 URL 생성
      const url = `/api/admin/funds/${fundId}/generated-documents/${documentType}/preview`;
      setPreviewUrl(url);
    } catch (err) {
      console.error('미리보기 오류:', err);
      alert(
        err instanceof Error
          ? err.message
          : '미리보기 생성 중 오류가 발생했습니다.'
      );
      setPreviewing(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewing(false);
    setPreviewUrl(null);
  };

  const handleDownloadFromPreview = () => {
    // 미리보기 중 다운로드 버튼 클릭 시 실제 생성
    handleClosePreview();
    handleGenerate();
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'lpa':
        return '조합 규약';
      case 'plan':
        return '결성계획서';
      default:
        return type.toUpperCase() + ' 문서';
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={handlePreview}
            disabled={generating || regenerating || previewing}
          >
            <Eye className="h-5 w-5 mr-2" />
            미리보기
          </Button>

          <Button
            size="lg"
            className="flex-1"
            onClick={handleGenerate}
            disabled={
              generating ||
              regenerating ||
              previewing ||
              (hasExistingDocument && isDuplicate)
            }
          >
            <FileText className="h-5 w-5 mr-2" />
            {generating
              ? '생성 중...'
              : hasExistingDocument
              ? `새로운 ${getDocumentTypeLabel(documentType)} 생성`
              : `${getDocumentTypeLabel(documentType)} 생성`}
          </Button>

          {hasExistingDocument && (
            <Button
              variant="outline"
              size="lg"
              onClick={handleRegenerate}
              disabled={generating || regenerating || previewing}
            >
              <RefreshCw
                className={`h-5 w-5 mr-2 ${regenerating ? 'animate-spin' : ''}`}
              />
              재생성
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                disabled={generating || regenerating || previewing}
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  // TODO: 생성 컨텍스트 확인 모달
                  console.log('생성 컨텍스트 확인:', fundId, documentType);
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                생성 컨텍스트 확인
              </DropdownMenuItem>
              {hasExistingDocument && (
                <DropdownMenuItem
                  onClick={() => {
                    // TODO: 이전 버전과 비교 모달
                    console.log('이전 버전과 비교:', fundId, documentType);
                  }}
                >
                  <GitCompare className="h-4 w-4 mr-2" />
                  이전 버전과 비교
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="text-xs text-gray-500">
          {hasExistingDocument ? (
            isDuplicate ? (
              <span className="text-amber-600 font-medium">
                ⚠️ 최신 버전과 동일한 내용입니다. 펀드 정보를 변경하거나
                템플릿을 업데이트한 후 다시 시도해주세요.
              </span>
            ) : (
              <>
                기존 문서가 있습니다. 새 문서를 생성하면 이전 기록이
                업데이트됩니다.
              </>
            )
          ) : (
            <>
              현재 활성 템플릿을 사용하여 {getDocumentTypeLabel(documentType)}
              을(를) 생성합니다.
            </>
          )}
        </div>
      </div>

      {/* PDF 미리보기 모달 */}
      {previewUrl && (
        <PDFPreviewModal
          isOpen={previewing}
          onClose={handleClosePreview}
          previewUrl={previewUrl}
          title={`${getDocumentTypeLabel(documentType)} 미리보기`}
          description="실제 저장되지 않는 미리보기입니다. 조합 주요 정보는 파란색으로 표시됩니다."
          onDownload={handleDownloadFromPreview}
        />
      )}
    </>
  );
}
