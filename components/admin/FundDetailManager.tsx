'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { FundDetailsResponse, FundMemberInfo } from '@/lib/admin/funds';
import {
  FUND_STATUS_CONFIG,
  getFundStatusOptions,
  type FundStatus,
} from '@/lib/fund-status';
import {
  DOCUMENT_CATEGORY_DESCRIPTIONS,
  DOCUMENT_CATEGORY_NAMES,
  DocumentCategory,
} from '@/types/documents';
import {
  Building2,
  ChevronDown,
  FileCode2,
  FileText,
  RefreshCw,
  Save,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import BirthDateInput from '../survey/inputs/BirthDateInput';
import AssemblyManagement from './AssemblyManagement';
import DocumentGenerationSection from './DocumentGenerationSection';
import DocumentHistory from './DocumentHistory';
import DocumentUpload from './DocumentUpload';
import InvestmentCertificateManager from './InvestmentCertificateManager';
import LpaConsentFormSection from './lpa-consent-form/LpaConsentFormSection';
import MemberListSection from './member-list/MemberListSection';
import PersonalInfoConsentFormSection from './personal-info-consent-form/PersonalInfoConsentFormSection';

interface FundDetailManagerProps {
  fundId: string;
}

// 통일된 상태 시스템 사용
const statusOptions = getFundStatusOptions();

export default function FundDetailManager({ fundId }: FundDetailManagerProps) {
  const [fundDetails, setFundDetails] = useState<FundDetailsResponse | null>(
    null
  );
  const [members, setMembers] = useState<FundMemberInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('info');
  const [certificateRefreshKey, setCertificateRefreshKey] = useState(0);
  const [documentGenerationTrigger, setDocumentGenerationTrigger] = useState(0);

  // 폼 데이터
  const [formData, setFormData] = useState({
    name: '',
    abbreviation: '',
    tax_number: '',
    gp_id: [] as string[],
    address: '',
    status: 'ready' as FundStatus,
    account: '',
    account_bank: '',
    closed_at: '',
    registered_at: '',
    dissolved_at: '',
    par_value: 1000000,
    min_units: 1,
    payment_schedule: 'lump_sum' as 'lump_sum' | 'capital_call',
    display_locations: [] as ('dashboard' | 'homepage')[],
    initial_numerator: 1,
    initial_denominator: 1,
    duration: 5,
  });

  // 데이터 초기 로드
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 펀드 상세 정보와 조합원 목록을 병렬로 조회 (관리자 API 사용)
        const [fundResponse, membersResponse] = await Promise.all([
          fetch(`/api/admin/funds/${fundId}/details`),
          fetch(`/api/admin/funds/${fundId}/members`),
        ]);

        if (!fundResponse.ok || !membersResponse.ok) {
          throw new Error('데이터를 불러올 수 없습니다');
        }

        const [fundData, membersData] = await Promise.all([
          fundResponse.json(),
          membersResponse.json(),
        ]);

        setFundDetails(fundData);
        setMembers(membersData.members || []);

        // 폼 데이터 초기화 (날짜는 YYYY-MM-DD 형식으로 변환)
        const formatDateForInput = (dateStr: string) => {
          if (!dateStr) return '';
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return '';
          return date.toISOString().split('T')[0];
        };

        setFormData({
          name: fundData.fund.name || '',
          abbreviation: fundData.fund.abbreviation || '',
          tax_number: fundData.fund.tax_number || '',
          gp_id: fundData.fund.gp_id || [],
          address: fundData.fund.address || '',
          status: fundData.fund.status || 'ready',
          account: fundData.fund.account || '',
          account_bank: fundData.fund.account_bank || '',
          closed_at: formatDateForInput(fundData.fund.closed_at) || '',
          registered_at: formatDateForInput(fundData.fund.registered_at) || '',
          dissolved_at: formatDateForInput(fundData.fund.dissolved_at) || '',
          par_value: fundData.fund.par_value || 1000000,
          min_units: fundData.fund.min_units || 1,
          payment_schedule: fundData.fund.payment_schedule || 'lump_sum',
          display_locations: fundData.fund.display_locations || [],
          initial_numerator: fundData.fund.initial_numerator || 1,
          initial_denominator: fundData.fund.initial_denominator || 1,
          duration: fundData.fund.duration || 5,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fundId]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      // 결성예정일 변경 시 만기예정일 자동 계산
      if (
        field === 'closed_at' &&
        value &&
        (formData.status === 'ready' || formData.status === 'processing')
      ) {
        const closedDate = new Date(value);
        if (!isNaN(closedDate.getTime())) {
          const dissolvedDate = new Date(closedDate);
          dissolvedDate.setFullYear(
            dissolvedDate.getFullYear() + formData.duration
          );
          newData.dissolved_at = dissolvedDate.toISOString().split('T')[0];
        }
      }

      return newData;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // 날짜 필드를 ISO 형식으로 변환
      const convertDateToISO = (dateStr: string) => {
        if (!dateStr) return null;
        return `${dateStr}T00:00:00.000Z`;
      };

      const dataToSave = {
        ...formData,
        closed_at: convertDateToISO(formData.closed_at),
        registered_at: convertDateToISO(formData.registered_at),
        dissolved_at: convertDateToISO(formData.dissolved_at),
      };

      const response = await fetch(`/api/admin/funds/${fundId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '펀드 정보 저장에 실패했습니다');
      }

      // 문서 생성 트리거 업데이트 (펀드 정보 변경 시 중복 체크 다시 수행)
      setDocumentGenerationTrigger(prev => prev + 1);

      // 데이터 다시 로드
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '저장 중 오류가 발생했습니다'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentAction = () => {
    // 문서 업로드/삭제 후 호출되는 콜백
    // 필요시 펀드 상세 정보 다시 로드
  };

  const handleCertificateRefresh = () => {
    setCertificateRefreshKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">로딩 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!fundDetails) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {fundDetails.fund.name}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge
              className={
                FUND_STATUS_CONFIG[formData.status]?.colorClasses ||
                'bg-gray-100 text-gray-800'
              }
            >
              {FUND_STATUS_CONFIG[formData.status]?.label || formData.status}
            </Badge>
            {fundDetails.fund.abbreviation && (
              <span className="text-sm text-gray-500">
                ({fundDetails.fund.abbreviation})
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="info" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            기본 정보
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            공통 문서
          </TabsTrigger>
          <TabsTrigger value="certificates" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            투자확인서
          </TabsTrigger>
          <TabsTrigger
            value="document-generation"
            className="flex items-center gap-2"
          >
            <FileCode2 className="h-4 w-4" />
            문서 생성
          </TabsTrigger>
          <TabsTrigger value="assembly" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            조합원 총회
          </TabsTrigger>
        </TabsList>

        {/* 기본 정보 탭 */}
        <TabsContent value="info" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>펀드 기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">펀드명 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e => handleInputChange('name', e.target.value)}
                    placeholder="펀드명을 입력하세요"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="abbreviation">펀드 약칭</Label>
                  <Input
                    id="abbreviation"
                    value={formData.abbreviation}
                    onChange={e =>
                      handleInputChange('abbreviation', e.target.value)
                    }
                    placeholder="펀드 약칭을 입력하세요"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax_number">고유번호</Label>
                  <Input
                    id="tax_number"
                    value={formData.tax_number}
                    onChange={e =>
                      handleInputChange('tax_number', e.target.value)
                    }
                    placeholder="123-45-67890"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="par_value">1좌당 금액 (원)</Label>
                  <Input
                    id="par_value"
                    type="number"
                    value={formData.par_value}
                    onChange={e =>
                      handleInputChange(
                        'par_value',
                        parseInt(e.target.value) || 0
                      )
                    }
                    placeholder="1000000"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min_units">최소 출자좌수</Label>
                  <Input
                    id="min_units"
                    type="number"
                    value={formData.min_units}
                    onChange={e =>
                      handleInputChange(
                        'min_units',
                        parseInt(e.target.value) || 1
                      )
                    }
                    placeholder="1"
                    min="1"
                  />
                  <p className="text-xs text-gray-500">
                    출자 설문 시 최소 {formData.min_units}좌 이상 입력하도록
                    제한됩니다
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_schedule">출자방식</Label>
                  <Select
                    value={formData.payment_schedule}
                    onValueChange={(value: 'lump_sum' | 'capital_call') =>
                      handleInputChange('payment_schedule', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="출자방식 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lump_sum">일시납</SelectItem>
                      <SelectItem value="capital_call">수시납</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.payment_schedule === 'capital_call' && (
                  <div className="space-y-2">
                    <Label>설립출자금 비율</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={formData.initial_numerator}
                        onChange={e =>
                          handleInputChange(
                            'initial_numerator',
                            parseInt(e.target.value) || 1
                          )
                        }
                        placeholder="1"
                        min="1"
                      />
                      <span className="text-gray-500">/</span>
                      <Input
                        type="number"
                        value={formData.initial_denominator}
                        onChange={e =>
                          handleInputChange(
                            'initial_denominator',
                            parseInt(e.target.value) || 1
                          )
                        }
                        placeholder="1"
                        min="1"
                      />
                      <span className="text-sm text-gray-500 whitespace-nowrap">
                        (
                        {(
                          (formData.initial_numerator /
                            formData.initial_denominator) *
                          100
                        ).toFixed(1)}
                        %)
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      설립 시 납입할 출자금 비율입니다
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="duration">펀드 존속기간</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration}
                      onChange={e =>
                        handleInputChange(
                          'duration',
                          parseInt(e.target.value) || 5
                        )
                      }
                      placeholder="5"
                      min="1"
                    />
                    <span className="text-gray-500">년</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    펀드의 존속기간을 연 단위로 입력합니다
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">진행 단계</Label>
                  <Select
                    value={formData.status}
                    onValueChange={value => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="진행 단계 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          <span
                            className={`inline-block w-2 h-2 rounded-full mr-2 ${
                              option.colorClasses.split(' ')[0]
                            }`}
                          ></span>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 링크 노출위치 - 결성준비중, 결성진행중일 때만 표시 */}
                {(formData.status === 'ready' ||
                  formData.status === 'processing') && (
                  <div className="space-y-2">
                    <Label>링크 노출위치</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between text-left"
                        >
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            {formData.display_locations.length === 0 ? (
                              <span className="text-gray-500">
                                노출 위치를 선택하세요
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1 max-w-full overflow-hidden">
                                {formData.display_locations.map(location => (
                                  <Badge
                                    key={location}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {location === 'dashboard'
                                      ? '대시보드'
                                      : '홈페이지'}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-60">
                        <DropdownMenuLabel className="flex items-center justify-between">
                          <span>링크 노출위치 선택</span>
                          {formData.display_locations.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleInputChange('display_locations', [])
                              }
                            >
                              전체 해제
                            </Button>
                          )}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <div className="p-2 space-y-2">
                          {[
                            { value: 'dashboard' as const, label: '대시보드' },
                            { value: 'homepage' as const, label: '홈페이지' },
                          ].map(option => (
                            <DropdownMenuItem
                              key={option.value}
                              className="flex items-center space-x-3 cursor-pointer"
                              onSelect={e => {
                                e.preventDefault(); // 드롭다운이 닫히지 않도록
                                const newLocations =
                                  formData.display_locations.includes(
                                    option.value
                                  )
                                    ? formData.display_locations.filter(
                                        loc => loc !== option.value
                                      )
                                    : [
                                        ...formData.display_locations,
                                        option.value,
                                      ];
                                handleInputChange(
                                  'display_locations',
                                  newLocations
                                );
                              }}
                            >
                              <Checkbox
                                checked={formData.display_locations.includes(
                                  option.value
                                )}
                                onChange={() => {}} // onSelect에서 처리하므로 빈 함수
                              />
                              <div className="flex-1">
                                <span className="font-medium">
                                  {option.label}
                                </span>
                              </div>
                            </DropdownMenuItem>
                          ))}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">펀드 소재지</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={e => handleInputChange('address', e.target.value)}
                  placeholder="펀드 소재지를 입력하세요"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="account">계좌번호</Label>
                  <Input
                    id="account"
                    value={formData.account}
                    onChange={e => handleInputChange('account', e.target.value)}
                    placeholder="123-4567-8901"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account_bank">계좌 은행</Label>
                  <Input
                    id="account_bank"
                    value={formData.account_bank}
                    onChange={e =>
                      handleInputChange('account_bank', e.target.value)
                    }
                    placeholder="우리은행"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <BirthDateInput
                  label={
                    formData.status === 'ready' ||
                    formData.status === 'processing'
                      ? '결성예정일'
                      : '결성일'
                  }
                  value={formData.closed_at}
                  onChange={value => handleInputChange('closed_at', value)}
                />

                <BirthDateInput
                  label="등록일"
                  value={formData.registered_at}
                  onChange={value => handleInputChange('registered_at', value)}
                  disabled={
                    formData.status === 'ready' ||
                    formData.status === 'processing' ||
                    formData.status === 'applied'
                  }
                />

                <BirthDateInput
                  label={
                    formData.status === 'ready' ||
                    formData.status === 'processing'
                      ? '만기예정일'
                      : '만기일'
                  }
                  value={formData.dissolved_at}
                  onChange={value => handleInputChange('dissolved_at', value)}
                />
              </div>

              <div className="space-y-2">
                <Label>업무집행조합원 (GP)</Label>
                <div className="text-sm text-gray-500 mb-2">
                  현재 {members.length}명의 조합원 중 {formData.gp_id.length}
                  명이 GP로 선택되었습니다.
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        {formData.gp_id.length === 0 ? (
                          <span className="text-gray-500">
                            업무집행조합원을 선택하세요
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-full overflow-hidden">
                            {formData.gp_id.slice(0, 2).map(gpId => {
                              const member = members.find(m => m.id === gpId);
                              return member ? (
                                <Badge
                                  key={gpId}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {member.name}
                                </Badge>
                              ) : null;
                            })}
                            {formData.gp_id.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{formData.gp_id.length - 2}명 더
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80">
                    <DropdownMenuLabel className="flex items-center justify-between">
                      <span>업무집행조합원 선택</span>
                      {formData.gp_id.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleInputChange('gp_id', [])}
                        >
                          전체 해제
                        </Button>
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="max-h-60 overflow-y-auto">
                      {members.map(member => (
                        <DropdownMenuItem
                          key={member.id}
                          className="flex items-center space-x-3 cursor-pointer"
                          onSelect={e => {
                            e.preventDefault(); // 드롭다운이 닫히지 않도록
                            const newGpIds = formData.gp_id.includes(member.id)
                              ? formData.gp_id.filter(id => id !== member.id)
                              : [...formData.gp_id, member.id];
                            handleInputChange('gp_id', newGpIds);
                          }}
                        >
                          <Checkbox
                            checked={formData.gp_id.includes(member.id)}
                            onChange={() => {}} // onSelect에서 처리하므로 빈 함수
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{member.name}</span>
                              {member.role === 'ADMIN' && (
                                <Badge variant="outline" className="text-xs">
                                  관리자
                                </Badge>
                              )}
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </div>
                    {formData.gp_id.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <div className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {formData.gp_id.map(gpId => {
                              const member = members.find(m => m.id === gpId);
                              return member ? (
                                <Badge
                                  key={gpId}
                                  variant="secondary"
                                  className="text-xs flex items-center gap-1"
                                >
                                  {member.name}
                                  <X
                                    className="h-3 w-3 cursor-pointer hover:text-red-500"
                                    onClick={e => {
                                      e.stopPropagation();
                                      const newGpIds = formData.gp_id.filter(
                                        id => id !== gpId
                                      );
                                      handleInputChange('gp_id', newGpIds);
                                    }}
                                  />
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  새로고침
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? '저장 중...' : '저장'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 문서 관리 탭 */}
        <TabsContent value="documents" className="space-y-6">
          {Object.values(DocumentCategory)
            .filter(
              category => category !== DocumentCategory.INVESTMENT_CERTIFICATE
            )
            .map(category => (
              <div key={category} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-gray-500" />
                    <h3 className="text-lg font-semibold">
                      {DOCUMENT_CATEGORY_NAMES[category]}
                    </h3>
                    <span className="text-sm text-gray-500">
                      - {DOCUMENT_CATEGORY_DESCRIPTIONS[category]}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <DocumentUpload
                    fundId={fundId}
                    category={category}
                    onUploadComplete={handleDocumentAction}
                    onUploadError={error => setError(error)}
                  />

                  <DocumentHistory
                    fundId={fundId}
                    category={category}
                    onDocumentDeleted={handleDocumentAction}
                  />
                </div>
              </div>
            ))}
        </TabsContent>

        {/* 투자확인서 관리 탭 */}
        <TabsContent value="certificates" className="space-y-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-500" />
                <h3 className="text-lg font-semibold">투자확인서 관리</h3>
                <span className="text-sm text-gray-500">
                  - 조합원별 투자확인서 업로드 및 관리 (개인조합원만 해당)
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCertificateRefresh}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                새로고침
              </Button>
            </div>

            <InvestmentCertificateManager
              fundId={fundId}
              members={members}
              onRefresh={handleDocumentAction}
              refreshKey={certificateRefreshKey}
            />
          </div>
        </TabsContent>

        {/* 문서 생성 탭 */}
        <TabsContent value="document-generation" className="space-y-6">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <FileCode2 className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold">문서 자동 생성</h3>
              <span className="text-sm text-gray-500">
                - 템플릿 기반 법적 문서 생성 및 버전 관리
              </span>
            </div>

            {/* 규약 섹션 */}
            <DocumentGenerationSection
              fundId={fundId}
              fundName={fundDetails.fund.name}
              documentType="lpa"
              title="조합 규약"
              fundInfoTrigger={documentGenerationTrigger}
            />

            {/* 규약 동의서 섹션 */}
            <LpaConsentFormSection fundId={fundId} />

            {/* 조합원 명부 섹션 */}
            <MemberListSection fundId={fundId} />

            {/* 개인정보 수집·이용·제공 동의서 섹션 */}
            <PersonalInfoConsentFormSection fundId={fundId} />

            {/* 향후 추가될 섹션들 */}
            {/* <DocumentGenerationSection
              fundId={fundId}
              fundName={fundDetails.fund.name}
              documentType="plan"
              title="결성계획서"
              description="펀드 결성을 위한 계획서"
            /> */}
          </div>
        </TabsContent>

        {/* 조합원 총회 탭 */}
        <TabsContent value="assembly" className="space-y-6">
          <AssemblyManagement fundId={fundId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
