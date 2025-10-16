// 기존 펀드에 대한 템플릿 초기화 스크립트
// 이미 생성된 펀드들에 대해 글로벌 템플릿을 복사하여 펀드별 템플릿 생성

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { initializeFundTemplates } from '../lib/admin/document-templates';

// .env 파일 로드
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('환경변수가 설정되지 않았습니다:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

async function main() {
  console.log('🚀 기존 펀드 템플릿 초기화 시작\n');

  // Supabase 클라이언트 생성 (Service Role Key 사용)
  const supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // 1. 모든 펀드 조회
    const { data: funds, error: fundsError } = await supabase
      .from('funds')
      .select('id, name, brand')
      .order('created_at', { ascending: true });

    if (fundsError) {
      throw new Error(`펀드 조회 실패: ${fundsError.message}`);
    }

    if (!funds || funds.length === 0) {
      console.log('❌ 초기화할 펀드가 없습니다.');
      return;
    }

    console.log(`✅ 총 ${funds.length}개의 펀드를 찾았습니다.\n`);

    // 2. 각 펀드에 대해 템플릿 초기화
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const fund of funds) {
      console.log(`📁 펀드: ${fund.name} (${fund.id})`);

      try {
        // 이미 펀드별 템플릿이 있는지 확인
        const { data: existingTemplates } = await supabase
          .from('document_templates')
          .select('id, type, version')
          .eq('fund_id', fund.id);

        if (existingTemplates && existingTemplates.length > 0) {
          console.log(
            `  ⏭️  이미 ${existingTemplates.length}개의 템플릿이 존재함 - 건너뜀\n`
          );
          skipCount++;
          continue;
        }

        // 템플릿 초기화 실행
        const templates = await initializeFundTemplates(fund.id);

        if (templates.length > 0) {
          console.log(`  ✅ ${templates.length}개의 템플릿 초기화 완료:`);
          templates.forEach(t => {
            console.log(`     - ${t.type.toUpperCase()} v${t.version}`);
          });
          successCount++;
        } else {
          console.log(`  ⚠️  초기화된 템플릿 없음 (글로벌 템플릿 부재)`);
        }
      } catch (error) {
        console.error(`  ❌ 초기화 실패:`, error);
        errorCount++;
      }

      console.log('');
    }

    // 3. 결과 요약
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 초기화 결과 요약');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`⏭️  건너뜀: ${skipCount}개 (이미 존재)`);
    console.log(`❌ 실패: ${errorCount}개`);
    console.log(`📝 총 펀드: ${funds.length}개`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (errorCount === 0) {
      console.log('🎉 모든 펀드의 템플릿 초기화가 완료되었습니다!');
    } else {
      console.log('⚠️  일부 펀드의 템플릿 초기화에 실패했습니다.');
    }
  } catch (error) {
    console.error('❌ 스크립트 실행 중 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
main()
  .then(() => {
    console.log('\n✨ 스크립트 완료');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 스크립트 실행 실패:', error);
    process.exit(1);
  });
