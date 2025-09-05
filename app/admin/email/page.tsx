import AdminLayout from '@/components/admin/AdminLayout';
import EmailSettings from '@/components/admin/EmailSettings';

export default function AdminEmailPage() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* 페이지 헤더 */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">이메일 설정</h1>
          <p className="mt-2 text-gray-600">
            설문조사 제출 및 회원가입 시 발송되는 이메일 알림을 설정할 수 있습니다.
          </p>
        </div>

        {/* 이메일 설정 */}
        <EmailSettings />
      </div>
    </AdminLayout>
  );
}
