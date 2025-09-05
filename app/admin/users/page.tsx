import AdminLayout from '@/components/admin/AdminLayout';
import UserList from '@/components/admin/UserList';

export default function AdminUsersPage() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* 페이지 헤더 */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">사용자 관리</h1>
          <p className="mt-2 text-gray-600">등록된 모든 사용자를 조회하고 관리할 수 있습니다.</p>
        </div>

        {/* 사용자 목록 */}
        <UserList />
      </div>
    </AdminLayout>
  );
}
