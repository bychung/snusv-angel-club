import AdminLayout from '@/components/admin/AdminLayout';
import { CreateFundDialog } from '@/components/admin/FundActions';
import FundTable from '@/components/admin/FundTable';
import { getAllFunds } from '@/lib/admin/funds';

export default async function AdminFundsPage() {
  // 서버에서 데이터 조회 (보안)
  const funds = await getAllFunds();

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* 페이지 헤더 */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">펀드 관리</h1>
            <p className="mt-2 text-gray-600">
              펀드별 조합원을 관리하고 데이터를 내보낼 수 있습니다.
            </p>
          </div>

          {/* 펀드 추가 버튼 */}
          <CreateFundDialog />
        </div>

        {/* 펀드 목록 */}
        <FundTable funds={funds} />
      </div>
    </AdminLayout>
  );
}
