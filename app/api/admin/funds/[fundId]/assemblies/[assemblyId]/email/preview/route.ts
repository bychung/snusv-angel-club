// 이메일 발송 미리보기 API

import { getAssemblyDetail } from '@/lib/admin/assemblies';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import {
  getDefaultEmailBody,
  getDefaultEmailSubject,
} from '@/lib/email/assembly-notifications';
import { createBrandServerClient } from '@/lib/supabase/server';
import type { AssemblyDocumentType } from '@/types/assemblies';
import { DOCUMENT_TYPE_NAMES } from '@/types/assemblies';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/funds/{fundId}/assemblies/{assemblyId}/email/preview
 * 이메일 발송 미리보기 (수신자 목록 및 기본 템플릿)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string; assemblyId: string }> }
) {
  try {
    const { fundId, assemblyId } = await params;

    // 인증 및 관리자 권한 확인
    await validateAdminAuth(request);

    // 총회 정보 조회
    const assembly = await getAssemblyDetail(assemblyId);

    if (!assembly) {
      return NextResponse.json(
        { error: '총회를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 펀드 및 조합원 정보 조회
    const brandClient = await createBrandServerClient();

    const { data: fund, error: fundError } = await brandClient.funds
      .select('name')
      .eq('id', fundId)
      .single();

    if (fundError || !fund) {
      return NextResponse.json(
        { error: '펀드 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 조합원 목록 조회
    const { data: fundMembers, error: membersError } =
      await brandClient.fundMembers
        .select('profile_id')
        .eq('fund_id', fundId)
        .is('deleted_at', null);

    if (membersError) {
      console.error('조합원 목록 조회 실패:', membersError);
      return NextResponse.json(
        { error: '조합원 목록 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 조합원 프로필 조회
    const profileIds =
      fundMembers?.map((m: { profile_id: string }) => m.profile_id) || [];
    const { data: profiles, error: profilesError } = await brandClient.profiles
      .select('id, name, email')
      .in('id', profileIds);

    if (profilesError) {
      console.error('프로필 조회 실패:', profilesError);
      return NextResponse.json(
        { error: '프로필 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 수신자 목록 구성
    const recipients =
      profiles?.map((p: { id: string; name: string; email: string }) => ({
        id: p.id,
        name: p.name,
        email: p.email,
      })) || [];

    // 첨부 문서 목록
    const attachments =
      assembly.documents?.map(
        (doc: { id: string; type: AssemblyDocumentType }) => ({
          id: doc.id,
          type: doc.type,
          file_name: `${
            DOCUMENT_TYPE_NAMES[doc.type as AssemblyDocumentType] || '문서'
          }.pdf`,
        })
      ) || [];

    // 기본 제목 및 본문
    const subject = getDefaultEmailSubject(fund.name, assembly.type);
    const body = getDefaultEmailBody(
      fund.name,
      assembly.type,
      assembly.assembly_date
    );

    return NextResponse.json({
      recipients,
      subject,
      body,
      attachments,
    });
  } catch (error) {
    console.error('이메일 미리보기 조회 실패:', error);

    if (error instanceof Error) {
      if (error.message.includes('인증')) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message.includes('권한')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: '이메일 미리보기 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}
