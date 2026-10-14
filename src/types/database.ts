// เขียนมือให้ตรงกับ supabase/migrations/0001_init.sql
// เมื่อสร้างโปรเจกต์ Supabase แล้ว ให้ generate ทับด้วย:
//   npx supabase gen types typescript --project-id <project-id> > src/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Role = 'admin' | 'staff' | 'viewer';
export type Recurrence = 'none' | 'yearly';
export type ContractStatus = 'active' | 'renewed' | 'closed';
export type LogStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export type Database = {
  __InternalSupabase: { PostgrestVersion: '13' };
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string; role: Role; line_user_id: string | null; created_at: string };
        Insert: { id: string; full_name?: string; role?: Role; line_user_id?: string | null; created_at?: string };
        Update: { id?: string; full_name?: string; role?: Role; line_user_id?: string | null; created_at?: string };
        Relationships: [];
      };
      line_link_codes: {
        Row: { user_id: string; code: string; expires_at: string };
        Insert: { user_id: string; code: string; expires_at: string };
        Update: { user_id?: string; code?: string; expires_at?: string };
        Relationships: [
          { foreignKeyName: 'line_link_codes_user_id_fkey'; columns: ['user_id']; isOneToOne: true; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ];
      };
      contracts: {
        Row: {
          id: string; project_name: string; contract_no: string | null; client_name: string | null;
          start_date: string | null; end_date: string; recurrence: Recurrence; reminder_offsets: number[];
          value: number | null; status: ContractStatus; note: string | null; file_path: string | null;
          created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; project_name: string; contract_no?: string | null; client_name?: string | null;
          start_date?: string | null; end_date: string; recurrence?: Recurrence; reminder_offsets?: number[];
          value?: number | null; status?: ContractStatus; note?: string | null; file_path?: string | null;
          created_by?: string | null; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['contracts']['Insert']>;
        Relationships: [
          { foreignKeyName: 'contracts_created_by_fkey'; columns: ['created_by']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ];
      };
      contract_recipients: {
        Row: { contract_id: string; user_id: string };
        Insert: { contract_id: string; user_id: string };
        Update: { contract_id?: string; user_id?: string };
        Relationships: [
          { foreignKeyName: 'contract_recipients_contract_id_fkey'; columns: ['contract_id']; isOneToOne: false; referencedRelation: 'contracts'; referencedColumns: ['id'] },
          { foreignKeyName: 'contract_recipients_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ];
      };
      notification_logs: {
        Row: {
          id: number; contract_id: string; user_id: string; due_date: string; offset_days: number;
          channel: string; status: LogStatus; error: string | null; created_at: string; sent_at: string | null;
        };
        Insert: {
          id?: never; contract_id: string; user_id: string; due_date: string; offset_days: number;
          channel?: string; status: LogStatus; error?: string | null; created_at?: string; sent_at?: string | null;
        };
        Update: {
          id?: never; contract_id?: string; user_id?: string; due_date?: string; offset_days?: number;
          channel?: string; status?: LogStatus; error?: string | null; created_at?: string; sent_at?: string | null;
        };
        Relationships: [
          { foreignKeyName: 'notification_logs_contract_id_fkey'; columns: ['contract_id']; isOneToOne: false; referencedRelation: 'contracts'; referencedColumns: ['id'] },
          { foreignKeyName: 'notification_logs_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ];
      };
      cron_runs: {
        Row: {
          id: number; run_date: string; started_at: string; finished_at: string | null;
          ok: boolean | null; stats: Json | null; error: string | null;
        };
        Insert: {
          id?: never; run_date: string; started_at?: string; finished_at?: string | null;
          ok?: boolean | null; stats?: Json | null; error?: string | null;
        };
        Update: {
          id?: never; run_date?: string; started_at?: string; finished_at?: string | null;
          ok?: boolean | null; stats?: Json | null; error?: string | null;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      my_role: { Args: never; Returns: string };
      save_contract: {
        Args: { p_id: string | null; p_data: Json; p_recipients: string[] };
        Returns: string;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
