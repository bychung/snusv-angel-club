'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  PersonalInfoConsentFormDiff,
  PersonalInfoConsentFormDocument,
} from '@/types/assemblies';
import { Download, Eye, FileText, Loader2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import PersonalInfoConsentFormDiffViewer from './PersonalInfoConsentFormDiffViewer';
import PersonalInfoConsentFormGenerateButton from './PersonalInfoConsentFormGenerateButton';

interface PersonalInfoConsentFormSectionProps {
  fundId: string;
}

export default function PersonalInfoConsentFormSection({
  fundId,
}: PersonalInfoConsentFormSectionProps) {
  const [latestDocument, setLatestDocument] =
    useState<PersonalInfoConsentFormDocument | null>(null);
  const [diff, setDiff] = useState<PersonalInfoConsentFormDiff | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // 최신 문서 조회
  const fetchLatestDocument = async () => {
    try {
      const response = await fetch(
        `/api/admin/funds/${fundId}/generated-documents/personal-info-consent-form`
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
        `/api/admin/funds/${fundId}/generated-documents/personal-info-consent-form/diff`
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
        `/api/admin/funds/${fundId}/generated-documents/personal-info-consent-form/generate`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '생성 실패');
      }

      const data = await response.json();
      alert('개인정보 동의서가 생성되었습니다.');

      // 문서 목록 새로고침
      await Promise.all([fetchLatestDocument(), fetchDiff()]);

      // 생성 완료 후 자동 다운로드
      if (data.document?.id) {
        const downloadUrl = `/api/admin/funds/${fundId}/generated-documents/personal-info-consent-form/${data.document.id}/download`;
        window.open(downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('생성 오류:', error);
      alert(
        error instanceof Error
          ? error.message
          : '개인정보 동의서 생성 중 오류가 발생했습니다.'
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
    const downloadUrl = `/api/admin/funds/${fundId}/generated-documents/personal-info-consent-form/${latestDocument.id}/download`;
    window.open(downloadUrl, '_blank');
  };

  // 미리보기 핸들러
  const handlePreview = () => {
    // 미리보기 API 호출 (새 탭에서 열기)
    const previewUrl = `/api/admin/funds/${fundId}/generated-documents/personal-info-consent-form/preview`;
    window.open(previewUrl, '_blank');
  };

  // 삭제 핸들러
  const handleDelete = async () => {
    if (!latestDocument?.id) {
      alert('삭제할 문서가 없습니다.');
      return;
    }

    if (!confirm('정말로 삭제하시겠습니까?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/admin/funds/${fundId}/generated-documents/personal-info-consent-form/${latestDocument.id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '삭제 실패');
      }

      alert('개인정보 동의서가 삭제되었습니다.');

      // 문서 목록 새로고침
      await Promise.all([fetchLatestDocument(), fetchDiff()]);
    } catch (error) {
      console.error('삭제 오류:', error);
      alert(
        error instanceof Error
          ? error.message
          : '개인정보 동의서 삭제 중 오류가 발생했습니다.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            개인정보 수집·이용·제공 동의서
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        </CardContent>
      </Card>
    );
  }

  const hasChanges = diff?.hasChanges ?? false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">
              개인정보 수집·이용·제공 동의서
            </CardTitle>
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
              <Badge variant="secondary">
                v{latestDocument.context?.templateVersion || '1.0.0'}
              </Badge>
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
              <Button variant="outline" size="sm" onClick={handlePreview}>
                <Eye className="mr-2 h-4 w-4" />
                미리보기
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
        {diff && <PersonalInfoConsentFormDiffViewer diff={diff} />}

        {/* 생성 버튼 */}
        <div className="space-y-2">
          <PersonalInfoConsentFormGenerateButton
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
              아직 개인정보 동의서가 생성되지 않았습니다. 생성 버튼을 눌러
              문서를 생성하세요.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
