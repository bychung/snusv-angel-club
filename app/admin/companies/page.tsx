'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import { CompanyModal } from '@/components/admin/CompanyModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { CompaniesResponse, Company } from '@/types/companies';
import { INDUSTRY_CATEGORIES } from '@/types/companies';
import {
  Building2,
  Calendar,
  FileText,
  Globe,
  Plus,
  Search,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false,
  });

  // 회사 목록 로드
  const loadCompanies = async (page: number = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (selectedCategories.length > 0) {
        params.append('categories', selectedCategories.join(','));
      }

      const response = await fetch(`/api/admin/companies?${params}`);

      if (response.ok) {
        const data: CompaniesResponse = await response.json();
        setCompanies(data.companies);
        setPagination(prev => ({
          ...prev,
          page: data.page,
          total: data.total,
          hasMore: data.hasMore,
        }));
      } else {
        const errorData = await response.json();
        console.error(
          '회사 목록 로드 실패:',
          errorData.error || response.statusText
        );
      }
    } catch (error) {
      console.error('회사 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 통계 로드
  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/companies?stats=true');
      const data = await response.json();

      if (response.ok) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('통계 로드 실패:', error);
    }
  };

  // 모달 핸들러 함수들
  const handleCreateCompany = () => {
    setSelectedCompany(null);
    setShowCompanyModal(true);
  };

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company);
    setShowCompanyModal(true);
  };

  const handleCloseModal = () => {
    setShowCompanyModal(false);
    setSelectedCompany(null);
  };

  const handleSaveCompany = async (company: Company) => {
    // 회사 목록 새로고침
    await loadCompanies(pagination.page);
    await loadStats();
    setShowCompanyModal(false);
    setSelectedCompany(null);
  };

  const handleViewDocuments = (company: Company) => {
    // 회사별 문서 관리 페이지로 이동 (향후 구현될 페이지)
    router.push(`/admin/companies/${company.id}/documents`);
  };

  const handleViewInvestments = (company: Company) => {
    // 회사별 투자 현황 페이지로 이동 (향후 구현될 페이지)
    router.push(`/admin/companies/${company.id}/investments`);
  };

  useEffect(() => {
    loadCompanies(1);
    loadStats();
  }, [searchTerm, selectedCategories]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadCompanies(1);
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const getDisplayWebsite = (website?: string | null) => {
    if (!website) return '';
    return website.replace(/^https?:\/\//, '');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">회사 관리</h1>
            <p className="text-muted-foreground">
              포트폴리오 회사 정보를 관리합니다
            </p>
          </div>
          <Button className="gap-2" onClick={handleCreateCompany}>
            <Plus className="h-4 w-4" />
            회사 등록
          </Button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 회사 수</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pagination.total}</div>
              <p className="text-xs text-muted-foreground">
                등록된 포트폴리오 회사
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">카테고리 수</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(stats).length}
              </div>
              <p className="text-xs text-muted-foreground">활성 산업 분야</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">최다 분야</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(stats).length > 0
                  ? Object.entries(stats).sort(
                      ([, a], [, b]) => b - a
                    )[0]?.[0] || '-'
                  : '-'}
              </div>
              <p className="text-xs text-muted-foreground">
                가장 많은 회사 분야
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                웹사이트 보유율
              </CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {companies.length > 0
                  ? Math.round(
                      (companies.filter(c => c.website).length /
                        companies.length) *
                        100
                    )
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">
                웹사이트 보유 비율
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 필터 및 검색 */}
        <div className="space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="회사명으로 검색..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button type="submit">검색</Button>
          </form>

          {/* 카테고리 필터 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">산업 분야 필터</label>
            <div className="flex flex-wrap gap-2">
              {INDUSTRY_CATEGORIES.map(category => (
                <Badge
                  key={category}
                  variant={
                    selectedCategories.includes(category)
                      ? 'default'
                      : 'outline'
                  }
                  className="cursor-pointer"
                  onClick={() => toggleCategory(category)}
                >
                  {category}
                  {stats[category] && ` (${stats[category]})`}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* 회사 목록 테이블 */}
        <Card>
          <CardHeader>
            <CardTitle>회사 목록</CardTitle>
            <CardDescription>
              총 {pagination.total}개 회사 중 {companies.length}개 표시
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">로딩 중...</div>
            ) : companies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                등록된 회사가 없습니다
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>회사명</TableHead>
                      <TableHead>산업 분야</TableHead>
                      <TableHead>설립일</TableHead>
                      <TableHead>웹사이트</TableHead>
                      <TableHead>등록일</TableHead>
                      <TableHead>관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map(company => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold">{company.name}</div>
                            {company.description && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {company.description.length > 50
                                  ? `${company.description.substring(0, 50)}...`
                                  : company.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {company.category.slice(0, 2).map(cat => (
                              <Badge
                                key={cat}
                                variant="secondary"
                                className="text-xs"
                              >
                                {cat}
                              </Badge>
                            ))}
                            {company.category.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{company.category.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {company.established_at
                            ? formatDate(company.established_at)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {company.website ? (
                            <a
                              href={company.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              {getDisplayWebsite(company.website)}
                            </a>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{formatDate(company.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditCompany(company)}
                            >
                              편집
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDocuments(company)}
                            >
                              문서
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewInvestments(company)}
                            >
                              투자
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
                      of {pagination.total} 회사
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page === 1}
                        onClick={() => loadCompanies(pagination.page - 1)}
                      >
                        이전
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!pagination.hasMore}
                        onClick={() => loadCompanies(pagination.page + 1)}
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

        {/* 회사 등록/편집 모달 */}
        <CompanyModal
          isOpen={showCompanyModal}
          onClose={handleCloseModal}
          onSave={handleSaveCompany}
          company={selectedCompany}
        />
      </div>
    </AdminLayout>
  );
}
