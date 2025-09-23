'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Company } from '@/types/companies';
import type { CompanyInvestmentResponse } from '@/types/investments';
import { formatCurrency, formatPercentage } from '@/types/investments';
import { ArrowLeft, Building2, Plus, TrendingUp } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CompanyInvestmentsPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.companyId as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [investmentData, setInvestmentData] =
    useState<CompanyInvestmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 데이터 로드
  const loadData = async () => {
    try {
      setLoading(true);

      const [companyRes, investmentsRes] = await Promise.all([
        fetch(`/api/admin/companies/${companyId}`),
        fetch(`/api/admin/companies/${companyId}/investments`),
      ]);

      if (companyRes.ok) {
        const companyData = await companyRes.json();
        setCompany(companyData.company);
      }

      if (investmentsRes.ok) {
        const investmentsData = await investmentsRes.json();
        setInvestmentData(investmentsData);
      } else {
        const error = await investmentsRes.json();
        setError(error.error || '투자 현황을 불러오는데 실패했습니다');
      }
    } catch (err) {
      console.error('데이터 로드 실패:', err);
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const handleCreateInvestment = () => {
    router.push(`/admin/investments?company_id=${companyId}`);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-8">
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
          <Button variant="outline" onClick={loadData} className="mt-4">
            다시 시도
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/companies')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            뒤로가기
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="h-8 w-8" />
              {company?.name || '알 수 없음'} 투자 현황
            </h1>
            <p className="text-muted-foreground">
              이 회사의 투자 현황을 관리합니다
            </p>
          </div>
          <Button className="gap-2" onClick={handleCreateInvestment}>
            <Plus className="h-4 w-4" />
            투자 추가
          </Button>
        </div>

        {/* 회사 정보 카드 */}
        {company && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                회사 정보
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <h3 className="font-medium text-gray-600">회사명</h3>
                  <p>{company.name}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-600">산업 분야</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {company.category.map(cat => (
                      <Badge key={cat} variant="secondary" className="text-xs">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-600">설립일</h3>
                  <p>
                    {company.established_at
                      ? formatDate(company.established_at)
                      : '-'}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-600">웹사이트</h3>
                  {company.website ? (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {company.website.replace(/^https?:\/\//, '')}
                    </a>
                  ) : (
                    <p className="text-muted-foreground">-</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 투자 통계 */}
        {investmentData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {investmentData.investor_count}
                </div>
                <div className="text-sm text-muted-foreground">
                  투자 펀드 수
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(investmentData.total_raised)}
                </div>
                <div className="text-sm text-muted-foreground">
                  총 투자 유치금액
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {investmentData.investor_count > 0
                    ? formatCurrency(
                        investmentData.total_raised /
                          investmentData.investor_count
                      )
                    : '-'}
                </div>
                <div className="text-sm text-muted-foreground">
                  평균 투자금액
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 투자 목록 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              투자 내역
            </CardTitle>
            <CardDescription>이 회사에 투자한 펀드 목록입니다</CardDescription>
          </CardHeader>
          <CardContent>
            {investmentData && investmentData.investments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>펀드명</TableHead>
                    <TableHead>투자일</TableHead>
                    <TableHead>투자금액</TableHead>
                    <TableHead>지분율</TableHead>
                    <TableHead>투자 세부정보</TableHead>
                    <TableHead>관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investmentData.investments.map(investment => (
                    <TableRow key={investment.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold">
                            {investment.fund_name || '알 수 없음'}
                          </div>
                          {investment.fund_abbreviation && (
                            <div className="text-xs text-muted-foreground">
                              {investment.fund_abbreviation}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(investment.investment_date)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {investment.total_investment_amount
                              ? formatCurrency(
                                  investment.total_investment_amount
                                )
                              : '-'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {investment.ownership_percentage
                          ? formatPercentage(investment.ownership_percentage)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          {investment.unit_price &&
                            investment.investment_shares && (
                              <div>
                                {formatCurrency(investment.unit_price)} ×{' '}
                                {investment.investment_shares.toLocaleString()}
                                주
                              </div>
                            )}
                          {investment.issued_shares && (
                            <div>
                              총 발행:{' '}
                              {investment.issued_shares.toLocaleString()}주
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            편집
                          </Button>
                          <Button variant="outline" size="sm">
                            상세
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                <p>등록된 투자가 없습니다</p>
                <p className="text-sm">
                  상단의 "투자 추가" 버튼을 클릭하여 투자를 등록하세요
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
