'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Send, Settings, TestTube, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

interface EmailConfig {
  enabled: boolean;
  recipients: string[];
  templates: {
    survey_submission: {
      enabled: boolean;
      subject: string;
      body: string;
    };
    user_registration: {
      enabled: boolean;
      subject: string;
      body: string;
    };
  };
}

export default function EmailSettings() {
  const [config, setConfig] = useState<EmailConfig>({
    enabled: true,
    recipients: ['admin@snusv.com'],
    templates: {
      survey_submission: {
        enabled: true,
        subject: '[SNUSV] 새로운 설문조사 제출',
        body: `안녕하세요,

새로운 설문조사가 제출되었습니다.

제출자 정보:
- 이름: {{name}}
- 이메일: {{email}}
- 전화번호: {{phone}}
- 출자좌수: {{investment_units}}좌
- 투자금액: {{investment_amount}}원

관리자 페이지에서 자세한 내용을 확인하실 수 있습니다.

감사합니다.
SNUSV ANGEL CLUB`,
      },
      user_registration: {
        enabled: true,
        subject: '[SNUSV] 새로운 회원가입',
        body: `안녕하세요,

새로운 회원이 가입했습니다.

회원 정보:
- 이름: {{name}}
- 이메일: {{email}}
- 가입일시: {{signup_date}}

관리자 페이지에서 자세한 내용을 확인하실 수 있습니다.

감사합니다.
SNUSV ANGEL CLUB`,
      },
    },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [newRecipient, setNewRecipient] = useState('');

  useEffect(() => {
    loadEmailConfig();
  }, []);

  const loadEmailConfig = async () => {
    // 실제 구현에서는 Supabase에서 이메일 설정을 불러옵니다
    // 지금은 로컬스토리지에서 불러오는 것으로 시뮬레이션
    const saved = localStorage.getItem('email_config');
    if (saved) {
      setConfig(JSON.parse(saved));
    }
  };

  const saveEmailConfig = async () => {
    setIsSaving(true);
    try {
      // 실제 구현에서는 Supabase에 저장
      localStorage.setItem('email_config', JSON.stringify(config));
      alert('이메일 설정이 저장되었습니다.');
    } catch (error) {
      console.error('이메일 설정 저장 실패:', error);
      alert('설정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const sendTestEmail = async (type: 'survey_submission' | 'user_registration') => {
    setIsTesting(true);
    try {
      // 실제 구현에서는 Supabase Edge Functions을 사용하여 이메일 발송
      const testData = {
        name: '홍길동',
        email: 'test@example.com',
        phone: '010-1234-5678',
        investment_units: 5,
        investment_amount: 5000000,
        signup_date: new Date().toLocaleString('ko-KR'),
      };

      console.log('테스트 이메일 발송:', {
        type,
        recipients: config.recipients,
        template: config.templates[type],
        data: testData,
      });

      // 시뮬레이션: 실제로는 이메일이 발송됩니다
      alert(`테스트 이메일이 ${config.recipients.join(', ')}로 발송되었습니다.`);
    } catch (error) {
      console.error('테스트 이메일 발송 실패:', error);
      alert('테스트 이메일 발송에 실패했습니다.');
    } finally {
      setIsTesting(false);
    }
  };

  const addRecipient = () => {
    if (newRecipient && !config.recipients.includes(newRecipient)) {
      setConfig(prev => ({
        ...prev,
        recipients: [...prev.recipients, newRecipient],
      }));
      setNewRecipient('');
    }
  };

  const removeRecipient = (email: string) => {
    setConfig(prev => ({
      ...prev,
      recipients: prev.recipients.filter(r => r !== email),
    }));
  };

  const updateTemplate = (
    type: 'survey_submission' | 'user_registration',
    field: 'enabled' | 'subject' | 'body',
    value: boolean | string
  ) => {
    setConfig(prev => ({
      ...prev,
      templates: {
        ...prev.templates,
        [type]: {
          ...prev.templates[type],
          [field]: value,
        },
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* 전역 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            전역 설정
          </CardTitle>
          <CardDescription>이메일 알림 시스템의 전반적인 설정을 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-enabled">이메일 알림 활성화</Label>
              <p className="text-sm text-gray-500">모든 이메일 알림을 활성화/비활성화합니다.</p>
            </div>
            <Switch
              id="email-enabled"
              checked={config.enabled}
              onCheckedChange={checked => setConfig(prev => ({ ...prev, enabled: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* 수신자 관리 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            수신자 관리
          </CardTitle>
          <CardDescription>이메일 알림을 받을 관리자 이메일 주소를 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="admin@example.com"
              value={newRecipient}
              onChange={e => setNewRecipient(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && addRecipient()}
            />
            <Button onClick={addRecipient} disabled={!newRecipient}>
              추가
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {config.recipients.map(email => (
              <Badge key={email} variant="secondary" className="flex items-center gap-1">
                {email}
                <button
                  onClick={() => removeRecipient(email)}
                  className="ml-1 text-xs hover:text-red-600"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 설문조사 제출 알림 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            설문조사 제출 알림
          </CardTitle>
          <CardDescription>
            새로운 설문조사가 제출될 때 발송되는 이메일을 설정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="survey-enabled">알림 활성화</Label>
            <Switch
              id="survey-enabled"
              checked={config.templates.survey_submission.enabled}
              onCheckedChange={checked => updateTemplate('survey_submission', 'enabled', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="survey-subject">이메일 제목</Label>
            <Input
              id="survey-subject"
              value={config.templates.survey_submission.subject}
              onChange={e => updateTemplate('survey_submission', 'subject', e.target.value)}
              disabled={!config.templates.survey_submission.enabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="survey-body">이메일 내용</Label>
            <Textarea
              id="survey-body"
              rows={8}
              value={config.templates.survey_submission.body}
              onChange={e => updateTemplate('survey_submission', 'body', e.target.value)}
              disabled={!config.templates.survey_submission.enabled}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              사용 가능한 변수: {'{'}name{'}'}, {'{'}email{'}'}, {'{'}phone{'}'}, {'{'}
              investment_units{'}'}, {'{'}investment_amount{'}'}
            </p>
          </div>

          <Button
            onClick={() => sendTestEmail('survey_submission')}
            disabled={isTesting || !config.templates.survey_submission.enabled}
            variant="outline"
          >
            <TestTube className="mr-2 h-4 w-4" />
            테스트 이메일 발송
          </Button>
        </CardContent>
      </Card>

      {/* 회원가입 알림 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            회원가입 알림
          </CardTitle>
          <CardDescription>새로운 회원이 가입할 때 발송되는 이메일을 설정합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="signup-enabled">알림 활성화</Label>
            <Switch
              id="signup-enabled"
              checked={config.templates.user_registration.enabled}
              onCheckedChange={checked => updateTemplate('user_registration', 'enabled', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-subject">이메일 제목</Label>
            <Input
              id="signup-subject"
              value={config.templates.user_registration.subject}
              onChange={e => updateTemplate('user_registration', 'subject', e.target.value)}
              disabled={!config.templates.user_registration.enabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-body">이메일 내용</Label>
            <Textarea
              id="signup-body"
              rows={8}
              value={config.templates.user_registration.body}
              onChange={e => updateTemplate('user_registration', 'body', e.target.value)}
              disabled={!config.templates.user_registration.enabled}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              사용 가능한 변수: {'{'}name{'}'}, {'{'}email{'}'}, {'{'}signup_date{'}'}
            </p>
          </div>

          <Button
            onClick={() => sendTestEmail('user_registration')}
            disabled={isTesting || !config.templates.user_registration.enabled}
            variant="outline"
          >
            <TestTube className="mr-2 h-4 w-4" />
            테스트 이메일 발송
          </Button>
        </CardContent>
      </Card>

      {/* 저장 버튼 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-end">
            <Button onClick={saveEmailConfig} disabled={isSaving} size="lg">
              {isSaving ? (
                <>
                  <Send className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
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
