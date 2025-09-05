import AdminLayout from '@/components/admin/AdminLayout';
import ExportControls from '@/components/admin/ExportControls';

export default function AdminExportPage() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* 페이지 헤더 */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">데이터 내보내기</h1>
          <p className="mt-2 text-gray-600">
            사용자 데이터를 Excel 또는 CSV 형식으로 내보낼 수 있습니다.
          </p>
        </div>

        {/* 내보내기 컨트롤 */}
        <ExportControls />
      </div>
    </AdminLayout>
  );
}
