// LPA 문서 생성을 위한 공통 컨텍스트 및 템플릿 로직

import { getActiveTemplate } from '@/lib/admin/document-templates';
import { getActiveFundDocument } from '@/lib/admin/fund-documents';
import { getFundDataForDocument } from '@/lib/admin/funds';
import type { LPAContext, LPATemplate } from '@/lib/pdf/types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 템플릿 로드 (펀드별 우선, 없으면 글로벌, 그것도 없으면 파일)
 * @param fundId - 펀드 ID (있으면 펀드별 템플릿 우선 조회)
 */
export async function loadLPATemplate(fundId?: string): Promise<{
  template: LPATemplate;
  templateId?: string;
  templateVersion: string;
}> {
  // 1. DB에서 활성 템플릿 조회 시도 (펀드별 우선, 없으면 글로벌)
  try {
    const dbTemplate = await getActiveTemplate('lpa', fundId);
    if (dbTemplate) {
      console.log(
        `템플릿 로드: ${dbTemplate.fund_id ? '펀드별' : '글로벌'} v${
          dbTemplate.version
        }`
      );
      return {
        template: {
          type: 'lpa',
          version: dbTemplate.version,
          description: dbTemplate.description || '',
          content: dbTemplate.content,
          appendix: dbTemplate.appendix, // 별지 정보 포함
        },
        templateId: dbTemplate.id,
        templateVersion: dbTemplate.version,
      };
    }
  } catch (error) {
    console.warn('DB 템플릿 조회 실패, 파일 템플릿 사용:', error);
  }

  // 2. DB에 없으면 파일에서 로드
  const templatePath = path.join(
    process.cwd(),
    'template',
    'lpa-template.json'
  );
  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  const fileTemplate = JSON.parse(templateContent) as LPATemplate;

  console.log('템플릿 로드: 파일 시스템 v' + (fileTemplate.version || '1.0.0'));

  return {
    template: fileTemplate,
    templateVersion: fileTemplate.version || '1.0.0',
  };
}

/**
 * 규약 문서 생성용 템플릿 로드
 * - 최신 fund_documents의 processed_content를 템플릿으로 사용 (이미 저장된 규약이 있는 경우)
 * - 없으면 글로벌 템플릿 사용
 *
 * @param fundId - 펀드 ID
 */
export async function loadLPATemplateForDocument(fundId: string): Promise<{
  template: LPATemplate;
  templateId?: string;
  templateVersion: string;
  isFromFundDocument: boolean;
}> {
  // 1. fund_documents에서 최신 규약 조회
  try {
    const latestDocument = await getActiveFundDocument(fundId, 'lpa');

    if (latestDocument && latestDocument.processed_content) {
      console.log(
        `템플릿 로드: fund_documents v${latestDocument.version_number} 기반`
      );

      // processed_content를 템플릿으로 사용
      return {
        template: {
          type: 'lpa',
          version: `${latestDocument.version_number}.0.0`,
          description: `v${latestDocument.version_number} 기반 규약`,
          content: latestDocument.processed_content,
          appendix: latestDocument.processed_content.appendix,
        },
        templateVersion: `${latestDocument.version_number}.0.0`,
        isFromFundDocument: true,
      };
    }
  } catch (error) {
    console.warn('fund_documents 조회 실패, 글로벌 템플릿 사용:', error);
  }

  // 2. fund_documents에 없으면 글로벌 템플릿 사용
  try {
    const dbTemplate = await getActiveTemplate('lpa');
    if (dbTemplate) {
      console.log(`템플릿 로드: 글로벌 템플릿 v${dbTemplate.version}`);
      return {
        template: {
          type: 'lpa',
          version: dbTemplate.version,
          description: dbTemplate.description || '',
          content: dbTemplate.content,
          appendix: dbTemplate.appendix,
        },
        templateId: dbTemplate.id,
        templateVersion: dbTemplate.version,
        isFromFundDocument: false,
      };
    }
  } catch (error) {
    console.warn('DB 템플릿 조회 실패, 파일 템플릿 사용:', error);
  }

  // 3. DB에도 없으면 파일에서 로드
  const templatePath = path.join(
    process.cwd(),
    'template',
    'lpa-template.json'
  );
  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  const fileTemplate = JSON.parse(templateContent) as LPATemplate;

  console.log('템플릿 로드: 파일 시스템 v' + (fileTemplate.version || '1.0.0'));

  return {
    template: fileTemplate,
    templateVersion: fileTemplate.version || '1.0.0',
    isFromFundDocument: false,
  };
}

/**
 * LPA 생성에 필요한 컨텍스트 구성
 * @param fundId 펀드 ID
 * @param userId 사용자 ID
 * @param isPreview 미리보기 모드 여부 (true: 파란색 워터마크 적용)
 */
export async function buildLPAContext(
  fundId: string,
  userId: string,
  isPreview: boolean = false
): Promise<LPAContext> {
  // lib/admin/funds.ts의 헬퍼 함수 사용 (brandClient 사용)
  const { fund, user, members } = await getFundDataForDocument(fundId, userId);

  // 결성일 검증
  if (!fund.closed_at) {
    throw new Error('결성일 정보가 없습니다. 기본 정보에서 입력해 주세요.');
  }

  return {
    fund: {
      id: fund.id,
      name: fund.name,
      nameShort: fund.abbreviation, // 펀드 약칭 추가
      address: fund.address,
      par_value: fund.par_value,
      total_cap: fund.total_cap,
      initial_cap: fund.initial_cap,
      payment_schedule: fund.payment_schedule,
      duration: fund.duration,
      closed_at: fund.closed_at,
    },
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
    },
    members,
    generatedAt: new Date(),
    isPreview,
  };
}
