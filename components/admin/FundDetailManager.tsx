'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Building2, FileText, RefreshCw, Save, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import DocumentHistory from './DocumentHistory';
import DocumentUpload from './DocumentUpload';

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
  });

  // 데이터 초기 로드
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 펀드 상세 정보와 조합원 목록을 병렬로 조회
        const [fundResponse, membersResponse] = await Promise.all([
          fetch(`/api/funds/${fundId}/details`),
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

        // 폼 데이터 초기화
        setFormData({
          name: fundData.fund.name || '',
          abbreviation: fundData.fund.abbreviation || '',
          tax_number: fundData.fund.tax_number || '',
          gp_id: fundData.fund.gp_id || [],
          address: fundData.fund.address || '',
          status: fundData.fund.status || 'ready',
          account: fundData.fund.account || '',
          account_bank: fundData.fund.account_bank || '',
          closed_at: fundData.fund.closed_at || '',
          registered_at: fundData.fund.registered_at || '',
          dissolved_at: fundData.fund.dissolved_at || '',
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
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/admin/funds/${fundId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '펀드 정보 저장에 실패했습니다');
      }

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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="info" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            기본 정보
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            문서 관리
          </TabsTrigger>
        </TabsList>

        {/* 기본 정보 탭 */}
        <TabsContent value="info" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>펀드 기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <div className="space-y-2">
                  <Label htmlFor="closed_at">결성일</Label>
                  <Input
                    id="closed_at"
                    type="date"
                    value={
                      formData.closed_at ? formData.closed_at.split('T')[0] : ''
                    }
                    onChange={e => {
                      const value = e.target.value
                        ? `${e.target.value}T00:00:00.000Z`
                        : '';
                      handleInputChange('closed_at', value);
                    }}
                    placeholder="펀드 결성일을 선택하세요"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registered_at">등록일</Label>
                  <Input
                    id="registered_at"
                    type="date"
                    value={
                      formData.registered_at
                        ? formData.registered_at.split('T')[0]
                        : ''
                    }
                    onChange={e => {
                      const value = e.target.value
                        ? `${e.target.value}T00:00:00.000Z`
                        : '';
                      handleInputChange('registered_at', value);
                    }}
                    placeholder="펀드 등록일을 선택하세요"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dissolved_at">만기일</Label>
                  <Input
                    id="dissolved_at"
                    type="date"
                    value={
                      formData.dissolved_at
                        ? formData.dissolved_at.split('T')[0]
                        : ''
                    }
                    onChange={e => {
                      const value = e.target.value
                        ? `${e.target.value}T00:00:00.000Z`
                        : '';
                      handleInputChange('dissolved_at', value);
                    }}
                    placeholder="펀드 만기일을 선택하세요"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>업무집행조합원 (GP)</Label>
                <div className="text-sm text-gray-500 mb-2">
                  현재 {members.length}명의 조합원이 있습니다.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {members.map(member => (
                    <div
                      key={member.id}
                      className={`
                        p-3 rounded-lg border cursor-pointer transition-colors
                        ${
                          formData.gp_id.includes(member.id)
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                      onClick={() => {
                        const newGpIds = formData.gp_id.includes(member.id)
                          ? formData.gp_id.filter(id => id !== member.id)
                          : [...formData.gp_id, member.id];
                        handleInputChange('gp_id', newGpIds);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{member.name}</span>
                        {member.role === 'ADMIN' && (
                          <Badge variant="outline" className="text-xs">
                            관리자
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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
          {Object.values(DocumentCategory).map(category => (
            <div key={category} className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-500" />
                <h3 className="text-lg font-semibold">
                  {DOCUMENT_CATEGORY_NAMES[category]}
                </h3>
                <span className="text-sm text-gray-500">
                  - {DOCUMENT_CATEGORY_DESCRIPTIONS[category]}
                </span>
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
      </Tabs>
    </div>
  );
}
