import AdminLayout from '@/components/admin/AdminLayout';
import RecentActivity from '@/components/admin/RecentActivity';
import StatsCards from '@/components/admin/StatsCards';
import { getDashboardStats, getRecentActivity } from '@/lib/admin/dashboard';

export default async function AdminDashboard() {
  // 서버에서 데이터 조회 (보안)
  const stats = await getDashboardStats();
  const activities = await getRecentActivity();

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* 페이지 헤더 */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">관리자 대시보드</h1>
          <p className="mt-2 text-gray-600">SNUSV ANGEL CLUB 펀드 출자 조합원 관리 시스템</p>
        </div>

        {/* 통계 카드 */}
        <StatsCards stats={stats} />

        {/* 최근 활동 */}
        <RecentActivity activities={activities} />
      </div>
    </AdminLayout>
  );
}
