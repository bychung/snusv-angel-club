// 조합원 총회 문서 생성 헬퍼 함수

import { createBrandServerClient } from '@/lib/supabase/server';
import type {
  AssemblyDocumentType,
  AssemblyType,
  FormationAgendaContent,
  FormationMinutesContent,
  MemberPage,
  NextDocumentInfo,
} from '@/types/assemblies';
import { ASSEMBLY_DOCUMENT_TYPES } from '@/types/assemblies';
import * as fs from 'fs';
import * as path from 'path';
import { getNameForSorting } from '../format-utils';
import {
  generateFormationAgendaPDF,
  getDefaultFormationAgendaTemplate,
} from '../pdf/formation-agenda-generator';
import {
  generateFormationConsentFormPDF,
  type FormationConsentFormContext,
  type FormationConsentFormTemplate,
} from '../pdf/formation-consent-form-generator';
import { generateFormationMinutesPDF } from '../pdf/formation-minutes-generator';
import { generateMemberListPDF } from '../pdf/member-list-generator';
import { extractPdfPage } from '../pdf/pdf-splitter';
import { uploadFileToStorage } from '../storage/upload';
import { getActiveAssemblyTemplate } from './assembly-templates';

// 결성총회 문서 생성 순서
const FORMATION_DOCUMENT_ORDER: AssemblyDocumentType[] = [
  'formation_agenda',
  'formation_consent_form',
  // 'formation_minutes',
];

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
 * 조합원 명부 PDF 생성 (Buffer만 반환, Storage 업로드 안 함)
 */
