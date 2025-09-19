export interface Profile {
  id: string;
  user_id?: string | null;
  name: string;
  phone: string;
  email: string;
  entity_type: 'individual' | 'corporate';
  birth_date?: string | null;
  business_number?: string | null;
  address: string;
  role: 'ADMIN' | 'USER';
  created_at: string;
  updated_at: string;
}

export interface Fund {
  id: string;
  name: string;
  abbreviation?: string | null;
  tax_number?: string | null;
  gp_id?: string[] | null;
  address?: string | null;
  status: 'ready' | 'processing' | 'applied' | 'active' | 'closing' | 'closed';
  account?: string | null;
  account_bank?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FundMember {
  id: string;
  fund_id: string;
  profile_id: string;
  investment_units: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  fund_id: string;
  category: 'agreement' | 'tax' | 'account';
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  uploaded_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfilePermission {
  id: string;
  profile_id: string;
  user_id: string;
  permission_type: 'admin' | 'view';
  granted_by: string;
  granted_at: string;
  created_at: string;
}

export interface AccessibleProfile {
  profile: Profile;
  permission: 'owner' | 'admin' | 'view';
  grantedBy?: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'> & {
          updated_at?: string;
        };
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string;
        };
      };
      funds: {
        Row: Fund;
        Insert: Omit<Fund, 'id' | 'created_at' | 'updated_at'> & {
          updated_at?: string;
        };
        Update: Partial<Omit<Fund, 'id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string;
        };
      };
      fund_members: {
        Row: FundMember;
        Insert: Omit<
          FundMember,
          'id' | 'total_amount' | 'created_at' | 'updated_at'
        > & {
          updated_at?: string;
        };
        Update: Partial<
          Omit<FundMember, 'id' | 'total_amount' | 'created_at'>
        > & {
          updated_at?: string;
        };
      };
      profile_permissions: {
        Row: ProfilePermission;
        Insert: Omit<ProfilePermission, 'id' | 'granted_at' | 'created_at'>;
        Update: Partial<
          Omit<ProfilePermission, 'id' | 'granted_at' | 'created_at'>
        >;
      };
      documents: {
        Row: Document;
        Insert: Omit<Document, 'id' | 'created_at' | 'updated_at'> & {
          updated_at?: string;
        };
        Update: Partial<Omit<Document, 'id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string;
        };
      };
    };
  };
}
