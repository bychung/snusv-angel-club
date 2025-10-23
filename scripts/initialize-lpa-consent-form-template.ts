/**
 * LPA 규약 동의서 템플릿 초기화 스크립트
 *
 * 기존 LPA template의 appendix2를 그대로 복사하여
 * 독립적인 lpa_consent_form 템플릿으로 생성합니다.
 *
 * 실행 방법:
 * npx tsx scripts/initialize-lpa-consent-form-template.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error(
    '   SUPABASE_SERVICE_ROLE_KEY:',
    supabaseServiceKey ? '✓' : '✗'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function initializeLpaConsentFormTemplate() {
  console.log('🚀 LPA 규약 동의서 템플릿 초기화 시작...\n');

  try {
    // 1. lpa-consent-form-template.json 파일 읽기
    console.log('📖 규약 동의서 template 파일 읽기...');
    const templatePath = join(
      process.cwd(),
      'template/lpa-consent-form-template.json'
    );
    const templateFile = JSON.parse(readFileSync(templatePath, 'utf-8'));

    if (!templateFile) {
      throw new Error(
        '❌ lpa-consent-form-template.json 파일을 찾을 수 없습니다.'
      );
    }

    console.log('✓ 템플릿 발견:', templateFile.content.title);

    // 2. 기존 lpa_consent_form 템플릿 확인
    console.log('\n📋 기존 템플릿 확인...');
    const { data: existingTemplate } = await supabase
      .from('document_templates')
      .select('*')
      .eq('type', 'lpa_consent_form')
      .single();

    if (existingTemplate) {
      console.log('⚠️  이미 lpa_consent_form 템플릿이 존재합니다.');
      console.log('   ID:', existingTemplate.id);
      console.log('   버전:', existingTemplate.version);
      console.log('   생성일:', existingTemplate.created_at);

      const answer = process.argv.includes('--force');
      if (!answer) {
        console.log(
          '\n💡 --force 플래그를 사용하면 기존 템플릿을 비활성화하고 새 템플릿을 생성합니다.'
        );
        process.exit(0);
      }

      // 기존 템플릿 비활성화
      console.log('\n🔄 기존 템플릿 비활성화...');
      await supabase
        .from('document_templates')
        .update({ is_active: false })
        .eq('type', 'lpa_consent_form');
    }

    // 3. 템플릿 정보 출력
    console.log('\n✨ 새 템플릿 생성...');
    console.log('   템플릿 구조:');
    console.log('   - 타입:', templateFile.type);
    console.log('   - 버전:', templateFile.version);
    console.log('   - 설명:', templateFile.description);
    console.log('   - 제목:', templateFile.content.title);
    console.log('   - 헤더:', templateFile.content.header.text);
    console.log('   - 콘텐츠 요소 수:', templateFile.content.sections.length);

    // 4. document_templates에 삽입
    const { data: newTemplate, error } = await supabase
      .from('document_templates')
      .insert({
        type: 'lpa_consent_form',
        content: templateFile.content,
        version: templateFile.version || '1.0.0',
        is_active: true,
        name: '규약 동의서',
        description:
          templateFile.description ||
          'LPA 조합원 동의서 - 조합원별 서명용 문서',
      })
      .select()
      .single();

    if (error) {
      console.error('❌ 템플릿 생성 실패:', error);
      throw error;
    }

    console.log('\n✅ LPA 규약 동의서 템플릿 초기화 완료!');
    console.log('\n📊 생성된 템플릿 정보:');
    console.log('   - ID:', newTemplate.id);
    console.log('   - 타입:', newTemplate.type);
    console.log('   - 이름:', newTemplate.name);
    console.log('   - 버전:', newTemplate.version);
    console.log('   - 활성화:', newTemplate.is_active ? 'Yes' : 'No');
    console.log('   - 생성일:', newTemplate.created_at);
    console.log(
      '\n💡 이 템플릿은 lpa-consent-form-template.json 파일의 내용을 사용합니다.'
    );
    console.log('   날짜 필드: ${startDate} 변수 사용 (결성 예정일 자동 표시)');
  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
initializeLpaConsentFormTemplate()
  .then(() => {
    console.log('\n🎉 완료!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 치명적 오류:', error);
    process.exit(1);
  });
