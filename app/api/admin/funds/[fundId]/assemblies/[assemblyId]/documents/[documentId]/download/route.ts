// 문서 다운로드 API

import { getAssemblyDocument } from '@/lib/admin/assemblies';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { createBrandServerClient } from '@/lib/supabase/server';
import { DOCUMENT_TYPE_NAMES } from '@/types/assemblies';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/funds/{fundId}/assemblies/{assemblyId}/documents/{documentId}/download
 * 문서 다운로드
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ fundId: string; assemblyId: string; documentId: string }>;
  }
) {
  try {
    const { documentId } = await params;

    // 인증 및 관리자 권한 확인
    await validateAdminAuth(request);

    // 문서 조회
    const document = await getAssemblyDocument(documentId);

    if (!document || !document.pdf_storage_path) {
      return NextResponse.json(
        { error: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Storage에서 PDF 다운로드
    const brandClient = await createBrandServerClient();
    const { data: fileData, error: downloadError } =
      await brandClient.raw.storage
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
    const documentName =
      DOCUMENT_TYPE_NAMES[document.type as keyof typeof DOCUMENT_TYPE_NAMES] ||
      '문서';
    const fileName = `${documentName}.pdf`;

    // PDF 반환
    const buffer = Buffer.from(await fileData.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(
          fileName
        )}"`,
      },
    });
  } catch (error) {
    console.error('문서 다운로드 실패:', error);

    if (error instanceof Error) {
      if (error.message.includes('인증')) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message.includes('권한')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: '문서 다운로드에 실패했습니다.' },
      { status: 500 }
    );
  }
}
