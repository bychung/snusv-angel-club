import AdminLayout from '@/components/admin/AdminLayout';
import FundMemberList from '@/components/admin/FundMemberList';
import FundExportControls from '@/components/admin/FundExportControls';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ArrowLeft, Building } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface FundDetailPageProps {
  params: {
    fundId: string;
  };
}

export default async function FundDetailPage({ params }: FundDetailPageProps) {
  const supabase = await createClient();
  
  // 펀드 정보 조회
  const { data: fund, error } = await supabase
    .from('funds')
    .select('*')
    .eq('id', params.fundId)
    .single();

  if (error || !fund) {
    notFound();
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* 페이지 헤더 */}
        <div>
          <div className="flex items-center gap-4 mb-4">
            <Link href="/admin/funds">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                펀드 목록으로
              </Button>
            </Link>
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
                펀드 조합원을 관리하고 데이터를 내보낼 수 있습니다.
              </p>
              <p className="text-sm text-gray-500 mt-1">
                등록일: {new Date(fund.created_at).toLocaleDateString('ko-KR')}
              </p>
            </div>
          </div>
        </div>

        {/* 데이터 내보내기 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle>데이터 내보내기</CardTitle>
            <CardDescription>
              이 펀드의 조합원 데이터를 Excel 또는 CSV 형식으로 내보낼 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FundExportControls fundId={params.fundId} fundName={fund.name} />
          </CardContent>
        </Card>

        {/* 조합원 목록 */}
        <FundMemberList fundId={params.fundId} fundName={fund.name} />
      </div>
    </AdminLayout>
  );
}