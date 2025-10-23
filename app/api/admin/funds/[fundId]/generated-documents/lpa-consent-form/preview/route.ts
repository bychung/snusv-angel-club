// LPA 규약 동의서 미리보기 API
// POST /api/admin/funds/:fundId/generated-documents/lpa-consent-form/preview

import { previewLpaConsentForm } from '@/lib/admin/consent-form';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import {
  createBrandServerClient,
  createStorageClient,
} from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/admin/funds/[fundId]/generated-documents/lpa-consent-form/preview
 * 규약 동의서 미리보기
 *
 * Request body (optional):
 *   - documentId: 특정 문서 ID (있으면 storage에서 가져오기, 없으면 새로 생성)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { fundId } = await params;

    // Request body에서 documentId 가져오기 (optional)
    let documentId: string | undefined;
    const contentType = request.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      try {
        const body = await request.json();
        documentId = body?.documentId;
      } catch (error) {
        // body 파싱 실패하면 무시
        console.warn('[preview] Request body 파싱 실패:', error);
      }
    }

    let pdfBuffer: Buffer;

    // documentId가 있으면 storage에서 가져오기
    if (documentId) {
      console.log('[preview] 기존 문서 미리보기:', documentId);

      const supabase = await createBrandServerClient();

      // 문서 조회
      const { data: document, error: docError } = await supabase.fundDocuments
        .select('*')
        .eq('id', documentId)
        .eq('fund_id', fundId)
        .eq('type', 'lpa_consent_form')
        .single();

      if (docError || !document) {
        throw new Error('문서를 찾을 수 없습니다.');
      }

      if (!document.pdf_storage_path) {
        throw new Error('문서 파일이 존재하지 않습니다.');
      }

      // Storage에서 PDF 다운로드
      const storageClient = createStorageClient();
      const { data: fileData, error: downloadError } =
        await storageClient.storage
          .from('generated-documents')
          .download(document.pdf_storage_path);

      if (downloadError || !fileData) {
        console.error('PDF 다운로드 실패:', downloadError);
        throw new Error('PDF 다운로드에 실패했습니다.');
      }

      pdfBuffer = Buffer.from(await fileData.arrayBuffer());
    } else {
      // documentId가 없으면 새로 생성
      console.log('[preview] 새 문서 미리보기 생성');
      pdfBuffer = await previewLpaConsentForm(fundId);
    }

    // PDF Buffer를 Base64로 인코딩하여 반환
    const pdfBase64 = pdfBuffer.toString('base64');

    return NextResponse.json(
      {
        pdf_base64: pdfBase64,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('규약 동의서 미리보기 실패:', error);

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
      { error: '규약 동의서 미리보기에 실패했습니다.' },
      { status: 500 }
    );
  }
}
