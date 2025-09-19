import * as XLSX from 'xlsx';

// 엑셀 템플릿의 컬럼 정의
export const EXCEL_COLUMNS = [
  { key: 'name', header: '이름', required: true },
  { key: 'phone', header: '전화번호', required: true },
  { key: 'email', header: '이메일', required: true },
  { key: 'entity_type', header: '개인/법인', required: true },
  { key: 'birth_date', header: '생년월일', required: false },
  { key: 'business_number', header: '사업자등록번호', required: false },
  { key: 'address', header: '주소', required: true },
  { key: 'investment_units', header: '출자좌수', required: true },
];

// 엑셀 데이터 타입
export interface ExcelRowData {
  이름: string;
  전화번호: string;
  이메일: string;
  '개인/법인': '개인' | '법인';
  생년월일?: string;
  사업자등록번호?: string;
  주소: string;
  출자좌수: number;
}

// 내부 데이터 타입으로 변환
export interface ParsedMemberData {
  name: string;
  phone: string;
  email: string;
  entity_type: 'individual' | 'corporate';
  birth_date?: string;
  business_number?: string;
  address: string;
  investment_units: number;
}

// 검증 결과 타입
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  rowIndex: number;
  data?: ParsedMemberData;
}

// 엑셀 템플릿 생성 및 다운로드
export const downloadExcelTemplate = (fundName: string) => {
  const wb = XLSX.utils.book_new();

  // 헤더 및 샘플 데이터
  const templateData = [
    // 헤더
    [
      '이름',
      '전화번호',
      '이메일',
      '개인/법인',
      '생년월일',
      '사업자등록번호',
      '주소',
      '출자좌수',
    ],
    // 샘플 데이터 (개인)
    [
      '김철수',
      '010-1234-5678',
      'kim@example.com',
      '개인',
      '1985-03-15',
      '',
      '서울시 강남구 역삼동 123-45',
      '5',
    ],
    // 샘플 데이터 (법인)
    [
      '(주)테스트',
      '02-123-4567',
      'info@test.com',
      '법인',
      '',
      '123-45-67890',
      '서울시 서초구 서초동 678-90',
      '10',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(templateData);

  // 컬럼 너비 설정
  ws['!cols'] = [
    { wch: 15 }, // 이름
    { wch: 20 }, // 전화번호
    { wch: 25 }, // 이메일
    { wch: 10 }, // 개인/법인
    { wch: 15 }, // 생년월일
    { wch: 20 }, // 사업자등록번호
    { wch: 40 }, // 주소
    { wch: 10 }, // 출자좌수
  ];

  // 헤더 스타일 설정 (배경색 등)
  const range = XLSX.utils.decode_range(ws['!ref']!);
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (ws[cellAddress]) {
      ws[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E2E8F0' } },
      };
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, '조합원목록');

  // 파일 다운로드
  const fileName = `${fundName}_조합원_일괄등록_템플릿.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// 엑셀 파일 파싱
export const parseExcelFile = (file: File): Promise<ExcelRowData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

        // JSON 형태로 변환 (첫 번째 행을 헤더로 사용)
        const jsonData = XLSX.utils.sheet_to_json<(string | number)[]>(
          firstSheet,
          {
            header: 1,
            defval: '',
          }
        );

        if (jsonData.length === 0) {
          reject(new Error('엑셀 파일이 비어있습니다.'));
          return;
        }

        // 첫 번째 행을 헤더로 사용하고 나머지를 데이터로 처리
        const headers = jsonData[0];
        console.log('jsonData', jsonData);
        console.log('headers', headers);
        const rows = jsonData.slice(1);

        // 헤더 검증
        const expectedHeaders = [
          '이름',
          '전화번호',
          '이메일',
          '개인/법인',
          '생년월일',
          '사업자등록번호',
          '주소',
          '출자좌수',
        ];
        const headerMismatch = expectedHeaders.some(
          expected => !headers.includes(expected)
        );

        if (headerMismatch) {
          reject(
            new Error(
              `엑셀 헤더가 올바르지 않습니다. 예상: ${expectedHeaders.join(', ')}`
            )
          );
          return;
        }

        // 데이터 변환
        const parsedData: ExcelRowData[] = rows
          .map(row => {
            const rowData: any = {};
            headers.forEach((header, index) => {
              rowData[header] = row[index] || '';
            });
            return rowData;
          })
          .filter(row => row.이름); // 이름이 있는 행만 필터링

        resolve(parsedData);
      } catch (error) {
        reject(new Error(`엑셀 파일 파싱 중 오류가 발생했습니다: ${error}`));
      }
    };

    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
    reader.readAsArrayBuffer(file);
  });
};

// 전화번호 정규화 (하이픈 제거 후 추가)
export const normalizePhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/[^\d]/g, '');

  if (cleaned.length === 11 && cleaned.startsWith('010')) {
    return `010-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  } else if (
    cleaned.length === 10 &&
    (cleaned.startsWith('02') ||
      cleaned.startsWith('03') ||
      cleaned.startsWith('04') ||
      cleaned.startsWith('05') ||
      cleaned.startsWith('06') ||
      cleaned.startsWith('07'))
  ) {
    if (cleaned.startsWith('02')) {
      return `02-${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    } else {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
    }
  }

  return phone; // 원본 반환 (검증에서 걸러짐)
};

// 이메일 검증
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 데이터 검증
export const validateExcelData = (data: ExcelRowData[]): ValidationResult[] => {
  const results: ValidationResult[] = [];
  const phoneNumbers = new Set<string>();

  data.forEach((row, index) => {
    const errors: string[] = [];

    // 기본 필드 검증
    if (!row.이름?.trim()) {
      errors.push('이름은 필수입니다.');
    }

    if (!row.전화번호?.trim()) {
      errors.push('전화번호는 필수입니다.');
    } else {
      const normalizedPhone = normalizePhoneNumber(row.전화번호);
      if (
        normalizedPhone === row.전화번호 &&
        !/^\d{2,3}-\d{3,4}-\d{4}$/.test(normalizedPhone)
      ) {
        errors.push('전화번호 형식이 올바르지 않습니다.');
      }

      // 파일 내 중복 검사
      if (phoneNumbers.has(normalizedPhone)) {
        errors.push('파일 내에서 중복된 전화번호입니다.');
      } else {
        phoneNumbers.add(normalizedPhone);
      }
    }

    if (!row.이메일?.trim()) {
      errors.push('이메일은 필수입니다.');
    } else if (!isValidEmail(row.이메일)) {
      errors.push('이메일 형식이 올바르지 않습니다.');
    }

    if (!row['개인/법인'] || !['개인', '법인'].includes(row['개인/법인'])) {
      errors.push('개인/법인은 "개인" 또는 "법인"이어야 합니다.');
    }

    if (!row.주소?.trim()) {
      errors.push('주소는 필수입니다.');
    }

    if (
      !row.출자좌수 ||
      isNaN(Number(row.출자좌수)) ||
      Number(row.출자좌수) < 1
    ) {
      errors.push('출자좌수는 1 이상의 숫자여야 합니다.');
    }

    // 개인/법인별 추가 검증
    if (row['개인/법인'] === '개인') {
      if (row.생년월일 && !/^\d{4}-\d{2}-\d{2}$/.test(row.생년월일)) {
        errors.push('생년월일은 YYYY-MM-DD 형식이어야 합니다.');
      }
    } else if (row['개인/법인'] === '법인') {
      if (!row.사업자등록번호?.trim()) {
        errors.push('법인의 경우 사업자등록번호는 필수입니다.');
      }
    }

    // 변환된 데이터
    let parsedData: ParsedMemberData | undefined;
    if (errors.length === 0) {
      parsedData = {
        name: row.이름.trim(),
        phone: normalizePhoneNumber(row.전화번호),
        email: row.이메일.trim(),
        entity_type: row['개인/법인'] === '개인' ? 'individual' : 'corporate',
        birth_date: row.생년월일 || undefined,
        business_number: row.사업자등록번호 || undefined,
        address: row.주소.trim(),
        investment_units: Number(row.출자좌수),
      };
    }

    results.push({
      isValid: errors.length === 0,
      errors,
      rowIndex: index + 2, // 엑셀에서 실제 행 번호 (헤더 + 0-based index)
      data: parsedData,
    });
  });

  return results;
};
