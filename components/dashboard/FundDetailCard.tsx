'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { FundDetailsResponse } from '@/lib/admin/funds';
import {
  CheckCircle,
  Clock,
  CreditCard,
  Download,
  FileText,
  Hash,
  MapPin,
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

export default function FundDetailCard({ fundId, fundName, investmentInfo }: FundDetailCardProps) {
  const [fundDetails, setFundDetails] = useState<FundDetailsResponse | null>(null);
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
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
      } finally {
        setLoading(false);
      }
    };

    fetchFundDetails();
  }, [fundId]);

  const getStatusBadge = (status: string) => {
    const statusMap = {
      ready: { label: '결성준비중', variant: 'secondary' as const },
      processing: { label: '결성진행중', variant: 'default' as const },
      applied: { label: '등록대기중', variant: 'outline' as const },
      active: { label: '운용중', variant: 'default' as const },
      closing: { label: '해산중', variant: 'destructive' as const },
      closed: { label: '청산완료', variant: 'destructive' as const },
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || {
      label: status,
      variant: 'secondary' as const,
    };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDocumentDownload = async (category: string) => {
    try {
      const response = await fetch(`/api/funds/${fundId}/documents/${category}/download`);

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
          <p className="text-red-600 text-sm">{error || '펀드 정보를 불러올 수 없습니다'}</p>
        </CardContent>
      </Card>
    );
  }

  const { fund, documents_status } = fundDetails;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold text-gray-900">{fundName}</CardTitle>
            <div className="flex items-center gap-2">
              {getStatusBadge(fund.status)}
              {fund.abbreviation && (
                <span className="text-sm text-gray-500">({fund.abbreviation})</span>
              )}
            </div>
          </div>
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
          </div>
        </div>

        {/* 펀드 기본 정보 */}
        <div className="space-y-3">
          {fund.address && (
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-600">펀드 소재지</p>
                <p className="text-sm font-medium text-gray-900 break-all">{fund.address}</p>
              </div>
            </div>
          )}

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
                <p className="text-sm font-mono font-medium text-gray-900">{fund.tax_number}</p>
              </div>
            </div>
          )}

          {fund.account && (
            <div className="flex items-start gap-3">
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

        <Separator />

        {/* 관련 문서 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-400" />
            <h4 className="font-medium text-gray-900">관련 문서</h4>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {Object.entries(documents_status).map(([category, status]) => {
              const categoryNames = {
                account: '계좌사본',
                tax: '고유번호증',
                registration: '등록원부',
                agreement: '계약서',
              };

              const categoryName = categoryNames[category as keyof typeof categoryNames];

              return (
                <div
                  key={category}
                  className={`p-3 rounded-lg border ${
                    status.exists ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {status.exists ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="text-sm font-medium text-gray-900">{categoryName}</span>
                  </div>

                  {status.exists ? (
                    <div className="space-y-1">
                      <p className="text-xs text-green-700">
                        {status.latest_upload && formatDate(status.latest_upload)} 업로드
                      </p>
                      {status.downloadable && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs px-2 text-green-700 hover:text-green-800"
                          onClick={() => handleDocumentDownload(category)}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          다운로드
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">업로드 대기중</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
