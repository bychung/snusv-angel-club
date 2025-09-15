import AdminLayout from '@/components/admin/AdminLayout';
import FundDetailManager from '@/components/admin/FundDetailManager';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface FundManagePageProps {
  params: Promise<{
    fundId: string;
  }>;
}

export default async function FundManagePage({ params }: FundManagePageProps) {
  const { fundId } = await params;
  const supabase = await createClient();

  // 펀드 기본 정보 조회 (존재 여부 확인)
  const { data: fund, error } = await supabase
    .from('funds')
    .select('name, abbreviation, created_at')
    .eq('id', fundId)
    .single();

  if (error || !fund) {
    notFound();
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 네비게이션 */}
        <div className="flex items-center justify-between">
          <Link href="/admin/funds">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              펀드 목록으로
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <Link href={`/admin/funds/${fundId}`}>
              <Button variant="outline" size="sm">
                조합원 관리
              </Button>
            </Link>
          </div>
        </div>

        {/* 펀드 상세 관리 */}
        <FundDetailManager fundId={fundId} />
      </div>
    </AdminLayout>
  );
}
