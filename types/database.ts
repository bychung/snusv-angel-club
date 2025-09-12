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
  created_at: string;
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

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'> & { updated_at?: string };
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string;
        };
      };
      funds: {
        Row: Fund;
        Insert: Omit<Fund, 'id' | 'created_at'>;
        Update: Partial<Omit<Fund, 'id' | 'created_at'>>;
      };
      fund_members: {
        Row: FundMember;
        Insert: Omit<FundMember, 'id' | 'total_amount' | 'created_at' | 'updated_at'> & {
          updated_at?: string;
        };
        Update: Partial<Omit<FundMember, 'id' | 'total_amount' | 'created_at'>> & {
          updated_at?: string;
        };
      };
    };
  };
}
