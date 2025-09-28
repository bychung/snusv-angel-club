// Inquiry types for startup IR and angel club membership inquiries

export interface StartupInquiry {
  id: string;
  company_name: string;
  contact_person: string;
  contact_email: string;
  position: string;
  company_description: string;
  ir_deck_url?: string | null;
  ir_deck_filename?: string | null; // 원본 피치덱 파일명
  brand: string;
  created_at: string;
  updated_at: string;
}

export interface AngelInquiry {
  id: string;
  name: string;
  self_introduction: string;
  email: string;
  brand: string;
  created_at: string;
  updated_at: string;
}

export interface SignupInquiry {
  id: string;
  user_id?: string | null;
  attempted_email: string;
  searched_email?: string | null;
  provider?: string | null;
  inquiry_message?: string | null;
  status: 'pending' | 'processed' | 'resolved';
  admin_notes?: string | null;
  brand: string;
  created_at: string;
  updated_at: string;
}

// 입력용 타입들
export interface StartupInquiryInput {
  company_name: string;
  contact_person: string;
  contact_email: string;
  position: string;
  company_description: string;
  ir_deck_url?: string;
  ir_deck_filename?: string;
}

export interface AngelInquiryInput {
  name: string;
  self_introduction: string;
  email: string;
}

export interface SignupInquiryInput {
  user_id?: string;
  attempted_email: string;
  searched_email?: string;
  provider?: string;
  inquiry_message?: string;
  status?: 'pending' | 'processed' | 'resolved';
  admin_notes?: string;
}
