// 조합원 명부 생성 API
// POST /api/admin/funds/:fundId/generated-documents/member-list/generate

import { generateMemberListBufferWithInfo } from '@/lib/admin/assembly-documents';
import { validateAdminAuth } from '@/lib/auth/admin-server';
import { getCurrentBrand } from '@/lib/branding';
import { uploadFileToStorage } from '@/lib/storage/upload';
import {
  createBrandServerClient,
  createStorageClient,
} from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * 펀드의 조합원 정보 조회
 */
async function getFundMemberData(fundId: string) {
  const brandClient = await createBrandServerClient();

  // 펀드 정보 조회
  const { data: fund, error: fundError } = await brandClient.funds
    .select('*')
    .eq('id', fundId)
    .single();

  if (fundError || !fund) {
    throw new Error('펀드 정보를 가져오는데 실패했습니다.');
  }

  // GP 정보 조회
  const gpIds = fund.gp_id || [];
  let gps: any[] = [];

  if (gpIds.length > 0) {
    const { data: gpData, error: gpError } = await brandClient.profiles
      .select('id, name, entity_type, business_number')
      .in('id', gpIds);

    if (gpError) {
      console.error('GP 정보 조회 실패:', gpError);
    } else {
      gps = gpData || [];
    }
  }

  // 조합원 정보 조회
  const { data: fundMembers, error: membersError } =
    await brandClient.fundMembers
      .select('profile_id, total_units')
      .eq('fund_id', fundId);

  if (membersError) {
    throw new Error('조합원 정보를 가져오는데 실패했습니다.');
  }

  const profileIds =
    fundMembers?.map((m: { profile_id: string }) => m.profile_id) || [];
  let profiles: any[] = [];

  if (profileIds.length > 0) {
    const { data: profileData, error: profileError } =
      await brandClient.profiles.select('*').in('id', profileIds);

    if (profileError) {
      throw new Error('프로필 정보를 가져오는데 실패했습니다.');
    }

    profiles = profileData || [];
  }

  // 조합원 데이터 조합
  const members =
    fundMembers?.map((fm: { profile_id: string; total_units: number }) => {
      const profile = profiles.find(
        (p: { id: string }) => p.id === fm.profile_id
      );
      return {
        ...profile,
        units: fm.total_units,
      };
    }) || [];

  return { fund, gps, members };
}

/**
 * POST /api/admin/funds/[fundId]/generated-documents/member-list/generate
 * 조합원 명부 생성
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    // 관리자 권한 검증
    const { user, profile } = await validateAdminAuth(request);

    if (!profile) {
      return NextResponse.json(
        { error: '프로필 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const { fundId } = await params;
    const body = await request.json();
    const { assembly_date } = body;

    if (!assembly_date) {
      return NextResponse.json(
        { error: '기준일(assembly_date)이 필요합니다.' },
        { status: 400 }
      );
    }

    // 조합원 정보 조회 (context 생성용)
    const { fund, gps, members } = await getFundMemberData(fundId);

    // PDF 생성
    const {
      buffer: pdfBuffer,
      id: templateId,
      version: templateVersion,
      content: templateContent,
    } = await generateMemberListBufferWithInfo(fundId, assembly_date);

    // Storage에 업로드
    const brand = getCurrentBrand();
    const timestamp = Date.now();
    const fileName = `${fundId}/member-list/${assembly_date}_${timestamp}.pdf`;

    const storagePath = await uploadFileToStorage({
      bucket: 'generated-documents',
      path: fileName,
      file: pdfBuffer,
      contentType: 'application/pdf',
      brand,
    });

    // DB에 저장
    const brandClient = await createBrandServerClient();

    // context 생성: 조합원 목록 스냅샷
    const documentContext = {
      fund_name: fund.name,
      assembly_date,
      gp_info: gps.map((gp: any) => ({
        id: gp.id,
        name: gp.name,
        entity_type: gp.entity_type,
      })),
      members: members.map((m: any) => ({
        name: m.name,
        entity_type: m.entity_type,
        birth_date: m.birth_date,
        business_number: m.business_number,
        address: m.address,
        phone: m.phone,
        units: m.units,
      })),
      generated_at: new Date().toISOString(),
    };

    // 기존 같은 기준일의 문서가 있으면 비활성화
    const { data: existingDocs } = await brandClient.fundDocuments
      .select('*')
      .eq('fund_id', fundId)
      .eq('type', 'member_list')
      .eq('is_active', true);

    if (existingDocs && existingDocs.length > 0) {
      // 같은 기준일의 문서 비활성화
      for (const doc of existingDocs) {
        if (doc.generation_context?.assembly_date === assembly_date) {
          await brandClient.fundDocuments
            .update({ is_active: false })
            .eq('id', doc.id);
        }
      }
    }

    // 버전 계산 (기존 문서 수 + 1)
    const { data: allDocs } = await brandClient.fundDocuments
      .select('version_number')
      .eq('fund_id', fundId)
      .eq('type', 'member_list')
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersion =
      allDocs && allDocs.length > 0 ? allDocs[0].version_number + 1 : 1;

    const { data: document, error: insertError } =
      await brandClient.fundDocuments
        .insert({
          fund_id: fundId,
          type: 'member_list',
          processed_content: templateContent,
          generation_context: documentContext,
          version_number: nextVersion,
          template_id: templateId,
          template_version: templateVersion,
          pdf_storage_path: storagePath,
          generated_by: profile.id,
          is_active: true,
        })
        .select()
        .single();

    if (insertError || !document) {
      console.error('문서 저장 실패:', insertError);
      throw new Error('문서 저장에 실패했습니다.');
    }

    // Public URL 생성
    const storageClient = createStorageClient();
    const { data: urlData } = await storageClient.storage
      .from('generated-documents')
      .createSignedUrl(storagePath, 3600);

    return NextResponse.json(
      {
        document: {
          id: document.id,
          fund_id: document.fund_id,
          type: document.type,
          version: nextVersion.toString(),
          generated_at: document.created_at,
          pdf_url: urlData?.signedUrl || null,
          assembly_date,
        },
        message: '조합원 명부가 생성되었습니다.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('조합원 명부 생성 실패:', error);

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
      { error: '조합원 명부 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}
