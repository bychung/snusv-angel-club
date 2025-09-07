import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FundSection from '@/components/dashboard/FundSection';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">대시보드</h2>
          <p className="text-gray-600">투자하고 있는 펀드 정보를 확인하고 관리할 수 있습니다.</p>
        </div>

        <FundSection />
      </div>
    </DashboardLayout>
  );
}
