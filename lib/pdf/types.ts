// PDF 생성 관련 타입 정의

export interface TemplateSection {
  index: number;
  title: string;
  text: string;
  type?: string;
  sub: TemplateSection[];
  tableConfig?: TableConfig;
}

export interface TableConfig {
  tableType: string;
  headers: Array<{
    label: string;
    property: string;
    width: number;
    align: 'left' | 'center' | 'right';
    headerAlign?: 'left' | 'center' | 'right';
  }>;
}

export interface LPATemplate {
  type: string;
  version: string;
  description: string;
  content: {
    type: string;
    sections: TemplateSection[];
  };
}

export interface LPAContext {
  fund: {
    id: string;
    name: string;
    address: string | null;
    total_cap: number;
    initial_cap: number;
    payment_schedule: 'lump_sum' | 'capital_call';
    duration: number;
  };
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  members: Array<{
    id: string;
    name: string;
    member_type: 'GP' | 'LP';
    total_units: number;
    total_amount: number;
    initial_amount: number;
  }>;
  generatedAt: Date;
}

export interface ProcessedLPAContent {
  type: string;
  sections: TemplateSection[];
  processedAt: Date;
}
