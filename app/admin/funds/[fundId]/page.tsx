import AdminLayout from '@/components/admin/AdminLayout';
import FundExportModal from '@/components/admin/FundExportModal';
import MemberActionButtons from '@/components/admin/MemberActionButtons';
import MemberSearchAndFilter from '@/components/admin/MemberSearchAndFilter';
import MemberTable from '@/components/admin/MemberTable';
import { Button } from '@/components/ui/button';
import { getFundMembers } from '@/lib/admin/members';
import { createBrandServerClient } from '@/lib/supabase/server';
import { ArrowLeft, Building } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface FundDetailPageProps {
  params: Promise<{
    fundId: string;
  }>;
  searchParams: Promise<{
    search?: string;
    filter?: 'all' | 'registered' | 'survey_only';
  }>;
}

export default async function FundDetailPage({
  params,
  searchParams,
}: FundDetailPageProps) {
  const { fundId } = await params;
  const { search, filter } = await searchParams;
  const brandClient = await createBrandServerClient();

  // 펀드 정보 조회 (서버에서만 실행, 브랜드별 자동 적용)
  const { data: fund, error } = await brandClient.funds
    .select('*')
    .eq('id', fundId)
    .single();

  if (error || !fund) {
    notFound();
  }

  // 조합원 목록 조회 (서버에서만 실행)
  const members = await getFundMembers(fundId, { search, filter });

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* 페이지 헤더 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <Link href="/admin/funds">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                펀드 목록으로
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Link href={`/admin/funds/${fundId}/manage`}>
                <Button variant="outline" size="sm">
                  <Building className="h-4 w-4 mr-1" />
                  펀드 상세 관리
                </Button>
              </Link>
              <FundExportModal fundId={fundId} fundName={fund.name} />
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="h-16 w-16 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Building className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{fund.name}</h1>
              <p className="mt-2 text-gray-600">조합원을 관리할 수 있습니다.</p>
              <p className="text-sm text-gray-500 mt-1">
                데이터 생성일:{' '}
                {new Date(fund.created_at).toLocaleDateString('ko-KR')}
              </p>
            </div>
          </div>
        </div>

        {/* 조합원 관리 버튼들 */}
        <MemberActionButtons fundId={fundId} fundName={fund.name} />

        {/* 검색 및 필터 */}
        <MemberSearchAndFilter mode="fund_members" />

        {/* 조합원 목록 */}
        <MemberTable
          members={members}
          mode="fund_members"
          fundId={fundId}
          fundName={fund.name}
        />
      </div>
    </AdminLayout>
  );
}
