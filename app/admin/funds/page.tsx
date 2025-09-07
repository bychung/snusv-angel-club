import AdminLayout from '@/components/admin/AdminLayout';
import FundList from '@/components/admin/FundList';

export default function AdminFundsPage() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* 페이지 헤더 */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">펀드 관리</h1>
          <p className="mt-2 text-gray-600">
            펀드별 조합원을 관리하고 데이터를 내보낼 수 있습니다.
          </p>
        </div>

        {/* 펀드 목록 */}
        <FundList />
      </div>
    </AdminLayout>
  );
}