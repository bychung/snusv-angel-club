// 문서 생성 API (PDF Buffer만 반환, Storage/DB 저장 안 함)

import { generateAssemblyDocumentBuffer } from '@/lib/admin/assembly-documents';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/admin/funds/{fundId}/assemblies/{assemblyId}/documents/generate
 * 문서 PDF 생성 (Buffer만 반환, Storage/DB 저장하지 않음)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string; assemblyId: string }> }
) {
  try {
    const { assemblyId } = await params;

    // 인증 및 관리자 권한 확인
    await validateAdminAuth(request);

    // 요청 본문 파싱
    const body = await request.json();
    const { type, content } = body;

    if (!type) {
      return NextResponse.json(
        { error: '문서 타입이 필요합니다.' },
        { status: 400 }
      );
    }

    // 문서 PDF 생성 (Buffer만, Storage/DB 저장 안 함)
    const result = await generateAssemblyDocumentBuffer({
      assemblyId,
      documentType: type,
      content,
    });

    // PDF Buffer를 Base64로 인코딩하여 반환
    const pdfBase64 = result.pdfBuffer.toString('base64');

    return NextResponse.json(
      {
        pdf_base64: pdfBase64,
        content: result.content,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('문서 생성 실패:', error);

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
      { error: '문서 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}
