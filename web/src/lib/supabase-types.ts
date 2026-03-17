/**
 * Database types cho Supabase — generated manually từ migration.sql
 * TODO: Dùng `supabase gen types typescript` khi có Supabase CLI
 */

export interface Database {
  public: {
    Tables: {
      hm50: {
        Row: {
          id: string;
          hm_number: number;
          ten: string;
          dau_moi: string | null;
          tinh_trang: "hoan_thanh" | "dang_lam" | "chua_bat_dau" | "nghen";
          muc_tieu: string | null;
          thoi_han: string | null;
          bsc_perspective: "tai_chinh" | "khach_hang" | "quy_trinh" | "hoc_hoi" | null;
          phan_cl: string | null;
          notion_page_id: string | null;
          directive_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["hm50"]["Row"]> & {
          hm_number: number;
          ten: string;
        };
        Update: Partial<Database["public"]["Tables"]["hm50"]["Row"]>;
      };
      staff: {
        Row: {
          id: string;
          staff_code: string | null;
          name: string;
          email: string | null;
          department: string | null;
          zone: number | null;
          title: string | null;
          company: string | null;
          location: string | null;
          is_manager: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["staff"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["staff"]["Row"]>;
      };
      directives: {
        Row: {
          id: string;
          directive_code: string;
          notion_page_id: string | null;
          t1_dau_moi: string;
          t1_email: string | null;
          t2_nhiem_vu: string;
          t3_chi_tieu: string | null;
          t4_thoi_han: string | null;
          t5_thanh_vien: string[] | null;
          loai: "tu_50hm" | "leo_thang" | "bo_sung" | "moi" | null;
          hm50_id: string | null;
          meeting_source: string | null;
          lls_step: number;
          tinh_trang: string;
          bod_hosting_email: string | null;
          approved_by: string | null;
          approved_at: string | null;
          confirmed_by: string | null;
          confirmed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["directives"]["Row"]> & {
          directive_code: string;
          t1_dau_moi: string;
          t2_nhiem_vu: string;
        };
        Update: Partial<Database["public"]["Tables"]["directives"]["Row"]>;
      };
      lls_step_history: {
        Row: {
          id: string;
          directive_id: string;
          step_number: number;
          step_name: string;
          action: string;
          actor: string | null;
          detail: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["lls_step_history"]["Row"]> & {
          directive_id: string;
          step_number: number;
          step_name: string;
          action: string;
        };
        Update: Partial<Database["public"]["Tables"]["lls_step_history"]["Row"]>;
      };
      engagement_events: {
        Row: {
          id: string;
          directive_id: string | null;
          event_type: "email_sent" | "email_opened" | "link_clicked" | "confirmed" | "escalated";
          recipient_email: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["engagement_events"]["Row"]> & {
          event_type: "email_sent" | "email_opened" | "link_clicked" | "confirmed" | "escalated";
        };
        Update: Partial<Database["public"]["Tables"]["engagement_events"]["Row"]>;
      };
    };
  };
}
