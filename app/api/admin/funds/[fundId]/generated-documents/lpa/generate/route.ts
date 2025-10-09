// LPA PDF 생성 API Route

import {
  isDocumentDuplicate,
  saveFundDocument,
} from '@/lib/admin/fund-documents';
import { buildLPAContext, loadLPATemplate } from '@/lib/admin/lpa-context';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { generateLPAPDF } from '@/lib/pdf/lpa-generator';
import { processLPATemplate } from '@/lib/pdf/template-processor';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/admin/funds/[fundId]/generated-documents/lpa/generate
 * LPA PDF 생성 및 다운로드
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    // 관리자 권한 검증
    const { user, profile } = await validateAdminAuth(request);

    const { fundId } = await params;

    console.log(`LPA PDF 생성 요청: fundId=${fundId}, userId=${user.id}`);

    // 1. 컨텍스트 구성 (실제 생성, isPreview=false)
    const context = await buildLPAContext(fundId, user.id, false);

    // 2. 템플릿 로드
    const { template, templateId, templateVersion } = await loadLPATemplate();

    // 3. 중복 체크: 최신 버전과 비교하여 context와 template_version이 동일한지 확인
    const generationContext = {
      ...context,
      generatedAt: context.generatedAt.toISOString(),
    };

    const isDuplicate = await isDocumentDuplicate(
      fundId,
      'lpa',
      generationContext,
      templateVersion
    );

    if (isDuplicate) {
      return NextResponse.json(
        {
          error:
            '이미 동일한 내용의 조합 규약이 최신 버전으로 존재합니다. 펀드 정보를 변경하거나 템플릿을 업데이트한 후 다시 시도해주세요.',
          code: 'DUPLICATE_DOCUMENT',
        },
        { status: 409 }
      );
    }

    // 4. 템플릿 변수 치환
    const processedContent = processLPATemplate(template, context);

    // 5. PDF 생성 (템플릿도 함께 전달)
    const pdfBuffer = await generateLPAPDF(processedContent, context, template);

    console.log(`LPA PDF 생성 완료: ${pdfBuffer.length} bytes`);

    // 6. DB에 문서 기록 저장
    try {
      await saveFundDocument({
        fundId,
        type: 'lpa',
        templateId,
        templateVersion,
        processedContent,
        generationContext,
        generatedBy: profile?.id, // profile.id 사용 (없으면 undefined)
      });
      console.log('문서 생성 기록 저장 완료');
    } catch (error) {
      console.error('문서 생성 기록 저장 실패:', error);
      // PDF 생성은 성공했으므로 계속 진행
    }

    // 7. 파일명 생성
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    const fileName = `${context.fund.name}_규약(안)_${dateString}.pdf`;

    // 8. PDF 반환 (Buffer는 BodyInit 타입으로 사용 가능)
    return new Response(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(
          fileName
        )}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('LPA PDF 생성 오류:', error);

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
            : 'PDF 생성 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
