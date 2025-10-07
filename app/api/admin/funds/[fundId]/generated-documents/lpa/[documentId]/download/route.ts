import { getFundDocumentById } from '@/lib/admin/fund-documents';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { generateLPAPDF } from '@/lib/pdf/lpa-generator';
import { NextRequest } from 'next/server';

/**
 * GET /api/admin/funds/{fundId}/generated-documents/{documentId}/download
 * 특정 버전의 문서를 다운로드 (PDF 재생성)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { documentId } = await params;

    // 문서 조회
    const document = await getFundDocumentById(documentId);

    if (!document) {
      return Response.json(
        { error: '문서를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // processed_content로 PDF 재생성
    // generation_context에서 필요한 정보 추출
    const context = document.generation_context || {};
    const fundName = context.fundName || 'Fund';

    // PDF 생성 (문서 타입에 따라 다른 생성 함수 호출)
    let pdfBuffer: Buffer;

    if (document.type === 'lpa') {
      pdfBuffer = await generateLPAPDF(document.processed_content, {
        fund: context.fund || {},
        members: context.members || [],
        user: context.user || {},
        generatedAt: new Date(document.generated_at),
        isPreview: false,
      });
    } else {
      // 다른 문서 타입 지원 (향후 확장)
      return Response.json(
        { error: '지원하지 않는 문서 타입입니다' },
        { status: 400 }
      );
    }

    // 파일명 생성
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    const fileName = `${fundName}_${document.type.toUpperCase()}_v${
      document.version_number
    }_${dateString}.pdf`;

    // PDF 반환
    return new Response(pdfBuffer as unknown as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(
          fileName
        )}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('문서 다운로드 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : '문서 다운로드 중 오류 발생',
      },
      { status: 500 }
    );
  }
}
