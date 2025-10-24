// 조합원 총회 문서 생성 헬퍼 함수

import { createBrandServerClient } from '@/lib/supabase/server';
import type {
  AssemblyDocumentType,
  AssemblyType,
  FormationAgendaContent,
  FormationMinutesContent,
  NextDocumentInfo,
} from '@/types/assemblies';
import { ASSEMBLY_DOCUMENT_TYPES } from '@/types/assemblies';
import * as fs from 'fs';
import * as path from 'path';
import {
  generateFormationAgendaPDF,
  getDefaultFormationAgendaTemplate,
} from '../pdf/formation-agenda-generator';
import { generateFormationMinutesPDF } from '../pdf/formation-minutes-generator';
import {
  generateMemberListPDF,
  getDefaultMemberListTemplate,
} from '../pdf/member-list-generator';
import { loadExternalTemplate } from '../pdf/template-loader';
import { uploadFileToStorage } from '../storage/upload';
import { getActiveAssemblyTemplate } from './assembly-templates';

/**
 * 템플릿 JSON 파일 로드
 */
async function loadFormationMinutesTemplate(): Promise<any> {
  try {
    const filePath = path.join(
      process.cwd(),
      'template/formation-minutes-template.json'
    );
    const fileContent = await fs.promises.readFile(filePath, 'utf-8');
    const template = JSON.parse(fileContent);

    // JSON 파일 구조가 최상위에 title_template, sections가 있는 경우
    // content 속성으로 감싸서 정규화
    if (template.title_template && !template.content) {
      return {
        type: template.type || 'formation_minutes',
        version: template.version || '1.0.0',
        content: {
          title_template: template.title_template,
          sections: template.sections,
        },
      };
    }

    return template;
  } catch (error) {
    console.error('템플릿 파일 로드 실패:', error);
    // 기본 fallback 템플릿
    return {
      type: 'formation_minutes',
      version: '1.0.0',
      content: {
        title_template: '{fund_name} 결성총회 의사록',
        sections: {
          time: {
            label: '1. 일시:',
            value_template: '{assembly_date} {assembly_time}',
          },
          location: {
            label: '2. 장소:',
            default_value: '업무집행조합원 회의실 (서면으로 진행)',
          },
          attendance: {
            label: '3. 출자자 및 출석 현황:',
            template:
              '총 조합원 {total_members}명 중 {attended_members}명 출석',
          },
          member_table: {
            columns: [
              { key: 'type', label: '구분', width: 80 },
              { key: 'name', label: '조합원명', width: 120 },
              { key: 'units', label: '총 출자좌수', width: 80 },
              { key: 'name2', label: '조합원명', width: 120 },
              { key: 'units2', label: '총 출자좌수', width: 80 },
            ],
          },
          opening: {
            label: '4. 개회선언:',
            template:
              '업무집행조합원인 {gp_names_full}은 본회의가 규약에 의해 적법하게 성립되었음을 확인하고 개회를 선언하다. 의장은 규약에 따라 공동의장으로 각 업무집행조합원 {gp_names_full}이 맡다. 의장은 조합원 출자좌수의 {attendance_rate}%가 출석하였음을 보고하다. 이어 아래와 같이 의안 심의를 진행하다.',
          },
          agendas: {
            label: '5. 의안심의',
            agenda_template: '제{index}호의안: {title}',
            default_result: '원안대로 승인하다',
          },
          closing: {
            template:
              '상기와 같이 상정된 의안과 결과에 대해 이의가 없음을 확인한 후 의장은 상정된 의안들이 승인되었음을 선언하다. 의장은 이상으로 조합원총회의 목적사항에 대한 심의 및 의결을 종료하였으므로 폐회를 선언하다.\n\n위 의사의 경과요령과 결과를 명확히 하기 위하여 이 의사록을 작성하고 업무집행조합원이 아래와 같이 기명 날인하다.',
          },
          signature: {
            date_label: '{assembly_date}',
            fund_name_label: '{fund_name}',
            gp_label: '업무집행조합원',
            seal_text: '(인)',
          },
        },
      },
    };
  }
}

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

    // 템플릿 조회 (선택사항)
    const template = await getActiveAssemblyTemplate('formation_member_list');

    // PDF 생성
    const pdfBuffer = await generateMemberListPDF({
      fund_name: fund.name,
      assembly_date: assemblyDate,
      gps: gpInfos,
      members: memberInfos,
      template: template || undefined,
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

    // 템플릿 조회 (선택사항)
    const template = await getActiveAssemblyTemplate('formation_agenda');

    // PDF 생성
    const pdfBuffer = await generateFormationAgendaPDF({
      fund_name: fund.name,
      assembly_date: assemblyDate,
      content,
      template: template || undefined,
    });

    return pdfBuffer;
  } catch (error) {
    console.error('결성총회 의안 생성 실패:', error);
    throw new Error('결성총회 의안 생성에 실패했습니다.');
  }
}

