// 조합원 명부 다운로드 API
// GET /api/admin/funds/:fundId/generated-documents/member-list/:id/download

import { validateAdminAuth } from '@/lib/auth/admin-server';
import {
  createBrandServerClient,
  createStorageClient,
} from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/funds/[fundId]/generated-documents/member-list/[id]/download
 * 조합원 명부 다운로드
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string; id: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { fundId, id } = await params;

    const brandClient = await createBrandServerClient();

    // 문서 조회
    const { data: document, error } = await brandClient.fundDocuments
      .select('*')
      .eq('id', id)
      .eq('fund_id', fundId)
      .eq('type', 'member_list')
      .single();

    if (error || !document) {
      return NextResponse.json(
        { error: '조합원 명부를 찾을 수 없습니다.' },
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
    const { data: fileData, error: fileError } = await storageClient.storage
      .from('generated-documents')
      .download(document.pdf_storage_path);

    if (fileError || !fileData) {
      console.error('PDF 다운로드 실패:', fileError);
      return NextResponse.json(
        { error: 'PDF 다운로드에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 파일명 생성
    const fileName = `조합원명부_${
      document.generation_context?.fund_name || 'fund'
    }_${document.generation_context?.assembly_date || 'date'}.pdf`;

    // PDF Buffer 반환
    const buffer = Buffer.from(await fileData.arrayBuffer());

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(
          fileName
        )}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('조합원 명부 다운로드 실패:', error);

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
      { error: '조합원 명부 다운로드에 실패했습니다.' },
      { status: 500 }
    );
  }
}
