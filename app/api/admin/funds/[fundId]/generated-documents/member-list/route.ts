// 조합원 명부 조회 API
// GET /api/admin/funds/:fundId/generated-documents/member-list

import { validateAdminAuth } from '@/lib/auth/admin-server';
import {
  createBrandServerClient,
  createStorageClient,
} from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/funds/[fundId]/generated-documents/member-list
 * 최신 조합원 명부 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    // 관리자 권한 검증
    await validateAdminAuth(request);

    const { fundId } = await params;

    const brandClient = await createBrandServerClient();

    // 최신 문서 조회
    const { data: document, error } = await brandClient.fundDocuments
      .select('*')
      .eq('fund_id', fundId)
      .eq('type', 'member_list')
      .eq('is_active', true)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !document) {
      return NextResponse.json(
        { error: '조합원 명부를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // PDF URL 생성
    const storageClient = createStorageClient();
    const { data: urlData } = await storageClient.storage
      .from('generated-documents')
      .createSignedUrl(document.pdf_storage_path, 3600);

    return NextResponse.json({
      document: {
        id: document.id,
        fund_id: document.fund_id,
        type: document.type,
        version: document.version_number.toString(),
        generated_at: document.created_at,
        pdf_url: urlData?.signedUrl || null,
        assembly_date: document.generation_context?.assembly_date || null,
      },
    });
  } catch (error) {
    console.error('조합원 명부 조회 실패:', error);

    if (error instanceof Error) {
      if (error.message.includes('인증')) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message.includes('권한')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: '조합원 명부 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}
