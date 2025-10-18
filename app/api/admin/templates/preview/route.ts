// 템플릿 미리보기 API
// POST /api/admin/templates/preview - 템플릿 수정 중 미리보기

import { generateSampleData } from '@/lib/admin/assembly-templates';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { requireSystemAdmin } from '@/lib/auth/system-admin';
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

    // TODO: Step 6에서 PDF generator 리팩토링 후 구현
    // 현재는 기본 응답만 반환
    return NextResponse.json({
      message: '미리보기 기능은 Step 6에서 구현됩니다.',
      type,
      sample_data: sampleData,
    });

    // 향후 구현:
    // const pdfBuffer = await generatePdfFromTemplate(type, content, sampleData);
    // return new NextResponse(pdfBuffer, {
    //   headers: {
    //     'Content-Type': 'application/pdf',
    //     'Content-Disposition': `inline; filename="preview-${type}.pdf"`,
    //   },
    // });
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
