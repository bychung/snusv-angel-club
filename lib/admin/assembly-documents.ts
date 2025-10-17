// 조합원 총회 문서 생성 헬퍼 함수

import { createBrandServerClient } from '@/lib/supabase/server';
import type {
  AssemblyDocumentType,
  AssemblyType,
  FormationAgendaContent,
  NextDocumentInfo,
} from '@/types/assemblies';
import { ASSEMBLY_DOCUMENT_TYPES } from '@/types/assemblies';
import {
  generateFormationAgendaPDF,
  getDefaultFormationAgendaContent,
} from '../pdf/formation-agenda-generator';
import { generateMemberListPDF } from '../pdf/member-list-generator';
import { uploadFileToStorage } from '../storage/upload';

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
 * 조합원 명부 PDF 생성 (Buffer만 반환, Storage 업로드 안 함)
 */
export async function generateMemberListBuffer(
  fundId: string,
  assemblyDate: string
): Promise<Buffer> {
  try {
    const { fund, gps, members } = await getFundMemberData(fundId);

    // GP 정보 포맷팅
    const gpInfos = gps.map(
      (gp: {
        id: string;
        name: string;
        entity_type: string;
        business_number: string;
      }) => ({
        id: gp.id,
        name: gp.name,
        representative: null, // TODO: representative 정보가 있다면 추가
        entity_type: gp.entity_type as 'individual' | 'corporate',
      })
    );

    // 조합원 정보 포맷팅
    const memberInfos = members.map((m: any) => ({
      name: m.name,
      entity_type: m.entity_type as 'individual' | 'corporate',
      birth_date: m.birth_date,
      business_number: m.business_number,
      address: m.address,
      phone: m.phone,
      units: m.units,
    }));

    // PDF 생성
    const pdfBuffer = await generateMemberListPDF({
      fund_name: fund.name,
      assembly_date: assemblyDate,
      gps: gpInfos,
      members: memberInfos,
    });

    return pdfBuffer;
  } catch (error) {
    console.error('조합원 명부 생성 실패:', error);
    throw new Error('조합원 명부 생성에 실패했습니다.');
  }
}

/**
 * 결성총회 의안 PDF 생성 (Buffer만 반환, Storage 업로드 안 함)
 */
export async function generateFormationAgendaBuffer(
  fundId: string,
  assemblyDate: string,
  content: FormationAgendaContent
): Promise<Buffer> {
  try {
    const brandClient = await createBrandServerClient();

    // 펀드 정보 조회
    const { data: fund, error: fundError } = await brandClient.funds
      .select('name')
      .eq('id', fundId)
      .single();

    if (fundError || !fund) {
      throw new Error('펀드 정보를 가져오는데 실패했습니다.');
    }

    // PDF 생성
    const pdfBuffer = await generateFormationAgendaPDF({
      fund_name: fund.name,
      assembly_date: assemblyDate,
      content,
    });

    return pdfBuffer;
  } catch (error) {
    console.error('결성총회 의안 생성 실패:', error);
    throw new Error('결성총회 의안 생성에 실패했습니다.');
  }
}

/**
 * 다음에 생성할 문서 정보 조회
 */
export async function getNextDocumentInfo(
  assemblyId: string
): Promise<NextDocumentInfo | null> {
  const brandClient = await createBrandServerClient();

  // 총회 정보 조회
  const { data: assembly, error } = await brandClient.raw
    .from('assemblies')
    .select('*, funds(name)')
    .eq('id', assemblyId)
    .single();

  if (error || !assembly) {
    throw new Error('총회 정보를 가져오는데 실패했습니다.');
  }

  // 이미 생성된 문서 조회
  const { data: existingDocs, error: docsError } =
    await brandClient.assemblyDocuments
      .select('type')
      .eq('assembly_id', assemblyId);

  if (docsError) {
    throw new Error('문서 목록을 가져오는데 실패했습니다.');
  }

  const existingTypes = new Set(
    existingDocs?.map((d: { type: string }) => d.type) || []
  );

  // 총회 타입별 필요한 문서 목록
  const requiredDocs =
    ASSEMBLY_DOCUMENT_TYPES[assembly.type as AssemblyType] || [];

  // 아직 생성되지 않은 문서 찾기
  const nextDocType = requiredDocs.find(
    (type: AssemblyDocumentType) => !existingTypes.has(type)
  );

  if (!nextDocType) {
    return null; // 모든 문서 생성 완료
  }

  // 문서 타입별 정보 반환
  switch (nextDocType) {
    case 'formation_member_list':
      return {
        document_type: nextDocType,
        requires_input: false,
      };

    case 'formation_agenda':
      const fundName = (assembly.funds as any)?.name || '';
      return {
        document_type: nextDocType,
        requires_input: true,
        default_content: {
          formation_agenda: getDefaultFormationAgendaContent(fundName),
        },
      };

    default:
      // 아직 구현되지 않은 문서 타입
      return {
        document_type: nextDocType,
        requires_input: false,
      };
  }
}

/**
 * 문서 PDF 생성 (Buffer만 반환, Storage 업로드 안 함)
 */
