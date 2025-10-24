// 템플릿 미리보기 API
// POST /api/admin/templates/preview - 템플릿 수정 중 미리보기

import { generateSampleData } from '@/lib/admin/assembly-templates';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { requireSystemAdmin } from '@/lib/auth/system-admin';
import { generateFormationAgendaPDF } from '@/lib/pdf/formation-agenda-generator';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 관리자 권한 검증
    const { user } = await validateAdminAuth(request);

    // SYSTEM_ADMIN 전용 체크
    if (!requireSystemAdmin(user)) {
      return NextResponse.json(
        {
          error:
            '시스템 관리자 권한이 필요합니다. 템플릿 미리보기는 SYSTEM_ADMIN만 가능합니다.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, content, test_data } = body;

    if (!type || !content) {
      return NextResponse.json(
        { error: '필수 데이터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 샘플 데이터 생성 (테스트용)
    const sampleData = test_data || generateSampleData(type);

    // PDF 생성
    let pdfBuffer: Buffer;

    switch (type) {
      case 'formation_agenda':
        pdfBuffer = await generateFormationAgendaPDF({
          fund_name: sampleData.fund_name,
          assembly_date: sampleData.assembly_date,
          content: {
            chairman: content.chairman || '',
            agendas: content.agendas || [],
          },
          template: { content }, // 템플릿 content 전달
          isPreview: true, // 미리보기 모드: 마커 표시
        });
        break;

      default:
        return NextResponse.json(
          { error: `지원하지 않는 템플릿 타입입니다: ${type}` },
          { status: 400 }
        );
    }

    // PDF 반환
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="preview-${type}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('템플릿 미리보기 오류:', error);

    if (error instanceof Error) {
      if (error.message === '인증이 필요합니다') {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message === '관리자 권한이 필요합니다') {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: '템플릿 미리보기 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