export async function generateMemberListBufferWithInfo(
  fundId: string,
  assemblyDate: string
): Promise<{
  buffer: Buffer;
  id: string | null;
  version: string;
  content: any;
}> {
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

    return {
      buffer: pdfBuffer,
      id: template.id || null,
      version: template.version || 'none',
      content: template.content,
    };
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

  // 결성총회인 경우 순서를 보장
  let nextDocType: AssemblyDocumentType | undefined;

  if (assembly.type === 'formation') {
    // 결성총회는 순서대로 생성
    nextDocType = FORMATION_DOCUMENT_ORDER.find(
      type => !existingTypes.has(type)
    );
  } else {
    // 다른 총회는 순서 무관
    nextDocType = requiredDocs.find(
      (type: AssemblyDocumentType) => !existingTypes.has(type)
    );
  }

  if (!nextDocType) {
    return null; // 모든 문서 생성 완료
  }

  // formation_consent_form 생성 조건 확인
  if (nextDocType === 'formation_consent_form') {
    if (!existingTypes.has('formation_agenda')) {
      throw new Error('결성총회 의안을 먼저 생성해야 합니다.');
    }
  }

  // formation_minutes 생성 조건 확인
  if (nextDocType === 'formation_minutes') {
    if (!existingTypes.has('formation_consent_form')) {
      throw new Error('결성총회 의안 동의서를 먼저 생성해야 합니다.');
    }
  }

  // 템플릿 조회 (템플릿 시스템 통합)
  const template = await getActiveAssemblyTemplate(nextDocType);

  // formation_consent_form 자동 생성 문서
  if (nextDocType === 'formation_consent_form') {
    return {
      document_type: nextDocType,
      requires_input: false,
      editable: false,
      template: template
        ? {
            id: template.id,
            version: template.version,
            description: template.description || '',
          }
        : undefined,
    };
  }

  // formation_minutes는 특별 처리 (의안 문서 필요)
  if (nextDocType === 'formation_minutes') {
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
    const loadedTemplate = await loadFormationMinutesTemplate();
    const minutesTemplate = template || loadedTemplate;

    // 템플릿 구조 정규화 (DB 템플릿의 경우 content가 이미 있을 수 있음)
    const templateContent = (minutesTemplate as any).content || {
      title_template: (minutesTemplate as any).title_template,
      sections: (minutesTemplate as any).sections,
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
}): Promise<
  | {
      pdfBuffer: Buffer;
      content: any;
      context: any;
      template_id?: string;
      template_version?: string;
      memberPages?: MemberPage[]; // formation_consent_form용
    }
  | {
      pdfBuffer: Buffer;
      content: any;
      context: any;
      template_id?: string;
      template_version?: string;
      memberPages: MemberPage[]; // formation_consent_form용
    }
> {
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
  let memberPages: MemberPage[] | undefined;

  // 문서 타입에 따라 생성
  switch (params.documentType) {
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

    case 'formation_consent_form': {
      // 의안 문서에서 조합원 정보 및 펀드 정보 조회
      const { data: agendaDoc } = await brandClient.assemblyDocuments
        .select('content')
        .eq('assembly_id', params.assemblyId)
        .eq('type', 'formation_agenda')
        .single();

      if (!agendaDoc || !agendaDoc.content?.formation_agenda) {
        throw new Error('의안 문서를 먼저 생성해야 합니다.');
      }

      // 펀드 정보 조회
      const { data: fund } = await brandClient.funds
        .select('*')
        .eq('id', assembly.fund_id)
        .single();

      if (!fund) {
        throw new Error('펀드 정보를 가져오는데 실패했습니다.');
      }

      // 조합원 정보 조회
      const { gps, members } = await getFundMemberData(assembly.fund_id);

      // LP 조합원만 필터링
      type LpMemberInfo = {
        id: string;
        name: string;
        address: string;
        birthDateOrBusinessNumber: string;
        contact: string;
        shares: number;
        entity_type: 'individual' | 'corporate';
      };

      const lpMembers: LpMemberInfo[] = members
        .filter((m: any) => !gps.some((gp: any) => gp.id === m.id))
        .map((m: any) => ({
          id: m.id,
          name: m.name,
          address: m.address || '',
          birthDateOrBusinessNumber: m.birth_date || m.business_number || '',
          contact: m.phone || '',
          shares: m.units || 0,
          entity_type: m.entity_type || 'individual',
        }));

      // LP 조합원 가나다순 정렬
      lpMembers.sort((a, b) => {
        const nameA = getNameForSorting(a.name);
        const nameB = getNameForSorting(b.name);
        return nameA.localeCompare(nameB, 'ko-KR');
      });

      // GP 이름 목록 생성
      const gpList = gps.map((gp: any) => gp.name).join(', ');

      // 템플릿 로드
      let consentFormTemplate: FormationConsentFormTemplate;
      if (template && template.content) {
        consentFormTemplate = template.content as FormationConsentFormTemplate;
      } else {
        // 파일에서 로드
        const templatePath = path.join(
          process.cwd(),
          'template/formation-consent-form-template.json'
        );
        const templateContent = await fs.promises.readFile(
          templatePath,
          'utf-8'
        );
        const templateJson = JSON.parse(templateContent);
        // 템플릿 파일은 { content: { title, content: [] } } 구조
        consentFormTemplate = templateJson.content;
      }

      // PDF 생성 컨텍스트
      const consentFormContext: FormationConsentFormContext = {
        fund: {
          name: fund.name,
          nameEn: fund.name_en,
          closedAt: fund.closed_at,
        },
        gpList,
        lpMembers,
        generatedAt: new Date().toISOString(),
        startDate: assembly.assembly_date,
      };

      // PDF 생성
      const result = await generateFormationConsentFormPDF(
        consentFormTemplate,
        consentFormContext
      );

      pdfBuffer = result.pdfBuffer;
      memberPages = result.memberPages;

      // content: 템플릿 구조 저장 (문서 재구성을 위해)
      documentContent = {
        formation_consent_form: consentFormTemplate,
      };

      // context: 템플릿 변수들 저장 (문서 재구성을 위한 모든 데이터)
      documentContext = {
        fund: {
          name: fund.name,
          nameEn: fund.name_en,
          closedAt: fund.closed_at,
        },
        gpList,
        lpMembers, // 전체 LP 조합원 배열
        generatedAt: new Date().toISOString(),
        startDate: assembly.assembly_date,
        templateVersion: template?.version || '1.0.0',
        member_pages: memberPages, // 페이지 매핑 정보
      };
      break;
    }

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
    memberPages,
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
  const { data: existingDocs } = await brandClient.assemblyDocuments
    .select('id, pdf_storage_path, is_split_parent, parent_document_id')
    .eq('assembly_id', params.assemblyId)
    .eq('type', params.documentType);

  if (existingDocs && existingDocs.length > 0) {
    // 개별 문서들의 Storage 파일 삭제
    const storagePaths = existingDocs
      .map(doc => doc.pdf_storage_path)
      .filter(Boolean);
    if (storagePaths.length > 0) {
      await brandClient.raw.storage
        .from('generated-documents')
        .remove(storagePaths);
    }
    // DB 레코드 삭제
    const docIds = existingDocs.map(doc => doc.id);
    await brandClient.assemblyDocuments.delete().in('id', docIds);
  }

  // PDF 재생성
  const result = await generateAssemblyDocumentBuffer({
    assemblyId: params.assemblyId,
    documentType: params.documentType,
    content: params.content,
  });

  const {
    pdfBuffer,
    content: documentContent,
    context,
    template_id,
    template_version,
    memberPages,
  } = result;

  // formation_consent_form의 경우 통합 + 개별 저장 (전체 롤백 방식)
  if (params.documentType === 'formation_consent_form' && memberPages) {
    // 업로드된 파일 경로 추적 (롤백용)
    const uploadedPaths: string[] = [];
    let parentDocId: string | null = null;

    try {
      // 1. 통합 PDF 저장
      const fullFileName = `${assembly.fund_id}/assembly/${
        params.documentType
      }_full_${Date.now()}.pdf`;
      const fullStoragePath = await uploadFileToStorage({
        bucket: 'generated-documents',
        path: fullFileName,
        file: pdfBuffer,
        contentType: 'application/pdf',
        brand: params.brand,
      });
      uploadedPaths.push(fullStoragePath);

      // 2. 통합 문서 DB 저장
      const { data: parentDoc, error: parentDocError } =
        await brandClient.assemblyDocuments
          .insert({
            assembly_id: params.assemblyId,
            type: params.documentType,
            content: documentContent,
            context,
            template_id,
            template_version,
            pdf_storage_path: fullStoragePath,
            generated_by: params.generatedBy,
            is_split_parent: true,
          })
          .select()
          .single();

      if (parentDocError || !parentDoc) {
        throw new Error(
          `통합 문서 DB 저장 실패: ${
            parentDocError?.message || '알 수 없는 오류'
          }`
        );
      }

      parentDocId = parentDoc.id;

      // 3. 개별 PDF 생성 및 저장 (하나라도 실패하면 throw)
      for (const memberPage of memberPages) {
        // 페이지 추출
        const individualPdfBuffer = await extractPdfPage(
          pdfBuffer,
          memberPage.page_number
        );

        // Storage 업로드 (재시도 포함)
        const individualFileName = `${assembly.fund_id}/assembly/${
          params.documentType
        }_member_${memberPage.member_id}_${Date.now()}.pdf`;
        const individualStoragePath = await uploadFileToStorage({
          bucket: 'generated-documents',
          path: individualFileName,
          file: individualPdfBuffer,
          contentType: 'application/pdf',
          brand: params.brand,
        });
        uploadedPaths.push(individualStoragePath);

        // 해당 조합원 데이터 찾기
        const memberData = (context as any).lpMembers.find(
          (m: any) => m.id === memberPage.member_id
        );

        if (!memberData) {
          throw new Error(
            `조합원 데이터를 찾을 수 없습니다: ${memberPage.member_name} (${memberPage.member_id})`
          );
        }

        // DB 저장
        const { error: insertError } =
          await brandClient.assemblyDocuments.insert({
            assembly_id: params.assemblyId,
            type: params.documentType,
            // content: 부모와 동일한 템플릿 구조 (문서 재구성을 위해)
            content: documentContent,
            // context: 해당 조합원 한 명의 데이터 (문서 재구성을 위해)
            context: {
              fund: (context as any).fund,
              gpList: (context as any).gpList,
              lpMembers: [memberData], // 해당 조합원 한 명만
              generatedAt: (context as any).generatedAt,
              startDate: (context as any).startDate,
              templateVersion: (context as any).templateVersion,
              page_number: memberPage.page_number, // 페이지 번호 (참고용)
            },
            template_id,
            template_version,
            pdf_storage_path: individualStoragePath,
            generated_by: params.generatedBy,
            is_split_parent: false,
            parent_document_id: parentDoc.id,
            member_id: memberPage.member_id,
          });

        if (insertError) {
          throw new Error(
            `조합원 ${memberPage.member_name}의 DB 저장 실패: ${insertError.message}`
          );
        }
      }

      // 모든 문서 생성 성공
      console.log(`문서 생성 완료: 통합 1개 + 개별 ${memberPages.length}개`);
      return {
        documentId: parentDoc.id,
      };
    } catch (error) {
      // 롤백 시작
      console.error('문서 생성 중 오류 발생, 롤백 시작:', error);

      // 1. DB 문서 삭제
      if (parentDocId) {
        try {
          await brandClient.assemblyDocuments
            .delete()
            .eq('assembly_id', params.assemblyId)
            .eq('type', params.documentType);
          console.log('DB 문서 롤백 완료');
        } catch (dbError) {
          console.error('DB 롤백 실패:', dbError);
        }
      }

      // 2. Storage 파일 삭제
      if (uploadedPaths.length > 0) {
        try {
          await brandClient.raw.storage
            .from('generated-documents')
            .remove(uploadedPaths);
          console.log(`Storage 파일 롤백 완료: ${uploadedPaths.length}개`);
        } catch (storageError) {
          console.error('Storage 롤백 실패:', storageError);
        }
      }

      // 사용자에게 명확한 에러 메시지
      throw new Error(
        `문서 생성 실패: ${
          error instanceof Error ? error.message : '알 수 없는 오류'
        }. ` + 'Storage 일시적 오류일 수 있습니다. 잠시 후 다시 시도해주세요.'
      );
    }
  }

  // 일반 문서 저장 (기존 로직)
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
        content: documentContent,
        context,
        template_id,
        template_version,
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
