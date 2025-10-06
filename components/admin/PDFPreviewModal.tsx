'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Download, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewUrl: string;
  title?: string;
  description?: string;
  onDownload?: () => void;
}

/**
 * PDF 미리보기 모달
 *
 * 현재는 브라우저 내장 PDF Viewer를 사용하지만,
 * 나중에 react-pdf-viewer 같은 라이브러리로 교체 가능하도록 설계됨
 */
export default function PDFPreviewModal({
  isOpen,
  onClose,
  previewUrl,
  title = 'PDF 미리보기',
  description,
  onDownload,
}: PDFPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
    }
  }, [isOpen, previewUrl]);

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleIframeError = () => {
    setLoading(false);
    setError('PDF를 불러오는데 실패했습니다.');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="!max-w-4xl w-full h-[90vh] flex flex-col gap-3 p-4"
        showCloseButton={false}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{title}</DialogTitle>
              {description && (
                <DialogDescription className="mt-1">
                  {description}
                </DialogDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onDownload && (
                <Button variant="outline" size="sm" onClick={onDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  생성 및 다운로드
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 relative border rounded-md overflow-hidden bg-gray-50">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-sm text-gray-600">PDF를 불러오는 중...</p>
              </div>
            </div>
          )}

          {error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-red-600">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                  }}
                >
                  다시 시도
                </Button>
              </div>
            </div>
          ) : (
            <iframe
              src={previewUrl}
              className="w-full h-full"
              title="PDF Preview"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
          )}
        </div>

        <div className="text-xs text-gray-500 mt-2">
          💡 팁: 미리보기는 저장되지 않습니다. 실제 생성하려면 &apos;생성&apos;
          버튼을 눌러주세요.
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 향후 react-pdf-viewer로 교체할 경우 사용할 컴포넌트 인터페이스
 *
 * import { Viewer, Worker } from '@react-pdf-viewer/core';
 * import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
 * import '@react-pdf-viewer/core/lib/styles/index.css';
 * import '@react-pdf-viewer/default-layout/lib/styles/index.css';
 *
 * function AdvancedPDFViewer({ url }: { url: string }) {
 *   const defaultLayoutPluginInstance = defaultLayoutPlugin();
 *
 *   return (
 *     <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.0.279/build/pdf.worker.min.js">
 *       <Viewer
 *         fileUrl={url}
 *         plugins={[defaultLayoutPluginInstance]}
 *       />
 *     </Worker>
 *   );
 * }
 */
