import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // FormData 처리 (파일 업로드 포함)
    const formData = await request.formData();

    const companyName = formData.get('companyName') as string;
    const contactPerson = formData.get('contactPerson') as string;
    const position = formData.get('position') as string;
    const companyDescription = formData.get('companyDescription') as string;
    const irDeckFile = formData.get('irDeck') as File;

    // 필수 필드 검증
    if (!companyName || !contactPerson || !position || !companyDescription) {
      return NextResponse.json(
        { error: '모든 필수 필드를 입력해주세요.' },
        { status: 400 }
      );
    }

    if (!irDeckFile) {
      return NextResponse.json(
        { error: 'IR 덱 파일을 업로드해주세요.' },
        { status: 400 }
      );
    }

    // 파일 타입 및 크기 검증
    if (irDeckFile.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'PDF 파일만 업로드 가능합니다.' },
        { status: 400 }
      );
    }

    if (irDeckFile.size > 10 * 1024 * 1024) {
      // 10MB
      return NextResponse.json(
        { error: '파일 크기는 10MB 이하여야 합니다.' },
        { status: 400 }
      );
    }

    // 파일을 Supabase Storage에 업로드
    const timestamp = Date.now();
    // 한글 및 특수문자를 안전한 형태로 변환
    const safeName = companyName
      .replace(/[^a-zA-Z0-9가-힣\s]/g, '') // 특수문자 제거
      .replace(/[가-힣]/g, char => {
        // 한글을 유니코드 번호로 변환
        return char.charCodeAt(0).toString(16);
      })
      .replace(/\s+/g, '_') // 공백을 언더스코어로 변환
      .substring(0, 50); // 길이 제한
    const fileName = `${safeName}_${timestamp}.pdf`;
    const filePath = fileName; // 버킷 내에서 직접 저장 (ir-decks/ 접두사 불필요)

    // 파일을 ArrayBuffer로 변환
    const fileBuffer = await irDeckFile.arrayBuffer();

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ir-decks')
      .upload(filePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('파일 업로드 오류:', uploadError);
      return NextResponse.json(
        { error: '파일 업로드에 실패했습니다.' },
        { status: 500 }
      );
    }

    // Private 버킷이므로 파일 경로만 저장 (공개 URL 생성하지 않음)
    // 다운로드는 서버 API를 통해 처리

    // 데이터베이스에 문의 내용 저장
    const { data, error: dbError } = await supabase
      .from('startup_inquiries')
      .insert({
        company_name: companyName,
        contact_person: contactPerson,
        position: position,
        company_description: companyDescription,
        ir_deck_url: filePath, // 파일 경로만 저장 (fileName)
      })
      .select('*')
      .single();

    if (dbError) {
      console.error('데이터베이스 저장 오류:', dbError);

      // 데이터베이스 저장 실패 시 업로드한 파일 삭제
      await supabase.storage.from('ir-decks').remove([filePath]);

      return NextResponse.json(
        { error: '문의 저장에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'IR 문의가 성공적으로 제출되었습니다.',
        data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('IR 문의 처리 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();

    // 관리자용 문의 목록 조회
    const { data, error } = await supabase
      .from('startup_inquiries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('스타트업 문의 목록 조회 오류:', error);
      return NextResponse.json(
        { error: '문의 목록을 불러올 수 없습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('스타트업 문의 목록 처리 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
