/**
 * PDF 분리 유틸리티
 *
 * PDF에서 특정 페이지를 추출하는 기능을 제공합니다.
 * 의안동의서나 규약동의서에서 조합원별 개별 PDF를 생성할 때 사용됩니다.
 */

import { PDFDocument } from 'pdf-lib';

/**
 * PDF에서 특정 페이지를 추출
 *
 * @param fullPdfBuffer - 전체 PDF 버퍼
 * @param pageNumber - 추출할 페이지 번호 (1-based)
 * @returns 추출된 페이지의 PDF 버퍼
 */
export async function extractPdfPage(
  fullPdfBuffer: Buffer,
  pageNumber: number
): Promise<Buffer> {
  // PDF 문서 로드
  const pdfDoc = await PDFDocument.load(fullPdfBuffer);

  // 새 PDF 문서 생성
  const newPdf = await PDFDocument.create();

  // 페이지 복사 (0-based 인덱스로 변환)
  const [page] = await newPdf.copyPages(pdfDoc, [pageNumber - 1]);
  newPdf.addPage(page);

  // PDF 저장 및 버퍼 반환
  const pdfBytes = await newPdf.save();
  return Buffer.from(pdfBytes);
}

/**
 * PDF에서 여러 페이지를 추출
 *
 * @param fullPdfBuffer - 전체 PDF 버퍼
 * @param pageNumbers - 추출할 페이지 번호 배열 (1-based)
 * @returns 추출된 페이지들의 PDF 버퍼
 */
export async function extractPdfPages(
  fullPdfBuffer: Buffer,
  pageNumbers: number[]
): Promise<Buffer> {
  // PDF 문서 로드
  const pdfDoc = await PDFDocument.load(fullPdfBuffer);

  // 새 PDF 문서 생성
  const newPdf = await PDFDocument.create();

  // 페이지들 복사 (0-based 인덱스로 변환)
  const zeroBasedIndices = pageNumbers.map(num => num - 1);
  const pages = await newPdf.copyPages(pdfDoc, zeroBasedIndices);

  // 페이지들 추가
  pages.forEach(page => newPdf.addPage(page));

  // PDF 저장 및 버퍼 반환
  const pdfBytes = await newPdf.save();
  return Buffer.from(pdfBytes);
}
