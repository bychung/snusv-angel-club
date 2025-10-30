// 개인정보 수집·이용·제공 동의서 다운로드 API
// GET /api/admin/funds/:fundId/generated-documents/personal-info-consent-form/:documentId/download

import { getIndividualPersonalInfoConsentFormPdf } from '@/lib/admin/personal-info-consent-form';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { createStorageClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/funds/[fundId]/generated-documents/personal-info-consent-form/[documentId]/download
 * 개인정보 동의서 다운로드 (통합 또는 개별)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string; documentId: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { fundId, documentId } = await params;
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    // 개별 조합원용 다운로드
    if (memberId) {
      const { buffer } = await getIndividualPersonalInfoConsentFormPdf(
        fundId,
        memberId
      );

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="personal-info-consent-form-${memberId}.pdf"`,
        },
      });
    }

    // 통합 문서 다운로드
    const storageClient = createStorageClient();
    const { createBrandServerClient } = await import('@/lib/supabase/server');
    const brandClient = await createBrandServerClient();

    // 문서 조회
    const { data: doc, error: docError } = await brandClient.fundDocuments
      .select('pdf_storage_path')
      .eq('id', documentId)
      .single();

    if (docError || !doc || !doc.pdf_storage_path) {
      return NextResponse.json(
        { error: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Storage에서 다운로드
    const { data: fileData, error: downloadError } = await storageClient.storage
      .from('generated-documents')
      .download(doc.pdf_storage_path);

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'PDF 다운로드 실패' }, { status: 500 });
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition':
          'attachment; filename="personal-info-consent-form.pdf"',
      },
    });
  } catch (error) {
    console.error('개인정보 동의서 다운로드 오류:', error);

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
      { error: '개인정보 동의서 다운로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
