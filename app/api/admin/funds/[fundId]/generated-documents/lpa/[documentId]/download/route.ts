import { getFundDocumentById } from '@/lib/admin/fund-documents';
import { loadLPATemplate } from '@/lib/admin/lpa-context';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { generateLPAPDF } from '@/lib/pdf/lpa-generator';
import { createStorageClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

/**
 * GET /api/admin/funds/{fundId}/generated-documents/{documentId}/download
 * 특정 버전의 문서를 다운로드
 * - Storage에 저장된 파일이 있으면 그것을 사용
 * - 없으면 PDF 재생성
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

    // generation_context에서 필요한 정보 추출
    const context = document.generation_context || {};
    const fundName = context.fund?.name || 'Fund';

    let pdfBuffer: Buffer;

    // 1. Storage에 저장된 파일이 있으면 그것을 사용
    if (document.pdf_storage_path) {
      try {
        const storageClient = createStorageClient();
        const { data, error } = await storageClient.storage
          .from('generated-documents')
          .download(document.pdf_storage_path);

        if (error) {
          console.error('Storage에서 파일 다운로드 실패:', error);
          throw error;
        }

        pdfBuffer = Buffer.from(await data.arrayBuffer());
        console.log(
          `Storage에서 PDF 다운로드 성공: ${document.pdf_storage_path}`
        );
      } catch (error) {
        console.error('Storage 다운로드 실패, PDF 재생성으로 폴백:', error);
        // Storage 다운로드 실패 시 재생성으로 폴백
        pdfBuffer = await regeneratePDF(document, context);
      }
    } else {
      // 2. Storage에 저장된 파일이 없으면 재생성
      console.log('Storage에 저장된 파일 없음, PDF 재생성');
      pdfBuffer = await regeneratePDF(document, context);
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

/**
 * PDF 재생성 헬퍼 함수
 */
async function regeneratePDF(document: any, context: any): Promise<Buffer> {
  if (document.type === 'lpa') {
    // 템플릿 로드 (별지 정보를 위해 필요)
    const { template } = await loadLPATemplate();

    return await generateLPAPDF(
      document.processed_content,
      {
        fund: context.fund || {},
        members: context.members || [],
        user: context.user || {},
        generatedAt: new Date(document.generated_at),
        isPreview: false,
      },
      template
    );
  } else {
    // 다른 문서 타입 지원 (향후 확장)
    throw new Error('지원하지 않는 문서 타입입니다');
  }
}
