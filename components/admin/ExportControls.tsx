'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { createBrandClient } from '@/lib/supabase/client';
// createClient는 더이상 필요 없음 (brandClient 사용)
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { useState } from 'react';
import * as XLSX from 'xlsx';

interface ExportOptions {
  format: 'excel' | 'csv';
  includeFields: {
    basicInfo: boolean;
    contactInfo: boolean;
    investmentInfo: boolean;
    registrationInfo: boolean;
  };
  userFilter: 'all' | 'registered' | 'survey_only';
}

export default function ExportControls() {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'excel',
    includeFields: {
      basicInfo: true,
      contactInfo: true,
      investmentInfo: true,
      registrationInfo: true,
    },
    userFilter: 'all',
  });
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const data = await fetchExportData();
      const processedData = processDataForExport(data);

      if (options.format === 'excel') {
        exportToExcel(processedData);
      } else {
        exportToCSV(processedData);
      }
    } catch (error) {
      console.error('데이터 내보내기 실패:', error);
      alert('데이터 내보내기에 실패했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  const fetchExportData = async () => {
    // brandClient를 사용해서 브랜드 자동 처리
    const brandClient = createBrandClient();

    let query = brandClient.profiles.select(
      `
        *,
        fund_members (
          id,
          investment_units,
          total_units,
          deleted_at,
          created_at,
          updated_at,
          fund:funds (par_value)
        )
      `
    );

    // 사용자 필터 적용
    if (options.userFilter === 'registered') {
      query = query.not('user_id', 'is', null);
    } else if (options.userFilter === 'survey_only') {
      query = query.is('user_id', null);
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) throw error;
    return data || [];
  };

  const processDataForExport = (data: any[]) => {
    return data.map((user, index) => {
      const row: any = {
        순번: index + 1,
      };

      // soft delete된 조합원 제외
      const activeFundMembers = (user.fund_members || []).filter(
        (member: any) => !member.deleted_at
      );

      // 기본 정보
      if (options.includeFields.basicInfo) {
        row['이름/회사명'] = user.name;
        row['구분'] = user.entity_type === 'individual' ? '개인' : '법인';
        row['주소'] = user.address;

        if (user.entity_type === 'individual' && user.birth_date) {
          row['생년월일'] = new Date(user.birth_date).toLocaleDateString(
            'ko-KR'
          );
        }

        if (user.entity_type === 'corporate' && user.business_number) {
          row['사업자번호'] = user.business_number;
        }
      }

      // 연락처 정보
      if (options.includeFields.contactInfo) {
        row['이메일'] = user.email;
        row['전화번호'] = user.phone;
      }

      // 출자 정보
      if (options.includeFields.investmentInfo && activeFundMembers[0]) {
        const investment = activeFundMembers[0];
        row['출자좌수'] = investment.investment_units;
        row['약정출자좌수'] = investment.total_units;
        row['출자금액'] =
          (
            investment.investment_units *
            (investment.fund?.par_value || 1000000)
          ).toLocaleString() + '원';
        row['약정금액'] =
          (
            investment.total_units * (investment.fund?.par_value || 1000000)
          ).toLocaleString() + '원';
        // row['제출일'] = new Date(investment.created_at).toLocaleDateString('ko-KR');

        if (investment.created_at !== investment.updated_at) {
          row['출자정보_최종수정일'] = new Date(
            investment.updated_at
          ).toLocaleDateString('ko-KR');
        }
      }

      // 가입 정보
      if (options.includeFields.registrationInfo) {
        row['가입상태'] = user.user_id ? '가입완료' : '설문만';
        row['설문참여일'] = new Date(user.created_at).toLocaleDateString(
          'ko-KR'
        );

        if (user.created_at !== user.updated_at) {
          row['정보_최종수정일'] = new Date(user.updated_at).toLocaleDateString(
            'ko-KR'
          );
        }
      }

      return row;
    });
  };

  const exportToExcel = (data: any[]) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();

    // 컬럼 너비 자동 조정
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(key.length, 15),
    }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, '사용자_데이터');

    const fileName = `SNUSV_사용자데이터_${
      new Date().toISOString().split('T')[0]
    }.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const exportToCSV = (data: any[]) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const csvContent = XLSX.utils.sheet_to_csv(ws);

    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `SNUSV_사용자데이터_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const updateIncludeFields = (
    field: keyof ExportOptions['includeFields'],
    checked: boolean
  ) => {
    setOptions(prev => ({
      ...prev,
      includeFields: {
        ...prev.includeFields,
        [field]: checked,
      },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 내보내기 형식 */}
        <Card>
          <CardHeader>
            <CardTitle>내보내기 형식</CardTitle>
            <CardDescription>
              데이터를 내보낼 파일 형식을 선택하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={options.format}
              onValueChange={(value: 'excel' | 'csv') =>
                setOptions(prev => ({ ...prev, format: value }))
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="excel" />
                <Label
                  htmlFor="excel"
                  className="flex items-center cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                  Excel (.xlsx)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label
                  htmlFor="csv"
                  className="flex items-center cursor-pointer"
                >
                  <FileText className="h-4 w-4 mr-2 text-blue-600" />
                  CSV (.csv)
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* 사용자 필터 */}
        <Card>
          <CardHeader>
            <CardTitle>사용자 필터</CardTitle>
            <CardDescription>내보낼 사용자 범위를 선택하세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={options.userFilter}
              onValueChange={(value: 'all' | 'registered' | 'survey_only') =>
                setOptions(prev => ({ ...prev, userFilter: value }))
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all">전체 사용자</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="registered" id="registered" />
                <Label htmlFor="registered">가입 완료 사용자만</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="survey_only" id="survey_only" />
                <Label htmlFor="survey_only">설문만 참여한 사용자</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      </div>

      {/* 포함할 필드 */}
      <Card>
        <CardHeader>
          <CardTitle>포함할 정보</CardTitle>
          <CardDescription>
            내보낼 데이터에 포함할 정보를 선택하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="basicInfo"
                checked={options.includeFields.basicInfo}
                onCheckedChange={checked =>
                  updateIncludeFields('basicInfo', checked as boolean)
                }
              />
              <Label htmlFor="basicInfo">
                기본 정보 (이름, 구분, 주소, 생년월일/사업자번호)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="contactInfo"
                checked={options.includeFields.contactInfo}
                onCheckedChange={checked =>
                  updateIncludeFields('contactInfo', checked as boolean)
                }
              />
              <Label htmlFor="contactInfo">
                연락처 정보 (이메일, 전화번호)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="investmentInfo"
                checked={options.includeFields.investmentInfo}
                onCheckedChange={checked =>
                  updateIncludeFields('investmentInfo', checked as boolean)
                }
              />
              <Label htmlFor="investmentInfo">
                출자 정보 (출자좌수, 출자금액, 출자일)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="registrationInfo"
                checked={options.includeFields.registrationInfo}
                onCheckedChange={checked =>
                  updateIncludeFields('registrationInfo', checked as boolean)
                }
              />
              <Label htmlFor="registrationInfo">
                가입 정보 (가입상태, 참여일, 수정일)
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 내보내기 버튼 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              선택한 조건에 따라 데이터를 {options.format.toUpperCase()} 파일로
              내보냅니다.
            </div>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              size="lg"
              className="w-full sm:w-auto"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  내보내는 중...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  데이터 내보내기
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
