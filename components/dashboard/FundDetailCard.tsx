'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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

interface FundDetailCardProps {
  fundId: string;
  fundName: string;
  investmentInfo: {
    units: number;
    amount: number;
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
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold text-gray-900">
              {fundName}
            </CardTitle>
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
          {fund.registered_at && (
            <span className="text-xs text-gray-500 ml-auto">
              {formatRegisteredDate(fund.registered_at)}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 내 출자 정보 */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">내 출자 정보</h4>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-blue-700">출자 좌수</span>
              <span className="font-mono font-medium">
                {investmentInfo.units.toLocaleString()}좌
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-blue-700">출자 금액</span>
              <span className="font-mono font-medium">
                {investmentInfo.amount.toLocaleString()}원
              </span>
            </div>
            {fund.status !== 'ready' && (
              <>
                {' '}
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">
                    {fund.status === 'processing'
                      ? '예상 결성 금액'
                      : '전체 결성 금액'}
                  </span>
                  <span className="font-mono font-medium">
                    {fund.totalInvestment.toLocaleString()}원
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">
                    {fund.status === 'processing'
                      ? '예상 출자지분율'
                      : '출자지분율'}
                  </span>
                  <span className="font-mono font-medium">
                    {(
                      (investmentInfo.amount / fund.totalInvestment) *
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

        {/* 관련 문서 */}
        {fund.status !== 'ready' && (
          <>
            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <h4 className="font-medium text-gray-900">관련 문서</h4>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(documents_status).map(([category, status]) => {
                  const categoryName =
                    DOCUMENT_CATEGORY_NAMES[category as DocumentCategory];

                  const isDownloadable = status.exists && status.downloadable;

                  return (
                    <button
                      key={category}
                      onClick={
                        isDownloadable
                          ? () => handleDocumentDownload(category)
                          : undefined
                      }
                      disabled={!isDownloadable}
                      className={`py-1 px-3 rounded-lg border text-left transition-all min-h-14 ${
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
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