export async function generateAssemblyDocumentBuffer(params: {
  assemblyId: string;
  documentType: AssemblyDocumentType;
  content?: any;
}): Promise<{ pdfBuffer: Buffer; content: any }> {
  const brandClient = await createBrandServerClient();

  // 총회 정보 조회
  const { data: assembly, error } = await brandClient.raw
    .from('assemblies')
    .select('*, funds(name)')
    .eq('id', params.assemblyId)
    .single();

  if (error || !assembly) {
    throw new Error('총회 정보를 가져오는데 실패했습니다.');
  }

  let pdfBuffer: Buffer;
  let documentContent: any = null;

  // 문서 타입에 따라 생성
  switch (params.documentType) {
    case 'formation_member_list':
      pdfBuffer = await generateMemberListBuffer(
        assembly.fund_id,
        assembly.assembly_date
      );
      break;

    case 'formation_agenda':
      if (!params.content?.formation_agenda) {
        throw new Error('의안 내용이 필요합니다.');
      }
      pdfBuffer = await generateFormationAgendaBuffer(
        assembly.fund_id,
        assembly.assembly_date,
        params.content.formation_agenda
      );
      documentContent = params.content;
      break;

    default:
      throw new Error('지원되지 않는 문서 타입입니다.');
  }

  return {
    pdfBuffer,
    content: documentContent,
  };
}

/**
 * 문서 생성 및 저장 (PDF 재생성 → Storage 업로드 → DB 저장)
 */
export async function saveAssemblyDocument(params: {
  assemblyId: string;
  documentType: AssemblyDocumentType;
  content?: any;
  generatedBy: string;
  brand: string;
}): Promise<{ documentId: string }> {
  const brandClient = await createBrandServerClient();

  // 총회 정보 조회
  const { data: assembly, error: assemblyError } = await brandClient.raw
    .from('assemblies')
    .select('fund_id, assembly_date')
    .eq('id', params.assemblyId)
    .single();

  if (assemblyError || !assembly) {
    throw new Error('총회 정보를 가져오는데 실패했습니다.');
  }

  // 기존 문서가 있는지 확인하고 있으면 삭제
  const { data: existingDoc } = await brandClient.assemblyDocuments
    .select('id, pdf_storage_path')
    .eq('assembly_id', params.assemblyId)
    .eq('type', params.documentType)
    .single();

  if (existingDoc) {
    // 기존 Storage 파일 삭제 (선택사항)
    if (existingDoc.pdf_storage_path) {
      await brandClient.raw.storage
        .from('generated-documents')
        .remove([existingDoc.pdf_storage_path]);
    }
    // DB 레코드 삭제
    await brandClient.assemblyDocuments.delete().eq('id', existingDoc.id);
  }

  // PDF 재생성
  const { pdfBuffer } = await generateAssemblyDocumentBuffer({
    assemblyId: params.assemblyId,
    documentType: params.documentType,
    content: params.content,
  });

  // Storage에 업로드
  const fileName = `${assembly.fund_id}/assembly/${
    params.documentType
  }_${Date.now()}.pdf`;
  const storagePath = await uploadFileToStorage({
    bucket: 'generated-documents',
    path: fileName,
    file: pdfBuffer,
    contentType: 'application/pdf',
    brand: params.brand,
  });

  // DB에 문서 정보 저장
  const { data: document, error: docError } =
    await brandClient.assemblyDocuments
      .insert({
        assembly_id: params.assemblyId,
        type: params.documentType,
        content: params.content,
        pdf_storage_path: storagePath,
        generated_by: params.generatedBy,
      })
      .select()
      .single();

  if (docError) {
    console.error('문서 정보 저장 실패:', docError);
    throw new Error('문서 정보 저장에 실패했습니다.');
  }

  return {
    documentId: document.id,
  };
}

/**
 * 문서 생성 (통합) - 하위 호환성을 위해 유지
 * @deprecated generateAssemblyDocumentBuffer와 saveAssemblyDocument를 사용하세요
 */
export async function generateAssemblyDocument(params: {
  assemblyId: string;
  documentType: AssemblyDocumentType;
  content?: any;
  generatedBy: string;
  brand: string;
}): Promise<{ documentId: string; pdfUrl: string }> {
  const brandClient = await createBrandServerClient();

  // DB 저장 (내부에서 PDF 재생성 및 업로드)
  const saveResult = await saveAssemblyDocument({
    assemblyId: params.assemblyId,
    documentType: params.documentType,
    content: params.content,
    generatedBy: params.generatedBy,
    brand: params.brand,
  });

  // 저장된 문서 조회하여 URL 반환
  const { data: document } = await brandClient.assemblyDocuments
    .select('pdf_storage_path')
    .eq('id', saveResult.documentId)
    .single();

  const { data: urlData } = brandClient.raw.storage
    .from('generated-documents')
    .getPublicUrl(document?.pdf_storage_path || '');

  return {
    documentId: saveResult.documentId,
    pdfUrl: urlData.publicUrl,
  };
}
