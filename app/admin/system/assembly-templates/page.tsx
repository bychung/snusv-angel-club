/**
 * 조합원 총회 문서 템플릿 관리 페이지 (시스템 어드민 전용)
 */

'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import AssemblyTemplateManagement from '@/components/admin/AssemblyTemplateManagement';

export default function AssemblyTemplatesPage() {
  return (
    <AdminLayout>
      <AssemblyTemplateManagement />
    </AdminLayout>
  );
}
