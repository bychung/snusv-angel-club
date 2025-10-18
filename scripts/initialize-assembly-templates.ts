/**
 * 조합원 총회 문서 템플릿 초기 데이터 삽입 스크립트
 *
 * 실행 방법:
 * npx tsx scripts/initialize-assembly-templates.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { getDefaultFormationAgendaTemplate } from '../lib/pdf/formation-agenda-generator';
import { getDefaultMemberListTemplate } from '../lib/pdf/member-list-generator';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 결성총회 의안 템플릿
 * editable: true (사용자가 편집 가능)
 */
const formationAgendaTemplate = {
  type: 'formation_agenda',
  version: '1.0.0',
  content: getDefaultFormationAgendaTemplate(), // PDF generator와 동일한 기본값 사용
  editable: true, // 사용자 편집 가능
  is_active: true,
  description: '의안 내용을 검토하고 필요시 수정하세요.',
  fund_id: null, // 글로벌 템플릿
};

/**
 * 조합원 명부 템플릿
 * editable: false (자동 생성)
 */
const formationMemberListTemplate = {
  type: 'formation_member_list',
  version: '1.0.0',
  content: getDefaultMemberListTemplate(), // PDF generator와 동일한 기본값 사용
  editable: false, // 자동 생성 (사용자 편집 불가)
  is_active: true,
  description:
    '이 문서는 현재 펀드의 조합원 정보를 바탕으로 자동으로 생성됩니다.',
  fund_id: null, // 글로벌 템플릿
};

async function main() {
  console.log('🚀 조합원 총회 문서 템플릿 초기화 시작...\n');

  try {
    // 1. 기존 템플릿 확인
    console.log('1️⃣ 기존 템플릿 확인 중...');
    const { data: existingTemplates, error: checkError } = await supabase
      .from('document_templates')
      .select('id, type, version, is_active')
      .in('type', ['formation_agenda', 'formation_member_list'])
      .is('fund_id', null);

    if (checkError) {
      throw new Error(`템플릿 확인 실패: ${checkError.message}`);
    }

    if (existingTemplates && existingTemplates.length > 0) {
      console.log('⚠️  이미 존재하는 템플릿:');
      existingTemplates.forEach(t => {
        console.log(
          `   - ${t.type} (v${t.version}) ${t.is_active ? '[활성]' : ''}`
        );
      });
      console.log('\n기존 템플릿을 삭제하고 새로 생성하시겠습니까? (Y/N)');
      console.log('취소하려면 Ctrl+C를 눌러주세요.');
      // 실제로는 사용자 입력을 받아야 하지만, 스크립트에서는 자동으로 진행
      console.log('⏩ 자동 진행: 기존 템플릿 유지, 새 템플릿만 추가\n');
    }

    // 2. 결성총회 의안 템플릿 삽입
    console.log('2️⃣ 결성총회 의안 템플릿 삽입 중...');
    const existingAgenda = existingTemplates?.find(
      t => t.type === 'formation_agenda'
    );

    if (existingAgenda) {
      console.log(
        `   ⏭️  이미 존재함 (${existingAgenda.type} v${existingAgenda.version}), 스킵`
      );
    } else {
      const { data: agendaData, error: agendaError } = await supabase
        .from('document_templates')
        .insert(formationAgendaTemplate)
        .select()
        .single();

      if (agendaError) {
        throw new Error(`의안 템플릿 삽입 실패: ${agendaError.message}`);
      }

      console.log(`   ✅ 성공: ${agendaData.type} (v${agendaData.version})`);
    }

    // 3. 조합원 명부 템플릿 삽입
    console.log('3️⃣ 조합원 명부 템플릿 삽입 중...');
    const existingMemberList = existingTemplates?.find(
      t => t.type === 'formation_member_list'
    );

    if (existingMemberList) {
      console.log(
        `   ⏭️  이미 존재함 (${existingMemberList.type} v${existingMemberList.version}), 스킵`
      );
    } else {
      const { data: memberListData, error: memberListError } = await supabase
        .from('document_templates')
        .insert(formationMemberListTemplate)
        .select()
        .single();

      if (memberListError) {
        throw new Error(`명부 템플릿 삽입 실패: ${memberListError.message}`);
      }

      console.log(
        `   ✅ 성공: ${memberListData.type} (v${memberListData.version})`
      );
    }

    // 4. 최종 결과 확인
    console.log('\n4️⃣ 최종 결과 확인 중...');
    const { data: finalTemplates, error: finalError } = await supabase
      .from('document_templates')
      .select('id, type, version, editable, is_active, created_at')
      .in('type', ['formation_agenda', 'formation_member_list'])
      .is('fund_id', null)
      .order('type', { ascending: true });

    if (finalError) {
      throw new Error(`최종 확인 실패: ${finalError.message}`);
    }

    console.log('\n📋 등록된 조합원 총회 템플릿:');
    finalTemplates?.forEach(t => {
      console.log(`   - ${t.type}`);
      console.log(`     버전: ${t.version}`);
      console.log(`     편집 가능: ${t.editable ? 'O' : 'X'}`);
      console.log(`     활성: ${t.is_active ? 'O' : 'X'}`);
      console.log(
        `     생성일: ${new Date(t.created_at).toLocaleString('ko-KR')}`
      );
      console.log('');
    });

    console.log('✅ 조합원 총회 문서 템플릿 초기화 완료!\n');
  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  }
}

main();
