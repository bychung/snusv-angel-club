import AdminLayout from '@/components/admin/AdminLayout';
import MemberSearchAndFilter from '@/components/admin/MemberSearchAndFilter';
import MemberTable from '@/components/admin/MemberTable';
import { getAllUsers } from '@/lib/admin/members';

interface AdminUsersPageProps {
  searchParams: Promise<{
    search?: string;
    filter?: 'all' | 'registered' | 'survey_only';
  }>;
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const { search, filter } = await searchParams;

  // 서버에서 데이터 조회 (보안)
  const members = await getAllUsers({ search, filter });

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* 페이지 헤더 */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">사용자 관리</h1>
          <p className="mt-2 text-gray-600">등록된 모든 사용자를 조회하고 관리할 수 있습니다.</p>
        </div>

        {/* 검색 및 필터 */}
        <MemberSearchAndFilter mode="users" />

        {/* 사용자 목록 */}
        <MemberTable members={members} mode="users" />
      </div>
    </AdminLayout>
  );
}
