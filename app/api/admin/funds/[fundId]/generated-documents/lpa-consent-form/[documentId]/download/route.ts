// LPA 규약 동의서 다운로드 API
// GET /api/admin/funds/:fundId/generated-documents/lpa-consent-form/:documentId/download

import { validateAdminAuth } from '@/lib/auth/admin-server';
import {
  createBrandServerClient,
  createStorageClient,
} from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/funds/[fundId]/generated-documents/lpa-consent-form/[documentId]/download
 * 규약 동의서 다운로드 (Storage에서 가져와서 Buffer로 반환)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string; documentId: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { fundId, documentId } = await params;

    const supabase = await createBrandServerClient();

    // 문서 조회
    const { data: document, error: docError } = await supabase.fundDocuments
      .select('*')
      .eq('id', documentId)
      .eq('fund_id', fundId)
      .eq('type', 'lpa_consent_form')
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (!document.pdf_storage_path) {
      return NextResponse.json(
        { error: '문서 파일이 존재하지 않습니다.' },
        { status: 404 }
      );
    }

    // Storage에서 PDF 다운로드
    const storageClient = createStorageClient();
    const { data: fileData, error: downloadError } = await storageClient.storage
      .from('generated-documents')
      .download(document.pdf_storage_path);

    if (downloadError || !fileData) {
      console.error('PDF 다운로드 실패:', downloadError);
      return NextResponse.json(
        { error: 'PDF 다운로드에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 파일명 생성
    const context = document.generation_context as any;
    const fundName = context?.fund?.name || 'Fund';
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    const fileName = `${fundName}_규약동의서_v${document.version}_${dateString}.pdf`;

    // PDF Buffer 반환
    const buffer = Buffer.from(await fileData.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(
          fileName
        )}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('규약 동의서 다운로드 실패:', error);

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
      { error: '규약 동의서 다운로드에 실패했습니다.' },
      { status: 500 }
    );
  }
}
