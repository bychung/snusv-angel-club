// 조합원 명부 미리보기 API
// POST /api/admin/funds/:fundId/generated-documents/member-list/preview

import { generateMemberListBufferWithInfo } from '@/lib/admin/assembly-documents';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import {
  createBrandServerClient,
  createStorageClient,
} from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/admin/funds/[fundId]/generated-documents/member-list/preview
 * 조합원 명부 미리보기 생성
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { fundId } = await params;
    const body = await request.json();
    const { assembly_date, documentId } = body;

    const brandClient = await createBrandServerClient();

    // documentId가 제공된 경우 기존 문서를 Storage에서 가져옴
    if (documentId) {
      const { data: document, error } = await brandClient.fundDocuments
        .select('*')
        .eq('id', documentId)
        .eq('fund_id', fundId)
        .eq('type', 'member_list')
        .single();

      if (error || !document) {
        return NextResponse.json(
          { error: '문서를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      // Storage에서 PDF 가져오기
      const storageClient = createStorageClient();
      const { data: fileData, error: fileError } = await storageClient.storage
        .from('generated-documents')
        .download(document.pdf_storage_path);

      if (fileError || !fileData) {
        console.error('PDF 다운로드 실패:', fileError);
        throw new Error('PDF 파일을 가져오는데 실패했습니다.');
      }

      // Blob을 Buffer로 변환
      const arrayBuffer = await fileData.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Base64로 인코딩하여 반환
      const base64 = buffer.toString('base64');

      return NextResponse.json({
        pdf_base64: base64,
      });
    }

    // documentId가 없으면 새로 생성
    if (!assembly_date) {
      return NextResponse.json(
        { error: '기준일(assembly_date)이 필요합니다.' },
        { status: 400 }
      );
    }

    // PDF 생성 (미리보기 모드)
    const { buffer: pdfBuffer } = await generateMemberListBufferWithInfo(
      fundId,
      assembly_date
    );

    // Base64로 인코딩하여 반환
    const base64 = pdfBuffer.toString('base64');

    return NextResponse.json({
      pdf_base64: base64,
    });
  } catch (error) {
    console.error('조합원 명부 미리보기 실패:', error);

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
      { error: '조합원 명부 미리보기 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}
