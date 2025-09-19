import { isAdminServer } from '@/lib/auth/admin-server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 관리자 권한 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const adminAccess = await isAdminServer(user);
    if (!adminAccess) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    // 문의 정보 조회
    const { data: inquiry, error: inquiryError } = await supabase
      .from('startup_inquiries')
      .select('*')
      .eq('id', id)
      .single();

    if (inquiryError || !inquiry) {
      return NextResponse.json(
        { error: '문의를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (!inquiry.ir_deck_url) {
      return NextResponse.json(
        { error: 'IR 덱 파일이 없습니다.' },
        { status: 404 }
      );
    }

    // 저장된 경로 확인 및 처리
    let filePath: string;

    // URL 형태로 저장된 경우 (기존 데이터)
    if (inquiry.ir_deck_url.startsWith('http')) {
      // URL에서 파일명만 추출
      const urlParts = inquiry.ir_deck_url.split('/');
      const fileName = urlParts[urlParts.length - 1];

      // 기존 잘못 저장된 경로 처리 (ir-decks/ir-decks/파일명 -> ir-decks/파일명)
      if (inquiry.ir_deck_url.includes('/ir-decks/ir-decks/')) {
        filePath = `ir-decks/${fileName}`;
      } else {
        filePath = fileName;
      }
    } else {
      // 파일 경로로 저장된 경우 (새로운 방식)
      filePath = inquiry.ir_deck_url;
    }

    // Service Role 전용 클라이언트 생성
    const serviceClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Storage에서 파일 다운로드 (Service Role 클라이언트 사용)
    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from('ir-decks')
      .download(filePath);

    if (downloadError) {
      console.error('파일 다운로드 오류:', downloadError);
      return NextResponse.json(
        { error: '파일 다운로드에 실패했습니다.' },
        { status: 500 }
      );
    }

    if (!fileData) {
      return NextResponse.json(
        { error: '파일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 파일을 Buffer로 변환
    const buffer = await fileData.arrayBuffer();

    // 파일 이름 생성
    const fileName = `${inquiry.company_name}_IR_Deck.pdf`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('IR 덱 다운로드 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
