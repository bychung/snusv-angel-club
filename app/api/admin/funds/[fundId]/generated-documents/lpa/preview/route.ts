// LPA PDF 미리보기 API Route (DB 저장 없음)

import { buildLPAContext, loadLPATemplate } from '@/lib/admin/lpa-context';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { generateLPAPDF } from '@/lib/pdf/lpa-generator';
import { processLPATemplate } from '@/lib/pdf/template-processor';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/funds/[fundId]/documents/lpa/preview
 * LPA PDF 미리보기 (DB에 저장하지 않음)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    // 관리자 권한 검증
    const { user } = await validateAdminAuth(request);

    const { fundId } = await params;

    console.log(`LPA PDF 미리보기 요청: fundId=${fundId}, userId=${user.id}`);

    // 1. 컨텍스트 구성 (미리보기 모드, isPreview=true)
    const context = await buildLPAContext(fundId, user.id, true);

    // 2. 템플릿 로드
    const { template } = await loadLPATemplate();

    // 3. 템플릿 변수 치환
    const processedContent = processLPATemplate(template, context);

    // 4. PDF 생성
    const pdfBuffer = await generateLPAPDF(processedContent, context);

    console.log(`LPA PDF 미리보기 생성 완료: ${pdfBuffer.length} bytes`);

    // 5. PDF 반환 (inline으로 브라우저에서 바로 표시)
    return new Response(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="preview.pdf"',
        'Content-Length': pdfBuffer.length.toString(),
        // 브라우저 캐싱 방지 (항상 최신 데이터로 미리보기)
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('LPA PDF 미리보기 오류:', error);

    // validateAdminAuth에서 발생한 인증/권한 에러 처리
    if (error instanceof Error) {
      if (error.message === '인증이 필요합니다') {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message === '관리자 권한이 필요합니다') {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }

      // 사용자에게 보여줄 수 있는 구체적인 에러 메시지들
      const userFriendlyErrors = [
        '결성일 정보가 없습니다. 기본 정보에서 입력해 주세요.',
        '펀드를 찾을 수 없습니다.',
        '사용자를 찾을 수 없습니다.',
        '펀드 멤버 조회 실패',
      ];

      // 에러 메시지가 사용자 친화적인 경우 그대로 반환
      if (userFriendlyErrors.some(msg => error.message.includes(msg))) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    // 알 수 없는 오류
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'PDF 미리보기 생성 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