/**
 * 결성총회 의사록 PDF 생성 (Buffer만 반환, Storage 업로드 안 함)
 */
export async function generateFormationMinutesBuffer(
  fundId: string,
  assemblyId: string,
  content: FormationMinutesContent
): Promise<{
  pdfBuffer: Buffer;
  context: any;
}> {
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

    // 총회 정보 조회
    const { data: assembly, error: assemblyError } =
      await brandClient.assemblies
        .select('assembly_date')
        .eq('id', assemblyId)
        .single();

    if (assemblyError || !assembly) {
      throw new Error('총회 정보를 가져오는데 실패했습니다.');
    }

    // 조합원 정보 조회
    const { gps, members } = await getFundMemberData(fundId);

    // 전체 조합원 목록 생성
    const allMembers = [
      ...gps.map((gp: any) => ({
        id: gp.id,
        name: gp.name,
        type: '업무집행조합원' as const,
        units: members.find((m: any) => m.id === gp.id)?.units || 0,
        entity_type: gp.entity_type,
        representative: gp.representative,
      })),
      ...members
        .filter((m: any) => !gps.some((gp: any) => gp.id === m.id))
        .map((m: any) => ({
          id: m.id,
          name: m.name,
          type: '유한책임조합원' as const,
          units: m.units,
          entity_type: m.entity_type,
        })),
    ];

    // 출석 조합원 필터링 (content.sections.attendance.attended_member_ids 기반)
    const attendedMemberIds =
      content.sections.attendance.attended_member_ids || [];
    const attendedMembers = allMembers.filter(m =>
      attendedMemberIds.includes(m.id)
    );

    // GP 정보 포맷팅
    const gpList = gps.map((gp: any) => ({
      name: gp.name,
      representative: gp.representative || null,
      is_entity: gp.entity_type === 'corporate',
    }));

    // GP 이름 조합 (개회선언용)
    const gpNamesFullParts = gpList.map((gp: any) => {
      if (gp.is_entity && gp.representative) {
        return `${gp.name} 대표이사 ${gp.representative}`;
      }
      return gp.name;
    });
    const gpNamesFull =
      gpNamesFullParts.length > 1
        ? gpNamesFullParts.slice(0, -1).join(', ') +
          ' 및 ' +
          gpNamesFullParts[gpNamesFullParts.length - 1]
        : gpNamesFullParts[0] || '';

    // context 생성
    const context = {
      fund_name: fund.name,
      assembly_date: assembly.assembly_date,
      assembly_date_raw: assembly.assembly_date,
      assembly_time: '오후 2시', // 템플릿 기본값
      all_members: allMembers,
      attended_members_data: attendedMembers,
      gp_list: gpList,
      gp_names_full: gpNamesFull,
      generated_at: new Date().toISOString(),
    };

    // 템플릿 조회 (선택사항)
    const template = await getActiveAssemblyTemplate('formation_minutes');

    // PDF 생성
    const pdfBuffer = await generateFormationMinutesPDF({
      content,
      context,
      template: template || undefined,
    });

    return { pdfBuffer, context };
  } catch (error) {
    console.error('결성총회 의사록 생성 실패:', error);
    throw new Error('결성총회 의사록 생성에 실패했습니다.');
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
  const { data: assembly, error } = await brandClient.assemblies
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

  // 템플릿 조회 (템플릿 시스템 통합)
  const template = await getActiveAssemblyTemplate(nextDocType);

  // formation_minutes는 특별 처리 (의안 문서 필요)
  if (nextDocType === 'formation_minutes') {
    // 의안 문서가 생성되어 있는지 확인
    if (!existingTypes.has('formation_agenda')) {
      throw new Error('결성총회 의안을 먼저 생성해야 합니다.');
    }

    // 의안 문서 조회
    const { data: agendaDoc } = await brandClient.assemblyDocuments
      .select('content')
      .eq('assembly_id', assemblyId)
      .eq('type', 'formation_agenda')
      .single();

    if (!agendaDoc || !agendaDoc.content?.formation_agenda) {
      throw new Error('의안 문서 정보를 가져올 수 없습니다.');
    }

    const agendaContent = agendaDoc.content.formation_agenda;

    // 조합원 정보 조회
    const { gps, members } = await getFundMemberData((assembly as any).fund_id);

    // 전체 조합원 목록 생성
    const allMembers = [
      ...gps.map((gp: any) => ({
        id: gp.id,
        name: gp.name,
        type: '업무집행조합원',
        units: members.find((m: any) => m.id === gp.id)?.units || 0,
      })),
      ...members
        .filter((m: any) => !gps.some((gp: any) => gp.id === m.id))
        .map((m: any) => ({
          id: m.id,
          name: m.name,
          type: '유한책임조합원',
          units: m.units,
        })),
    ];

    // 템플릿 로드 (JSON 파일 또는 DB)
    const minutesTemplate = template || (await loadFormationMinutesTemplate());

    // 템플릿 구조 정규화 (DB 템플릿의 경우 content가 이미 있을 수 있음)
    const templateContent = minutesTemplate.content || {
      title_template: minutesTemplate.title_template,
      sections: minutesTemplate.sections,
    };

    // 템플릿 검증
    if (!templateContent || !templateContent.sections) {
      throw new Error('템플릿 구조가 올바르지 않습니다.');
    }

    // 기본 content 생성 (템플릿 전체 + 기본값)
    const defaultContent = {
      ...templateContent,
      sections: {
        ...templateContent.sections,
        location: {
          ...templateContent.sections.location,
          value:
            templateContent.sections.location.default_value ||
            '업무집행조합원 회의실 (서면으로 진행)',
        },
        attendance: {
          ...templateContent.sections.attendance,
          attended_member_ids: allMembers.map(m => m.id), // 기본값: 전원 출석
        },
        agendas: {
          ...templateContent.sections.agendas,
          items: agendaContent.agendas.map((agenda: any) => ({
            index: agenda.index,
            title: agenda.title,
            result:
              templateContent.sections.agendas.default_result ||
              '원안대로 승인하다',
          })),
        },
      },
    };

    return {
      document_type: nextDocType,
      requires_input: true,
      editable: true,
      template: template
        ? {
            id: template.id,
            version: template.version,
            description: template.description || '',
          }
        : undefined,
      default_content: {
        formation_minutes: defaultContent,
      },
      preview_data: {
        fund_name: (assembly.funds as any)?.name || '',
        assembly_date: assembly.assembly_date,
        all_members: allMembers,
      },
    };
  }

  // 템플릿이 없으면 기존 방식 사용 (하위 호환성)
  if (!template) {
    // 기존 방식 (fallback) - loadExternalTemplate 사용 (DB → 파일 → 코드 기본값)
    switch (nextDocType) {
      case 'formation_member_list': {
        let memberListTemplate = null;
        try {
          // DB → 파일 순서로 템플릿 로드 시도
          memberListTemplate = await loadExternalTemplate(
            'member-list-template'
          );
        } catch (error) {
          // 둘 다 없으면 코드 기본값 사용
          console.log('외부 템플릿 로드 실패, 코드 기본값 사용:', error);
          memberListTemplate = getDefaultMemberListTemplate();
        }

        return {
          document_type: nextDocType,
          requires_input: false,
          default_content: {
            formation_member_list: memberListTemplate,
          } as any,
        };
      }

      case 'formation_agenda':
        return {
          document_type: nextDocType,
          requires_input: true,
          default_content: {
            formation_agenda: getDefaultFormationAgendaTemplate(),
          } as any,
        };

      default:
        return {
          document_type: nextDocType,
          requires_input: false,
        };
    }
  }

  // 템플릿 기반 정보 반환
  const editable = template.editable ?? false;

  if (editable) {
    // 사용자 편집 가능 문서
    return {
      document_type: nextDocType,
      requires_input: true,
      editable: true,
      template: {
        id: template.id,
        version: template.version,
        description: template.description || '',
      },
      default_content: {
        [nextDocType]: template.content,
      },
    };
  } else {
    // 자동 생성 문서
    return {
      document_type: nextDocType,
      requires_input: false,
      editable: false,
      template: {
        id: template.id,
        version: template.version,
        description: template.description || '',
      },
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
}): Promise<{
  pdfBuffer: Buffer;
  content: any;
  context: any;
  template_id?: string;
  template_version?: string;
}> {
  const brandClient = await createBrandServerClient();

  // 총회 정보 조회
  const { data: assembly, error } = await brandClient.assemblies
    .select('*, funds(name)')
    .eq('id', params.assemblyId)
    .single();

  if (error || !assembly) {
    throw new Error('총회 정보를 가져오는데 실패했습니다.');
  }

  // 템플릿 조회
  const template = await getActiveAssemblyTemplate(params.documentType);

  let pdfBuffer: Buffer;
  let documentContent: any = null;
  let documentContext: any = {};

  // 문서 타입에 따라 생성
  switch (params.documentType) {
    case 'formation_member_list':
      // context 생성: 조합원 목록 스냅샷
      const { fund, gps, members } = await getFundMemberData(assembly.fund_id);
      documentContext = {
        fund_name: fund.name,
        assembly_date: assembly.assembly_date,
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

      // 템플릿 전달하여 PDF 생성
      pdfBuffer = await generateMemberListPDF({
        fund_name: fund.name,
        assembly_date: assembly.assembly_date,
        gps: gps.map((gp: any) => ({
          id: gp.id,
          name: gp.name,
          representative: null,
          entity_type: gp.entity_type as 'individual' | 'corporate',
        })),
        members: members.map((m: any) => ({
          name: m.name,
          entity_type: m.entity_type as 'individual' | 'corporate',
          birth_date: m.birth_date,
          business_number: m.business_number,
          address: m.address,
          phone: m.phone,
          units: m.units,
        })),
        template: template || undefined,
      });
      break;

    case 'formation_agenda':
      if (!params.content?.formation_agenda) {
        throw new Error('의안 내용이 필요합니다.');
      }

      // content 생성: 사용자 편집 데이터
      documentContent = params.content;

      // context 생성: 자동 생성 데이터
      documentContext = {
        fund_name: (assembly.funds as any)?.name || '',
        assembly_date: assembly.assembly_date,
        generated_at: new Date().toISOString(),
      };

      // 템플릿 전달하여 PDF 생성
      pdfBuffer = await generateFormationAgendaPDF({
        fund_name: documentContext.fund_name,
        assembly_date: documentContext.assembly_date,
        content: params.content.formation_agenda,
        template: template || undefined,
      });
      break;

    case 'formation_minutes':
      if (!params.content?.formation_minutes) {
        throw new Error('의사록 내용이 필요합니다.');
      }

      // content 생성: 사용자 편집 데이터
      documentContent = params.content;

      // Buffer와 context 생성
      const minutesResult = await generateFormationMinutesBuffer(
        assembly.fund_id,
        params.assemblyId,
        params.content.formation_minutes
      );

      pdfBuffer = minutesResult.pdfBuffer;
      documentContext = minutesResult.context;
      break;

    default:
      throw new Error('지원되지 않는 문서 타입입니다.');
  }

  return {
    pdfBuffer,
    content: documentContent,
    context: documentContext,
    template_id: template?.id,
    template_version: template?.version,
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
  const { data: assembly, error: assemblyError } = await brandClient.assemblies
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
  const { pdfBuffer, content, context, template_id, template_version } =
    await generateAssemblyDocumentBuffer({
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

  // DB에 문서 정보 저장 (content와 context 분리)
  const { data: document, error: docError } =
    await brandClient.assemblyDocuments
      .insert({
        assembly_id: params.assemblyId,
        type: params.documentType,
        content, // 사용자 편집 데이터
        context, // 자동 생성 데이터 (스냅샷)
        template_id, // 템플릿 ID
        template_version, // 템플릿 버전
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

/**
 * PDF 재생성 함수
 * 기존 문서의 content와 context를 사용하여 PDF를 다시 생성
 * 사용 사례:
 * - 관리자가 과거 문서 재다운로드
 * - 템플릿 수정 후 기존 문서 업데이트
 */
export async function regenerateAssemblyDocument(params: {
  documentId: string;
  useCurrentTemplate?: boolean; // true면 현재 활성 템플릿 사용, false면 저장된 템플릿 버전 사용
}): Promise<Buffer> {
  const brandClient = await createBrandServerClient();

  // 기존 문서 조회
  const { data: document, error } = await brandClient.assemblyDocuments
    .select('*, assemblies(fund_id, assembly_date, funds(name))')
    .eq('id', params.documentId)
    .single();

  if (error || !document) {
    throw new Error('문서를 찾을 수 없습니다.');
  }

  const assembly = document.assemblies as any;
  const fundName = assembly?.funds?.name || '';
  const assemblyDate = assembly?.assembly_date || '';
  const fundId = assembly?.fund_id || '';

  // 템플릿 조회 (현재 템플릿 또는 저장된 버전)
  let template = null;
  if (params.useCurrentTemplate) {
    // 현재 활성 템플릿 사용
    template = await getActiveAssemblyTemplate(document.type);
  } else if (document.template_id) {
    // 저장된 템플릿 버전 사용
    const { data: savedTemplate } = await brandClient.documentTemplates
      .select('*')
      .eq('id', document.template_id)
      .single();
    template = savedTemplate;
  }

  // content와 context 복원
  const content = document.content;
  const context = document.context;

  let pdfBuffer: Buffer;

  // 문서 타입에 따라 재생성
  switch (document.type) {
    case 'formation_member_list':
      // context에서 조합원 정보 복원
      if (!context || !context.members) {
        throw new Error('문서 복원에 필요한 정보가 없습니다.');
      }

      const gpInfos = context.gp_info || [];
      const memberInfos = context.members || [];

      pdfBuffer = await generateMemberListPDF({
        fund_name: context.fund_name || fundName,
        assembly_date: context.assembly_date || assemblyDate,
        gps: gpInfos,
        members: memberInfos,
        template: template || undefined,
      });
      break;

    case 'formation_agenda':
      // content에서 의안 정보 복원
      if (!content || !content.formation_agenda) {
        throw new Error('의안 정보를 찾을 수 없습니다.');
      }

      pdfBuffer = await generateFormationAgendaPDF({
        fund_name: context?.fund_name || fundName,
        assembly_date: context?.assembly_date || assemblyDate,
        content: content.formation_agenda,
        template: template || undefined,
      });
      break;

    case 'formation_minutes':
      // content에서 의사록 정보 복원
      if (!content || !content.formation_minutes) {
        throw new Error('의사록 정보를 찾을 수 없습니다.');
      }

      // context에서 복원
      if (!context) {
        throw new Error('의사록 컨텍스트 정보를 찾을 수 없습니다.');
      }

      pdfBuffer = await generateFormationMinutesPDF({
        content: content.formation_minutes,
        context,
        template: template || undefined,
      });
      break;

    default:
      throw new Error('지원되지 않는 문서 타입입니다.');
  }

  return pdfBuffer;
}
