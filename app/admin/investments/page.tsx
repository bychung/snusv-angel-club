'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import { InvestmentModal } from '@/components/admin/InvestmentModal';
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
import type {
  InvestmentsResponse,
  InvestmentStats,
  InvestmentWithDetails,
} from '@/types/investments';
import { formatCurrency, formatPercentage } from '@/types/investments';
import {
  Building2,
  DollarSign,
  PieChart,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useState } from 'react';

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<InvestmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<InvestmentStats | null>(null);
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [selectedInvestment, setSelectedInvestment] =
    useState<InvestmentWithDetails | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false,
  });

  // 투자 목록 로드
  const loadInvestments = async (page: number = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      });

      const response = await fetch(`/api/admin/investments?${params}`);

      if (response.ok) {
        const data: InvestmentsResponse = await response.json();
        setInvestments(data.investments);
        setPagination(prev => ({
          ...prev,
          page: data.page,
          total: data.total,
          hasMore: data.hasMore,
        }));
      } else {
        const errorData = await response.json();
        console.error(
          '투자 목록 로드 실패:',
          errorData.error || response.statusText
        );
      }
    } catch (error) {
      console.error('투자 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 통계 로드
  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/investments?stats=true');
      const data = await response.json();

      if (response.ok) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('투자 통계 로드 실패:', error);
    }
  };

  // 모달 핸들러 함수들
  const handleCreateInvestment = () => {
    setSelectedInvestment(null);
    setShowInvestmentModal(true);
  };

  const handleEditInvestment = (investment: InvestmentWithDetails) => {
    setSelectedInvestment(investment);
    setShowInvestmentModal(true);
  };

  const handleCloseModal = () => {
    setShowInvestmentModal(false);
    setSelectedInvestment(null);
  };

  const handleSaveInvestment = async (investment: InvestmentWithDetails) => {
    // 투자 목록 새로고침
    await loadInvestments(pagination.page);
    await loadStats();
    setShowInvestmentModal(false);
    setSelectedInvestment(null);
  };

  useEffect(() => {
    loadInvestments(1);
    loadStats();
  }, []);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const getTopCategory = () => {
    if (!stats?.category_breakdown) return '-';
    const categories = Object.entries(stats.category_breakdown);
    if (categories.length === 0) return '-';
    return (
      categories.sort(([, a], [, b]) => b.amount - a.amount)[0]?.[0] || '-'
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">투자 관리</h1>
            <p className="text-muted-foreground">
              펀드의 포트폴리오 투자 현황을 관리합니다
            </p>
          </div>
          <Button className="gap-2" onClick={handleCreateInvestment}>
            <Plus className="h-4 w-4" />
            투자 등록
          </Button>
        </div>

        {/* 통계 카드 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  총 투자 건수
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.total_investments}
                </div>
                <p className="text-xs text-muted-foreground">등록된 투자 건</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  총 투자 금액
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.total_amount)}
                </div>
                <p className="text-xs text-muted-foreground">전체 투자 규모</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  포트폴리오 회사
                </CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.total_companies}
                </div>
                <p className="text-xs text-muted-foreground">투자 대상 회사</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  최다 투자 분야
                </CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getTopCategory()}</div>
                <p className="text-xs text-muted-foreground">
                  가장 많이 투자한 분야
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 투자 목록 테이블 */}
        <Card>
          <CardHeader>
            <CardTitle>투자 목록</CardTitle>
            <CardDescription>
              총 {pagination.total}건 투자 중 {investments.length}건 표시
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">로딩 중...</div>
            ) : investments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                등록된 투자가 없습니다
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>회사</TableHead>
                      <TableHead>펀드</TableHead>
                      <TableHead>투자일</TableHead>
                      <TableHead>투자금액</TableHead>
                      <TableHead>지분율</TableHead>
                      <TableHead>분야</TableHead>
                      <TableHead>관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investments.map(investment => (
                      <TableRow key={investment.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold">
                              {investment.company_name || '알 수 없음'}
                            </div>
                            {investment.company_website && (
                              <a
                                href={investment.company_website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                {investment.company_website.replace(
                                  /^https?:\/\//,
                                  ''
                                )}
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
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
                            {investment.unit_price &&
                              investment.investment_shares && (
                                <div className="text-xs text-muted-foreground">
                                  {formatCurrency(investment.unit_price)} ×{' '}
                                  {investment.investment_shares.toLocaleString()}
                                  주
                                </div>
                              )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {investment.ownership_percentage
                            ? formatPercentage(investment.ownership_percentage)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {investment.company_category
                              ?.slice(0, 2)
                              .map(cat => (
                                <Badge
                                  key={cat}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {cat}
                                </Badge>
                              ))}
                            {investment.company_category &&
                              investment.company_category.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{investment.company_category.length - 2}
                                </Badge>
                              )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditInvestment(investment)}
                            >
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

                {/* 페이지네이션 */}
                {pagination.total > pagination.limit && (
                  <div className="flex justify-between items-center mt-4">
                    <div className="text-sm text-muted-foreground">
                      {(pagination.page - 1) * pagination.limit + 1}-
                      {Math.min(
                        pagination.page * pagination.limit,
                        pagination.total
                      )}{' '}
                      of {pagination.total} 투자
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page === 1}
                        onClick={() => loadInvestments(pagination.page - 1)}
                      >
                        이전
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!pagination.hasMore}
                        onClick={() => loadInvestments(pagination.page + 1)}
                      >
                        다음
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* 투자 등록/편집 모달 */}
        <InvestmentModal
          isOpen={showInvestmentModal}
          onClose={handleCloseModal}
          onSave={handleSaveInvestment}
          investment={selectedInvestment}
        />
      </div>
    </AdminLayout>
  );
}
