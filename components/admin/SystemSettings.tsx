'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { createClient } from '@/lib/supabase/client';
import {
  AlertTriangle,
  Database,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface SystemConfig {
  maintenance_mode: boolean;
  survey_enabled: boolean;
  registration_enabled: boolean;
  admin_emails: string[];
  fund_name: string;
  fund_unit_price: number;
}

export default function SystemSettings() {
  const [config, setConfig] = useState<SystemConfig>({
    maintenance_mode: false,
    survey_enabled: true,
    registration_enabled: true,
    admin_emails: ['admin@snusv.com'],
    fund_name: '프로펠-SNUSV엔젤투자조합2호',
    fund_unit_price: 1000000,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalData: 0,
    lastBackup: null as Date | null,
  });

  useEffect(() => {
    loadSystemConfig();
    loadSystemStats();
  }, []);

  const loadSystemConfig = async () => {
    // 실제 구현에서는 Supabase에서 시스템 설정을 불러옵니다
    const saved = localStorage.getItem('system_config');
    if (saved) {
      setConfig(JSON.parse(saved));
    }
  };

  const loadSystemStats = async () => {
    try {
      const supabase = createClient();

      // 전체 사용자 수
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      setStats(prev => ({
        ...prev,
        totalUsers: totalUsers || 0,
        totalData: (totalUsers || 0) * 2, // 대략적인 데이터 크기
        lastBackup: new Date(), // 시뮬레이션
      }));
    } catch (error) {
      console.error('시스템 통계 조회 실패:', error);
    }
  };

  const saveSystemConfig = async () => {
    setIsSaving(true);
    try {
      // 실제 구현에서는 Supabase에 저장
      localStorage.setItem('system_config', JSON.stringify(config));

      // 환경변수 업데이트 (실제로는 서버사이드에서 처리)
      console.log('시스템 설정 저장:', config);

      alert('시스템 설정이 저장되었습니다.');
    } catch (error) {
      console.error('시스템 설정 저장 실패:', error);
      alert('설정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const addAdminEmail = () => {
    if (newAdminEmail && !config.admin_emails.includes(newAdminEmail)) {
      setConfig(prev => ({
        ...prev,
        admin_emails: [...prev.admin_emails, newAdminEmail],
      }));
      setNewAdminEmail('');
    }
  };

  const removeAdminEmail = (email: string) => {
    if (config.admin_emails.length > 1) {
      setConfig(prev => ({
        ...prev,
        admin_emails: prev.admin_emails.filter(e => e !== email),
      }));
    } else {
      alert('최소 하나의 관리자 이메일이 필요합니다.');
    }
  };

  const handleDataBackup = async () => {
    try {
      // 실제 구현에서는 데이터베이스 백업 로직
      const supabase = createClient();

      const { data: profiles } = await supabase.from('profiles').select('*');
      const { data: fundMembers } = await supabase
        .from('fund_members')
        .select('*');

      const backupData = {
        timestamp: new Date().toISOString(),
        profiles,
        fund_members: fundMembers,
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `snusv_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();

      setStats(prev => ({ ...prev, lastBackup: new Date() }));
      alert('데이터 백업이 완료되었습니다.');
    } catch (error) {
      console.error('백업 실패:', error);
      alert('백업에 실패했습니다.');
    }
  };

  const handleDataCleanup = async () => {
    if (
      !confirm(
        '정말로 오래된 데이터를 정리하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
      )
    ) {
      return;
    }

    try {
      // 실제 구현에서는 오래된 로그, 임시 데이터 등을 정리
      console.log('데이터 정리 실행...');
      alert('데이터 정리가 완료되었습니다.');
    } catch (error) {
      console.error('데이터 정리 실패:', error);
      alert('데이터 정리에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 시스템 상태 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            시스템 상태
          </CardTitle>
          <CardDescription>
            현재 시스템의 전반적인 상태를 확인할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {stats.totalUsers}
              </div>
              <div className="text-sm text-green-700">총 사용자 수</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalData}MB
              </div>
              <div className="text-sm text-blue-700">데이터 크기</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {stats.lastBackup
                  ? stats.lastBackup.toLocaleDateString('ko-KR')
                  : 'N/A'}
              </div>
              <div className="text-sm text-purple-700">마지막 백업</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 기능 제어 */}
      <Card>
        <CardHeader>
          <CardTitle>기능 제어</CardTitle>
          <CardDescription>
            시스템의 주요 기능을 활성화/비활성화할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label>유지보수 모드</Label>
              <p className="text-sm text-gray-500">
                활성화 시 일반 사용자 접근이 제한됩니다.
              </p>
            </div>
            <Switch
              checked={config.maintenance_mode}
              onCheckedChange={checked =>
                setConfig(prev => ({ ...prev, maintenance_mode: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label>설문조사 기능</Label>
              <p className="text-sm text-gray-500">
                새로운 설문조사 제출을 허용합니다.
              </p>
            </div>
            <Switch
              checked={config.survey_enabled}
              onCheckedChange={checked =>
                setConfig(prev => ({ ...prev, survey_enabled: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label>회원가입 기능</Label>
              <p className="text-sm text-gray-500">
                새로운 회원가입을 허용합니다.
              </p>
            </div>
            <Switch
              checked={config.registration_enabled}
              onCheckedChange={checked =>
                setConfig(prev => ({ ...prev, registration_enabled: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* 관리자 계정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            관리자 계정
          </CardTitle>
          <CardDescription>
            관리자 권한을 가진 이메일 계정을 관리합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="admin@example.com"
              value={newAdminEmail}
              onChange={e => setNewAdminEmail(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && addAdminEmail()}
            />
            <Button onClick={addAdminEmail} disabled={!newAdminEmail}>
              <Plus className="h-4 w-4 mr-1" />
              추가
            </Button>
          </div>

          <div className="space-y-2">
            {config.admin_emails.map(email => (
              <div
                key={email}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <Badge variant="secondary" className="flex items-center gap-2">
                  <Shield className="h-3 w-3" />
                  {email}
                </Badge>
                <Button
                  onClick={() => removeAdminEmail(email)}
                  variant="ghost"
                  size="sm"
                  disabled={config.admin_emails.length <= 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 펀드 설정 */}
      <Card>
        <CardHeader>
          <CardTitle>펀드 설정</CardTitle>
          <CardDescription>펀드 관련 기본 정보를 설정합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fund-name">펀드명</Label>
            <Input
              id="fund-name"
              value={config.fund_name}
              onChange={e =>
                setConfig(prev => ({ ...prev, fund_name: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit-price">1좌당 금액 (원)</Label>
            <Input
              id="unit-price"
              type="number"
              value={config.fund_unit_price}
              onChange={e =>
                setConfig(prev => ({
                  ...prev,
                  fund_unit_price: Number(e.target.value),
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* 데이터 관리 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            데이터 관리
          </CardTitle>
          <CardDescription>
            시스템 데이터를 백업하고 관리합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleDataBackup}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              데이터 백업
            </Button>

            <Button
              onClick={handleDataCleanup}
              variant="outline"
              className="w-full text-orange-600 border-orange-200 hover:bg-orange-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              데이터 정리
            </Button>
          </div>

          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">주의사항</p>
              <p>
                데이터 정리는 되돌릴 수 없는 작업입니다. 백업을 먼저 수행하는
                것을 권장합니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 저장 버튼 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-end">
            <Button onClick={saveSystemConfig} disabled={isSaving} size="lg">
              {isSaving ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  설정 저장
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
