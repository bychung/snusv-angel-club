// LPA PDF 생성 API Route

import { getActiveTemplate } from '@/lib/admin/document-templates';
import { saveFundDocument } from '@/lib/admin/fund-documents';
import { getFundDataForDocument } from '@/lib/admin/funds';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { generateLPAPDF } from '@/lib/pdf/lpa-generator';
import { processLPATemplate } from '@/lib/pdf/template-processor';
import type { LPAContext, LPATemplate } from '@/lib/pdf/types';
import * as fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import * as path from 'path';

/**
 * 템플릿 로드 (DB 우선, 없으면 파일)
 */
async function loadLPATemplate(): Promise<{
  template: LPATemplate;
  templateId?: string;
  templateVersion: string;
}> {
  // 1. DB에서 활성 템플릿 조회 시도
  try {
    const dbTemplate = await getActiveTemplate('lpa');
    if (dbTemplate) {
      return {
        template: {
          type: 'lpa',
          version: dbTemplate.version,
          description: dbTemplate.description || '',
          content: dbTemplate.content,
        },
        templateId: dbTemplate.id,
        templateVersion: dbTemplate.version,
      };
    }
  } catch (error) {
    console.warn('DB 템플릿 조회 실패, 파일 템플릿 사용:', error);
  }

  // 2. DB에 없으면 파일에서 로드
  const templatePath = path.join(
    process.cwd(),
    'template',
    'lpa-template.json'
  );
  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  const fileTemplate = JSON.parse(templateContent) as LPATemplate;

  return {
    template: fileTemplate,
    templateVersion: fileTemplate.version || '1.0.0',
  };
}

/**
 * LPA 생성에 필요한 컨텍스트 구성
 */
async function buildLPAContext(
  fundId: string,
  userId: string
): Promise<LPAContext> {
  // lib/admin/funds.ts의 헬퍼 함수 사용 (brandClient 사용)
  const { fund, user, members } = await getFundDataForDocument(fundId, userId);

  // 결성일 검증
  if (!fund.closed_at) {
    throw new Error('결성일 정보가 없습니다. 기본 정보에서 입력해 주세요.');
  }

  return {
    fund: {
      id: fund.id,
      name: fund.name,
      address: fund.address,
      total_cap: fund.total_cap,
      initial_cap: fund.initial_cap,
      payment_schedule: fund.payment_schedule,
      duration: fund.duration,
      closed_at: fund.closed_at,
    },
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
    },
    members,
    generatedAt: new Date(),
    isPreview: false, // 실제 생성 (파란색 적용 안 함)
  };
}

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

    // 1. 컨텍스트 구성
    const context = await buildLPAContext(fundId, user.id);

    // 2. 템플릿 로드
    const { template, templateId, templateVersion } = await loadLPATemplate();

    // 3. 템플릿 변수 치환
    const processedContent = processLPATemplate(template, context);

    // 4. PDF 생성
    const pdfBuffer = await generateLPAPDF(processedContent, context);

    console.log(`LPA PDF 생성 완료: ${pdfBuffer.length} bytes`);

    // 5. DB에 문서 기록 저장
    try {
      await saveFundDocument({
        fundId,
        type: 'lpa',
        templateId,
        templateVersion,
        processedContent,
        generationContext: {
          ...context,
          generatedAt: context.generatedAt.toISOString(),
        },
        generatedBy: profile?.id, // profile.id 사용 (없으면 undefined)
      });
      console.log('문서 생성 기록 저장 완료');
    } catch (error) {
      console.error('문서 생성 기록 저장 실패:', error);
      // PDF 생성은 성공했으므로 계속 진행
    }

    // 5. 파일명 생성
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    const fileName = `${context.fund.name}_규약(안)_${dateString}.pdf`;

    // 6. PDF 반환 (Buffer는 BodyInit 타입으로 사용 가능)
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
