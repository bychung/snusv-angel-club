import AdminLayout from '@/components/admin/AdminLayout';
import FundMemberList from '@/components/admin/FundMemberList';
import FundExportModal from '@/components/admin/FundExportModal';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ArrowLeft, Building } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface FundDetailPageProps {
  params: Promise<{
    fundId: string;
  }>;
}

export default async function FundDetailPage({ params }: FundDetailPageProps) {
  const { fundId } = await params;
  const supabase = await createClient();
  
  // 펀드 정보 조회
  const { data: fund, error } = await supabase
    .from('funds')
    .select('*')
    .eq('id', fundId)
    .single();

  if (error || !fund) {
    notFound();
  }

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
            <FundExportModal fundId={fundId} fundName={fund.name} />
          </div>
          
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="h-16 w-16 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Building className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{fund.name}</h1>
              <p className="mt-2 text-gray-600">
                조합원을 관리할 수 있습니다.
              </p>
              <p className="text-sm text-gray-500 mt-1">
                등록일: {new Date(fund.created_at).toLocaleDateString('ko-KR')}
              </p>
            </div>
          </div>
        </div>

        {/* 조합원 목록 */}
        <FundMemberList fundId={fundId} fundName={fund.name} />
      </div>
    </AdminLayout>
  );
}