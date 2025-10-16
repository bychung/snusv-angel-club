import * as fs from 'fs';
import * as path from 'path';

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
