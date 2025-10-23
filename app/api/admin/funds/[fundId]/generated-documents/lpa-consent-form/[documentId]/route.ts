// LPA 규약 동의서 개별 문서 API
// DELETE /api/admin/funds/:fundId/generated-documents/lpa-consent-form/:documentId

import { deleteLpaConsentForm } from '@/lib/admin/consent-form';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * DELETE /api/admin/funds/[fundId]/generated-documents/lpa-consent-form/[documentId]
 * 규약 동의서 삭제 (DB + Storage)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string; documentId: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { documentId } = await params;

    if (!documentId) {
      return NextResponse.json(
        { error: '문서 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 문서 삭제 (DB + Storage)
    await deleteLpaConsentForm(documentId);

    return NextResponse.json({
      message: '규약 동의서가 성공적으로 삭제되었습니다.',
    });
  } catch (error) {
    console.error('규약 동의서 삭제 실패:', error);

    if (error instanceof Error) {
      if (error.message.includes('인증')) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message.includes('권한')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: '규약 동의서 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
