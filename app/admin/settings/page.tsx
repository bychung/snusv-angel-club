import AdminLayout from '@/components/admin/AdminLayout';
import SystemSettings from '@/components/admin/SystemSettings';

export default function AdminSettingsPage() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* 페이지 헤더 */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">시스템 설정</h1>
          <p className="mt-2 text-gray-600">
            시스템 전반의 설정과 관리자 계정을 관리할 수 있습니다.
          </p>
        </div>

        {/* 시스템 설정 */}
        <SystemSettings />
      </div>
    </AdminLayout>
  );
}
