import AdminLayout from '@/components/admin/AdminLayout';
import UserManagement from '@/components/admin/UserManagement';
import { getAllUsers } from '@/lib/admin/members';

export default async function AdminUsersPage() {
  // 서버에서 데이터 조회 (보안)
  const members = await getAllUsers();

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* 페이지 헤더 */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">사용자 관리</h1>
          <p className="mt-2 text-gray-600">
            등록된 모든 사용자를 조회하고 관리할 수 있습니다.
          </p>
        </div>

        {/* 사용자 관리 */}
        <UserManagement members={members} />
      </div>
    </AdminLayout>
  );
}
