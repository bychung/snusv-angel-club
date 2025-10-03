// LPA PDF 생성 API Route

import { getFundDataForDocument } from '@/lib/admin/funds';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { generateLPAPDF } from '@/lib/pdf/lpa-generator';
import { processLPATemplate } from '@/lib/pdf/template-processor';
import type { LPAContext, LPATemplate } from '@/lib/pdf/types';
import * as fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import * as path from 'path';

/**
 * 템플릿 로드
 */
async function loadLPATemplate(): Promise<LPATemplate> {
  const templatePath = path.join(
    process.cwd(),
    'template',
    'lpa-template.json'
  );
  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  return JSON.parse(templateContent) as LPATemplate;
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

  return {
    fund: {
      id: fund.id,
      name: fund.name,
      address: fund.address,
      total_cap: fund.total_cap,
      initial_cap: fund.initial_cap,
      payment_schedule: fund.payment_schedule,
      duration: fund.duration,
    },
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    members,
    generatedAt: new Date(),
  };
}

/**
 * POST /api/admin/funds/[fundId]/documents/lpa/generate
 * LPA PDF 생성 및 다운로드
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    // 관리자 권한 검증
    const { user } = await validateAdminAuth(request);

    const { fundId } = await params;

    console.log(`LPA PDF 생성 요청: fundId=${fundId}, userId=${user.id}`);

    // 1. 컨텍스트 구성
    const context = await buildLPAContext(fundId, user.id);

    // 2. 템플릿 로드
    const template = await loadLPATemplate();

    // 3. 템플릿 변수 치환
    const processedContent = processLPATemplate(template, context);

    // 4. PDF 생성
    const pdfBuffer = await generateLPAPDF(processedContent, context);

    console.log(`LPA PDF 생성 완료: ${pdfBuffer.length} bytes`);

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
    }

    // 기타 PDF 생성 오류
    return NextResponse.json(
      {
        error: 'PDF 생성 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    );
  }
}
