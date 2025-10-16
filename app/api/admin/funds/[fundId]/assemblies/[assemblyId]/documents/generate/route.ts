// 문서 생성 API

import { updateAssemblyStatus } from '@/lib/admin/assemblies';
import {
  generateAssemblyDocument,
  getNextDocumentInfo,
} from '@/lib/admin/assembly-documents';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/admin/funds/{fundId}/assemblies/{assemblyId}/documents/generate
 * 문서 생성
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string; assemblyId: string }> }
) {
  try {
    const { assemblyId } = await params;

    // 인증 및 관리자 권한 확인
    const { user, profile } = await validateAdminAuth(request);

    if (!profile) {
      return NextResponse.json(
        { error: '프로필 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();
    const { type, content } = body;

    if (!type) {
      return NextResponse.json(
        { error: '문서 타입이 필요합니다.' },
        { status: 400 }
      );
    }

    // 문서 생성
    const result = await generateAssemblyDocument({
      assemblyId,
      documentType: type,
      content,
      generatedBy: profile.id,
      brand: profile.brand,
    });

    // 모든 문서 생성 완료 여부 확인
    const nextDocument = await getNextDocumentInfo(assemblyId);
    if (!nextDocument) {
      // 모든 문서가 생성되었으면 상태를 'completed'로 변경
      await updateAssemblyStatus(assemblyId, 'completed');
    }

    return NextResponse.json(
      {
        document_id: result.documentId,
        pdf_url: result.pdfUrl,
        all_documents_completed: !nextDocument,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('문서 생성 실패:', error);

    if (error instanceof Error) {
      if (error.message.includes('인증')) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message.includes('권한')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: '문서 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}
