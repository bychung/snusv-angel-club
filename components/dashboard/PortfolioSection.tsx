'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { format222Date, formatToMillion } from '@/lib/utils';
import { usePortfolioStore } from '@/store/portfolioStore';
import { CompanyDocumentCategory } from '@/types/company-documents';
import {
  formatPercentage,
  type InvestmentWithDetails,
} from '@/types/investments';
import { Building2, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CompanyDocumentsModal } from './CompanyDocumentsModal';

interface PortfolioSectionProps {
  fundId: string;
}

export function PortfolioSection({ fundId }: PortfolioSectionProps) {
  const portfolioStore = usePortfolioStore();
  const portfolioData = portfolioStore.getPortfolioData(fundId);
  const { portfolio, loading, error, documentAvailability } = portfolioData;

  const [selectedCompany, setSelectedCompany] =
    useState<InvestmentWithDetails | null>(null);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);

  // 컴포넌트 마운트 시 또는 fundId가 변경될 때 포트폴리오 로드
  useEffect(() => {
    if (fundId) {
      portfolioStore.loadPortfolio(fundId);
    }
  }, [fundId, portfolioStore]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const getDisplayWebsite = (website?: string | null) => {
    if (!website) return '';
    return website.replace(/^https?:\/\//, '');
  };

  const handleShowDocuments = (investment: InvestmentWithDetails) => {
    setSelectedCompany(investment);
    setShowDocumentsModal(true);
  };

  const handleCloseDocumentsModal = () => {
    setShowDocumentsModal(false);
    setSelectedCompany(null);
  };

  // IR 자료 다운로드
  const handleDownloadIR = async (investment: InvestmentWithDetails) => {
    try {
      const response = await fetch(
        `/api/funds/${fundId}/companies/${investment.company_id}/documents`
      );
      const data = await response.json();

      if (response.ok && data.documents_by_category) {
        const irDocuments =
          data.documents_by_category[CompanyDocumentCategory.IR_DECK];
        if (irDocuments && irDocuments.length > 0) {
          // 가장 최신 IR 자료 다운로드
          const latestIR = irDocuments[0];
          window.open(latestIR.file_url, '_blank');
        } else {
          alert('IR 자료가 없습니다.');
        }
      } else {
        alert('문서를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('IR 자료 다운로드 실패:', err);
      alert('다운로드 중 오류가 발생했습니다.');
    }
  };

  // 투심보고서 다운로드
  const handleDownloadInvestmentReport = async (
    investment: InvestmentWithDetails
  ) => {
    try {
      const response = await fetch(
        `/api/funds/${fundId}/companies/${investment.company_id}/documents`
      );
      const data = await response.json();

      if (response.ok && data.documents_by_category) {
        const reportDocuments =
          data.documents_by_category[CompanyDocumentCategory.INVESTMENT_REPORT];
        if (reportDocuments && reportDocuments.length > 0) {
          // 가장 최신 투심보고서 다운로드
          const latestReport = reportDocuments[0];
          window.open(latestReport.file_url, '_blank');
        } else {
          alert('투심보고서가 없습니다.');
        }
      } else {
        alert('문서를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('투심보고서 다운로드 실패:', err);
      alert('다운로드 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            포트폴리오
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">로딩 중...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            포트폴리오
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600">{error}</p>
            <Button
              variant="outline"
              onClick={() => portfolioStore.loadPortfolio(fundId)}
              className="mt-4"
            >
              다시 시도
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!portfolio || portfolio.portfolio_count === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            포트폴리오
          </CardTitle>
          <CardDescription>이 펀드의 투자 현황을 확인하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">
              아직 투자한 회사가 없습니다
            </p>
            <p className="text-sm text-muted-foreground">
              투자가 진행되면 여기에서 포트폴리오를 확인할 수 있습니다
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 포트폴리오 요약 */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">포트폴리오 현황 요약</h4>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-blue-700">투자기업수</span>
            <span className="font-mono font-medium">
              {portfolio.portfolio_count}개
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-blue-700">총 투자금액</span>
            <span className="font-mono font-medium">
              {portfolio.total_investment_amount.toLocaleString()}원
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-blue-700">총 회수금액</span>
            <span className="font-mono font-medium">{0}원</span>
          </div>
        </div>
      </div>

      {/* 포트폴리오 회사 목록 */}

      {/* 데스크톱 테이블 헤더 */}
      <div className="hidden md:grid md:grid-cols-8 gap-4 items-center pb-2 mb-4 border-b text-sm font-medium text-gray-600">
        <div className="col-span-3 text-center">회사명</div>
        <div className="col-span-1 text-center">투자일</div>
        <div className="col-span-1 text-center">투자금액(백만원)</div>
        <div className="col-span-1 text-center">지분율</div>
        <div className="col-span-2 text-center">다운로드</div>
      </div>

      <div className="space-y-2">
        {portfolio.investments.map((investment, index) => (
          <div
            key={investment.id}
            className={`p-0 rounded-lg border-l-4 border-l-blue-500 md:border-l-0 hover:bg-gray-50 transition-colors ${
              index % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'
            }`}
          >
            <div className="grid grid-cols-1 md:grid-cols-8 gap-2 md:gap-4 items-center">
              {/* 회사명 */}
              <div className="md:col-span-3">
                {investment.company_website ? (
                  <a
                    href={investment.company_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium text-sm truncate block"
                    title={investment.company_name || '알 수 없음'}
                  >
                    {investment.company_name || '알 수 없음'}
                  </a>
                ) : (
                  <span
                    className="font-medium truncate block text-gray-900 text-sm"
                    title={investment.company_name || '알 수 없음'}
                  >
                    {investment.company_name || '알 수 없음'}
                  </span>
                )}
              </div>

              {/* 투자일 */}
              <div className="md:col-span-1 text-center">
                <span className="text-sm text-gray-600 md:hidden">
                  투자일:{' '}
                </span>
                <span className="text-sm">
                  {format222Date(investment.investment_date || '')}
                </span>
              </div>

              {/* 투자금액 */}
              <div className="md:col-span-1 text-right">
                <span className="text-sm text-gray-600 md:hidden">
                  투자금액:{' '}
                </span>
                <span className="text-sm font-mono">
                  {investment.total_investment_amount
                    ? formatToMillion(investment.total_investment_amount)
                    : '-'}
                </span>
              </div>

              {/* 지분율 */}
              <div className="md:col-span-1 text-right">
                <span className="text-sm text-gray-600 md:hidden">
                  지분율:{' '}
                </span>
                <span className="text-sm font-mono">
                  {investment.ownership_percentage
                    ? formatPercentage(investment.ownership_percentage)
                    : '-'}
                </span>
              </div>

              {/* 다운로드 버튼들 */}
              <div className="md:col-span-2 flex gap-2 justify-start md:justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadIR(investment)}
                  disabled={!documentAvailability[investment.company_id]?.hasIR}
                  className={`gap-1 text-xs px-2 py-1 ${
                    !documentAvailability[investment.company_id]?.hasIR
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                  title={
                    documentAvailability[investment.company_id]?.hasIR
                      ? 'IR 자료 다운로드'
                      : 'IR 자료 없음'
                  }
                >
                  <Download className="h-3 w-3" />
                  IR
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadInvestmentReport(investment)}
                  disabled={
                    !documentAvailability[investment.company_id]
                      ?.hasInvestmentReport
                  }
                  className={`gap-1 text-xs px-2 py-1 ${
                    !documentAvailability[investment.company_id]
                      ?.hasInvestmentReport
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                  title={
                    documentAvailability[investment.company_id]
                      ?.hasInvestmentReport
                      ? '투심보고서 다운로드'
                      : '투심보고서 없음'
                  }
                >
                  <Download className="h-3 w-3" />
                  투심
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 회사 문서 모달 */}
      {selectedCompany && (
        <CompanyDocumentsModal
          isOpen={showDocumentsModal}
          onClose={handleCloseDocumentsModal}
          fundId={fundId}
          companyId={selectedCompany.company_id}
          companyName={selectedCompany.company_name || '알 수 없음'}
        />
      )}
    </div>
  );
}
