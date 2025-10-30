import * as fs from 'fs';
import * as path from 'path';

/**
 * 한글 폰트 등록
 */
export function registerKoreanFonts(doc: any): void {
  try {
    const fontDir = path.join(process.cwd(), 'lib', 'pdf', 'fonts');

    const regularPath = path.join(fontDir, 'malgun.ttf');
    const boldPath = path.join(fontDir, 'malgunbd.ttf');
    const nanumRegularPath = path.join(fontDir, 'NanumGothic.ttf');
    const nanumBoldPath = path.join(fontDir, 'NanumGothicBold.ttf');

    // NotoSansKR 폰트 경로
    const notoRegularPath = path.join(fontDir, 'NotoSansKR-Regular.ttf');
    const notoBoldPath = path.join(fontDir, 'NotoSansKR-Bold.ttf');

    if (fs.existsSync(regularPath)) {
      doc.registerFont('맑은고딕', regularPath);
    }

    if (fs.existsSync(boldPath)) {
      doc.registerFont('맑은고딕-Bold', boldPath);
    }

    if (fs.existsSync(nanumRegularPath)) {
      doc.registerFont('NanumGothic', nanumRegularPath);
    }

    if (fs.existsSync(nanumBoldPath)) {
      doc.registerFont('NanumGothicBold', nanumBoldPath);
    }

    // NotoSansKR 폰트 등록
    if (fs.existsSync(notoRegularPath)) {
      doc.registerFont('NotoSansKR-Regular', notoRegularPath);
      console.log('✓ NotoSansKR-Regular 폰트 등록 완료');
    } else {
      console.warn(
        '⚠ NotoSansKR-Regular.ttf 파일을 찾을 수 없습니다:',
        notoRegularPath
      );
    }

    if (fs.existsSync(notoBoldPath)) {
      doc.registerFont('NotoSansKR-Bold', notoBoldPath);
      console.log('✓ NotoSansKR-Bold 폰트 등록 완료');
    } else {
      console.warn(
        '⚠ NotoSansKR-Bold.ttf 파일을 찾을 수 없습니다:',
        notoBoldPath
      );
    }
  } catch (error) {
    console.error('폰트 등록 실패:', error);
    throw error;
  }
}

/**
 * 폰트 안전하게 적용
 */
export function tryFont(
  doc: any,
  preferredFont: string,
  fallbackFont: string
): void {
  try {
    doc.font(preferredFont);
  } catch {
    // 시스템 폰트 대신 번들된 한글 폰트를 사용
    try {
      doc.font('NanumGothic');
    } catch {
      doc.font(fallbackFont);
    }
  }
}

export function getFontPath() {
  // PDFKit는 기본 폰트가 지정되지 않으면 Helvetica를 로드하려고 하므로,
  // 생성 시점에 번들된 TTF 폰트를 기본 폰트로 지정한다.
  const fontsDir = path.join(process.cwd(), 'lib', 'pdf', 'fonts');
  const defaultFontCandidates = [
    path.join(fontsDir, 'NanumGothic.ttf'),
    path.join(fontsDir, 'malgun.ttf'),
  ];
  const defaultFontPath = defaultFontCandidates.find(p => fs.existsSync(p));

  if (!defaultFontPath) {
    throw new Error(
      '기본 폰트를 찾을 수 없습니다. lib/pdf/fonts에 TTF 파일을 배치하세요.'
    );
  }

  return defaultFontPath;
}
