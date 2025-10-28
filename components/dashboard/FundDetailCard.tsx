'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DocumentWithUploader } from '@/lib/admin/documents';
import type { FundDetailsResponse } from '@/lib/admin/funds';
import { FUND_STATUS_CONFIG, type FundStatus } from '@/lib/fund-status';
import { calculateFundTerm, formatRegisteredDate } from '@/lib/utils';
import { DOCUMENT_CATEGORY_NAMES, DocumentCategory } from '@/types/documents';
import {
  CheckCircle,
  Clock,
  CreditCard,
  Download,
  FileText,
  Hash,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { PortfolioSection } from './PortfolioSection';

interface FundDetailCardProps {
  fundId: string;
  fundName: string;
  investmentInfo: {
    totalUnits: number;
    totalAmount: number;
    currentUnits: number;
    currentAmount: number;
  };
}

export default function FundDetailCard({
  fundId,
  fundName,
  investmentInfo,
}: FundDetailCardProps) {
  const [fundDetails, setFundDetails] = useState<FundDetailsResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [investmentCertificates, setInvestmentCertificates] = useState<
    DocumentWithUploader[]
  >([]);
  const [certificatesLoading, setCertificatesLoading] = useState(false);

  const fetchInvestmentCertificates = async () => {
    try {
      setCertificatesLoading(true);
      const response = await fetch(
        `/api/funds/${fundId}/investment-certificates`
      );

      if (response.ok) {
        const data = await response.json();
        setInvestmentCertificates(data.certificates || []);
      } else {
        // 404나 403 같은 경우는 투자확인서가 없거나 권한이 없음을 의미
        setInvestmentCertificates([]);
      }
    } catch (err) {
      console.error('투자확인서 조회 실패:', err);
      setInvestmentCertificates([]);
    } finally {
      setCertificatesLoading(false);
    }
  };

  useEffect(() => {
    const fetchFundDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/funds/${fundId}/details`);

        if (!response.ok) {
          throw new Error('펀드 상세 정보를 불러올 수 없습니다');
        }

        const data = await response.json();
        setFundDetails(data);

        // 펀드 정보 로드 후 투자확인서도 조회
        fetchInvestmentCertificates();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchFundDetails();
  }, [fundId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleCertificateDownload = async (
    documentId: string,
    year?: number
  ) => {
    try {
      const params = new URLSearchParams({
        ...(year && { year: year.toString() }),
        documentId,
      });

      const response = await fetch(
        `/api/funds/${fundId}/investment-certificates/download?${params}`
      );

      if (!response.ok) {
        throw new Error('파일 다운로드에 실패했습니다.');
      }

      // 파일 다운로드
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') ||
          'investment-certificate.pdf'
        : 'investment-certificate.pdf';

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = decodeURIComponent(filename);
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('투자확인서 다운로드 실패:', error);
      alert('파일 다운로드에 실패했습니다.');
    }
  };

  const handleDocumentDownload = async (category: string) => {
    try {
      const response = await fetch(
        `/api/funds/${fundId}/documents/${category}/download`
      );

      if (!response.ok) {
        const errorData = await response.json();
        alert(`다운로드 실패: ${errorData.error}`);
        return;
      }

      // IR deck과 동일한 방식으로 파일 다운로드 처리
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Content-Disposition 헤더에서 파일명 추출, 없으면 기본값 사용
      const contentDisposition = response.headers.get('content-disposition');
      let fileName = `${category}_document`;
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

      console.log(`${category} 문서 다운로드 완료: ${fileName}`);
    } catch (err) {
      console.error('다운로드 실패:', err);
      alert('다운로드 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !fundDetails) {
    return (
      <Card className="hover:shadow-lg transition-shadow border-red-200">
        <CardContent className="p-6">
          <p className="text-red-600 text-sm">
            {error || '펀드 정보를 불러올 수 없습니다'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { fund, documents_status } = fundDetails;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div>
          <div className="text-lg font-bold text-gray-900 flex justify-between items-baseline">
            <span>{fundName}</span>
            {fund.registered_at && (
              <span className="text-xs text-gray-500 font-normal">
                {formatRegisteredDate(fund.registered_at)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge
              className={
                FUND_STATUS_CONFIG[fund.status as FundStatus]?.colorClasses ||
                'bg-gray-100 text-gray-800'
              }
            >
              {FUND_STATUS_CONFIG[fund.status as FundStatus]?.label ||
                fund.status}
            </Badge>
            {calculateFundTerm(fund.registered_at, fund.dissolved_at) && (
              <Badge
                variant="outline"
                className="text-xs bg-orange-50 text-orange-700 border-orange-200"
              >
                {calculateFundTerm(fund.registered_at, fund.dissolved_at)}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="fund-info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fund-info">펀드 정보</TabsTrigger>
            <TabsTrigger value="portfolio">포트폴리오</TabsTrigger>
          </TabsList>

          <TabsContent value="fund-info" className="space-y-4 mt-4">
            {/* 내 출자 정보 */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">내 출자 정보</h4>
              <div className="space-y-1">
                {fund.status !== 'ready' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">
                      {fund.status === 'processing'
                        ? '예상 결성 금액'
                        : '전체 결성 금액'}
                    </span>
                    <span className="font-mono font-medium">
                      {(fund.status === 'processing'
                        ? fund.totalCommittedAmount || fund.totalInvestment
                        : fund.totalInvestment
                      ).toLocaleString()}
                      원
                    </span>
                  </div>
                )}

                {fund.status !== 'ready' && fund.status !== 'processing' ? (
                  // 결성 완료 또는 청산 상태
                  fund.payment_schedule === 'lump_sum' ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">출자좌수</span>
                        <span className="font-mono font-medium">
                          {investmentInfo.totalUnits.toLocaleString()}좌
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">출자금액</span>
                        <span className="font-mono font-medium">
                          {investmentInfo.totalAmount.toLocaleString()}원
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">출자좌수</span>
                        <span className="font-mono font-medium">
                          {investmentInfo.currentUnits.toLocaleString()}좌 /{' '}
                          {investmentInfo.totalUnits.toLocaleString()}좌
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">출자금액</span>
                        <span className="font-mono font-medium">
                          {investmentInfo.currentAmount.toLocaleString()}원 /{' '}
                          {investmentInfo.totalAmount.toLocaleString()}원
                        </span>
                      </div>
                    </>
                  )
                ) : (
                  // ready 또는 processing 상태 (약정 단계)
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-700">약정 출자좌수</span>
                      <span className="font-mono font-medium">
                        {investmentInfo.totalUnits.toLocaleString()}좌
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-700">약정 출자금액</span>
                      <span className="font-mono font-medium">
                        {investmentInfo.totalAmount.toLocaleString()}원
                      </span>
                    </div>
                  </>
                )}

                {fund.status !== 'ready' && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-700">
                        {fund.status === 'processing'
                          ? '예상 출자지분율'
                          : '출자지분율'}
                      </span>
                      <span className="font-mono font-medium">
                        {(
                          (investmentInfo.totalAmount /
                            (fund.status === 'processing'
                              ? fund.totalCommittedAmount ||
                                fund.totalInvestment
                              : fund.totalInvestment)) *
                          100
                        ).toFixed(2)}
                        %
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 펀드 기본 정보 */}
            <div className="grid grid-cols-2 gap-4">
              {fund.gp_info && fund.gp_info.length > 0 && (
                <div className="flex items-start gap-3">
                  <Users className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-600">업무집행조합원</p>
                    <p className="text-sm font-medium text-gray-900">
                      {fund.gp_info.map(gp => gp.name).join(', ')}
                    </p>
                  </div>
                </div>
              )}
              {fund.tax_number && (
                <div className="flex items-start gap-3">
                  <Hash className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-600">고유번호</p>
                    <p className="text-sm font-mono font-medium text-gray-900">
                      {fund.tax_number}
                    </p>
                  </div>
                </div>
              )}
              {fund.account && (
                <div className="flex items-start gap-3 col-span-2">
                  <CreditCard className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-600">계좌 정보</p>
                    <p className="text-sm font-mono font-medium text-gray-900">
                      {fund.account_bank} {fund.account}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 펀드 문서 */}
            {fund.status !== 'ready' &&
              Object.entries(documents_status).some(
                ([_, status]) => status.exists
              ) && (
                <>
                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <h4 className="font-medium text-gray-900">펀드 문서</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(documents_status).map(
                        ([category, status]) => {
                          const categoryName =
                            DOCUMENT_CATEGORY_NAMES[
                              category as DocumentCategory
                            ];

                          const isDownloadable =
                            status.exists && status.downloadable;

                          return (
                            <button
                              key={category}
                              onClick={
                                isDownloadable
                                  ? () => handleDocumentDownload(category)
                                  : undefined
                              }
                              hidden={!isDownloadable}
                              className={`py-1 px-3 rounded-lg border text-left transition-all min-h-10 ${
                                status.exists
                                  ? 'border-green-200 bg-green-50'
                                  : 'border-gray-200 bg-gray-50'
                              } ${
                                isDownloadable
                                  ? 'hover:bg-green-100 cursor-pointer'
                                  : 'cursor-default'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {status.exists ? (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <Clock className="h-4 w-4 text-gray-400" />
                                  )}
                                  <span
                                    className={`text-sm font-medium ${
                                      isDownloadable
                                        ? 'text-gray-900'
                                        : status.exists
                                        ? 'text-gray-700'
                                        : 'text-gray-500'
                                    }`}
                                  >
                                    {categoryName}
                                  </span>
                                </div>
                                {isDownloadable && (
                                  <Download className="h-4 w-4 text-green-600" />
                                )}
                              </div>
                              {!status.exists && (
                                <p className="text-xs text-gray-500 mt-1">
                                  업로드 대기중
                                </p>
                              )}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                </>
              )}

            {/* 투자확인서 */}
            {investmentCertificates.length > 0 && (
              <>
                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <h4 className="font-medium text-gray-900">
                      나의 투자확인서 (소득공제용)
                    </h4>
                  </div>

                  {certificatesLoading ? (
                    <div className="text-sm text-gray-500">로딩 중...</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {investmentCertificates
                        .sort((a, b) => {
                          // 연도별 정렬 (최신순), 연도가 없는 것은 맨 아래
                          if (a.document_year && b.document_year) {
                            return b.document_year - a.document_year;
                          }
                          if (a.document_year && !b.document_year) return -1;
                          if (!a.document_year && b.document_year) return 1;
                          return (
                            new Date(b.created_at).getTime() -
                            new Date(a.created_at).getTime()
                          );
                        })
                        .map(certificate => (
                          <button
                            key={certificate.id}
                            onClick={() =>
                              handleCertificateDownload(
                                certificate.id,
                                certificate.document_year || undefined
                              )
                            }
                            className="py-2 px-3 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 cursor-pointer text-left transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-blue-600" />
                                <div>
                                  <span className="text-sm font-medium text-gray-900">
                                    {certificate.document_year
                                      ? `${certificate.document_year}년 `
                                      : ''}
                                    투자확인서
                                  </span>
                                </div>
                              </div>
                              <Download className="h-4 w-4 text-blue-600" />
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="portfolio" className="mt-4">
            <PortfolioSection fundId={fundId} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
