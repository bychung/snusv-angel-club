// 개인정보 수집·이용·제공 동의서 특정 버전 조회/삭제 API
// GET/DELETE /api/admin/funds/:fundId/generated-documents/personal-info-consent-form/:documentId

import {
  deletePersonalInfoConsentForm,
  getLatestPersonalInfoConsentForm,
} from '@/lib/admin/personal-info-consent-form';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/funds/[fundId]/generated-documents/personal-info-consent-form/[documentId]
 * 특정 버전의 개인정보 동의서 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string; documentId: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { fundId, documentId } = await params;

    // TODO: documentId로 특정 버전 조회
    // 현재는 최신 버전만 조회하도록 구현 (필요시 확장)
    const document = await getLatestPersonalInfoConsentForm(fundId);

    if (!document || document.id !== documentId) {
      return NextResponse.json(
        { error: '개인정보 동의서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error('개인정보 동의서 조회 오류:', error);

    if (error instanceof Error) {
      if (error.message.includes('인증')) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message.includes('권한')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: '개인정보 동의서 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/funds/[fundId]/generated-documents/personal-info-consent-form/[documentId]
 * 개인정보 동의서 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string; documentId: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { documentId } = await params;

    // 문서 삭제
    await deletePersonalInfoConsentForm(documentId);

    return NextResponse.json({
      message: '개인정보 동의서가 삭제되었습니다.',
    });
  } catch (error) {
    console.error('개인정보 동의서 삭제 오류:', error);

    if (error instanceof Error) {
      if (error.message.includes('인증')) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message.includes('권한')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: '개인정보 동의서 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
