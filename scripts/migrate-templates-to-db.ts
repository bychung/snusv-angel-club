#!/usr/bin/env tsx
/**
 * 기존 템플릿 JSON 파일을 DB로 마이그레이션하는 스크립트
 *
 * 사용법:
 *   npx tsx scripts/migrate-templates-to-db.ts
 */

// .env.local 파일 로드
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// 환경 변수 체크
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('환경 변수가 설정되지 않았습니다.');
  console.error(
    'NEXT_PUBLIC_SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface TemplateFile {
  type: string;
  version: string;
  description: string;
  content: any;
  appendix: any;
}

async function migrateTemplate(filePath: string): Promise<void> {
  console.log(`\n템플릿 마이그레이션 시작: ${filePath}`);

  // JSON 파일 읽기
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`파일을 찾을 수 없습니다: ${fullPath}`);
    return;
  }

  const fileContent = fs.readFileSync(fullPath, 'utf-8');
  const template: TemplateFile = JSON.parse(fileContent);

  console.log(`  타입: ${template.type}`);
  console.log(`  버전: ${template.version}`);
  console.log(`  설명: ${template.description}`);

  // 이미 존재하는지 확인
  const { data: existing } = await supabase
    .from('document_templates')
    .select('id, is_active')
    .eq('type', template.type)
    .eq('version', template.version)
    .single();

  if (existing) {
    console.log(`  ✓ 이미 존재하는 템플릿입니다 (ID: ${existing.id})`);
    return;
  }

  // 같은 타입의 활성 템플릿이 있는지 확인
  const { data: activeTemplates } = await supabase
    .from('document_templates')
    .select('id')
    .eq('type', template.type)
    .eq('is_active', true);

  const isActive = !activeTemplates || activeTemplates.length === 0;

  // DB에 삽입
  const { data, error } = await supabase
    .from('document_templates')
    .insert({
      type: template.type,
      version: template.version,
      description: template.description,
      content: template.content,
      appendix: template.appendix,
      is_active: isActive,
    })
    .select()
    .single();

  if (error) {
    console.error(`  ✗ 마이그레이션 실패: ${error.message}`);
    throw error;
  }

  console.log(`  ✓ 마이그레이션 성공 (ID: ${data.id}, 활성: ${isActive})`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('템플릿 DB 마이그레이션 (전체 브랜드 공통)');
  console.log('='.repeat(60));

  const templates = [
    // 'template/lpa-template.json',
    // 'template/lpa-consent-form-template.json',
    'template/member-list-template.json',
  ];

  for (const templatePath of templates) {
    try {
      await migrateTemplate(templatePath);
    } catch (error) {
      console.error(`템플릿 마이그레이션 오류: ${templatePath}`, error);
      // 계속 진행
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('마이그레이션 완료');
  console.log('='.repeat(60));

  // 마이그레이션 결과 확인
  const { data: allTemplates, error } = await supabase
    .from('document_templates')
    .select('type, version, is_active, created_at')
    .order('type')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('템플릿 조회 오류:', error);
    return;
  }

  console.log('\n현재 등록된 템플릿:');
  console.log('-'.repeat(60));

  if (allTemplates && allTemplates.length > 0) {
    allTemplates.forEach(t => {
      const status = t.is_active ? '[활성]' : '[비활성]';
      const date = new Date(t.created_at).toLocaleDateString('ko-KR');
      console.log(`  ${status} ${t.type} v${t.version} (${date})`);
    });
  } else {
    console.log('  등록된 템플릿이 없습니다.');
  }

  console.log('-'.repeat(60));
}

// 스크립트 실행
main()
  .then(() => {
    console.log('\n스크립트 실행 완료');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n스크립트 실행 오류:', error);
    process.exit(1);
  });
