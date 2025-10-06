'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import ActiveTemplateInfo from './ActiveTemplateInfo';
import DocumentGenerationActions from './DocumentGenerationActions';
import GeneratedDocumentsList from './GeneratedDocumentsList';
import TemplateVersionHistory from './TemplateVersionHistory';

interface DocumentGenerationSectionProps {
  fundId: string;
  fundName: string;
  documentType: string;
  title: string;
  description: string;
}

export default function DocumentGenerationSection({
  fundId,
  fundName,
  documentType,
  title,
  description,
}: DocumentGenerationSectionProps) {
  const [templateRefreshTrigger, setTemplateRefreshTrigger] = useState(0);
  const [documentsRefreshTrigger, setDocumentsRefreshTrigger] = useState(0);

  const handleTemplateActivated = () => {
    // 활성 템플릿 정보 새로고침
    setTemplateRefreshTrigger(prev => prev + 1);
  };

  const handleDocumentGenerated = () => {
    // 생성된 문서 목록 새로고침
    setDocumentsRefreshTrigger(prev => prev + 1);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>
          <Badge variant="outline" className="text-sm">
            {documentType.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 1. 현재 활성 템플릿 정보 */}
        <ActiveTemplateInfo
          documentType={documentType}
          refreshTrigger={templateRefreshTrigger}
        />

        {/* 2. 문서 생성 액션 */}
        <DocumentGenerationActions
          fundId={fundId}
          fundName={fundName}
          documentType={documentType}
          onDocumentGenerated={handleDocumentGenerated}
        />

        {/* 3. 생성된 문서 목록 */}
        <GeneratedDocumentsList
          fundId={fundId}
          fundName={fundName}
          documentType={documentType}
          refreshTrigger={documentsRefreshTrigger}
        />

        {/* 4. 템플릿 버전 히스토리 (접기/펼치기) */}
        <TemplateVersionHistory
          documentType={documentType}
          onTemplateActivated={handleTemplateActivated}
        />
      </CardContent>
    </Card>
  );
}
