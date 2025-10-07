// LPA 문서 생성을 위한 공통 컨텍스트 및 템플릿 로직

import { getActiveTemplate } from '@/lib/admin/document-templates';
import { getFundDataForDocument } from '@/lib/admin/funds';
import type { LPAContext, LPATemplate } from '@/lib/pdf/types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 템플릿 로드 (DB 우선, 없으면 파일)
 */
export async function loadLPATemplate(): Promise<{
  template: LPATemplate;
  templateId?: string;
  templateVersion: string;
}> {
  // 1. DB에서 활성 템플릿 조회 시도
  try {
    const dbTemplate = await getActiveTemplate('lpa');
    if (dbTemplate) {
      return {
        template: {
          type: 'lpa',
          version: dbTemplate.version,
          description: dbTemplate.description || '',
          content: dbTemplate.content,
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

  return {
    template: fileTemplate,
    templateVersion: fileTemplate.version || '1.0.0',
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
      address: fund.address,
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
